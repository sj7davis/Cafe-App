// Server-side cart pricing. The browser only says WHAT it wants (item ids,
// option names, codes); every price, discount and surcharge is worked out here
// from the database. Checkout used to charge whatever unit prices and discount
// the client sent, so anyone with dev tools could set their own total.

import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import {
  venues, menuItems, menuItemModifiers, bundles, inventory, discountCodes,
  giftCards, loyaltyAccounts, subscriptionPasses,
} from "@db/schema";
import type { getDb } from "../queries/connection";
import { localDateTime, publicHolidayName, timezoneForState } from "./au-holidays";

type Db = ReturnType<typeof getDb>;
type Venue = typeof venues.$inferSelect;

export interface CartLineInput {
  menuItemId?: number;
  bundleId?: number;
  quantity: number;
  modifiers?: { group: string; option: string }[];
}

export interface PricingInput {
  items: CartLineInput[];
  tipAmount?: number;       // dollars, chosen by the customer
  discountCode?: string;
  giftCardCode?: string;
  loyaltyPhone?: string;
  loyaltyPointsRedeemed?: number;
  passId?: number;
  customerPhone?: string;
}

export interface PricedLine {
  /** Real menu item id (bundles map to their first item, for the FK). */
  menuItemId: number;
  name: string;
  /** Kitchen note: chosen options or bundle contents. */
  note: string | null;
  quantity: number;
  unitCents: number;
  category: string;
}

export interface Quote {
  lines: PricedLine[];
  subtotalCents: number;
  pass: { id: number; cents: number } | null;
  promo: { kind: "code" | "happy_hour"; label: string; cents: number; code?: string } | null;
  giftCard: { id: number; code: string; cents: number } | null;
  loyalty: { phone: string; points: number; cents: number } | null;
  /** pass + promo + gift card + loyalty — never more than the subtotal. */
  discountCents: number;
  surcharge: { label: string; percent: number; cents: number } | null;
  tipCents: number;
  totalCents: number;
}

const POINTS_PER_DOLLAR = 10; // 10 loyalty points = $1 off (matches the customer site)
const toCents = (v: string | number | null | undefined) => Math.round(Number(v ?? 0) * 100);
const bad = (message: string) => new TRPCError({ code: "BAD_REQUEST", message });

/**
 * Discount stacking, in the order the customer site has always shown it:
 * pass credit (one free coffee) → promo code or happy hour (whichever the
 * customer has) → gift card → loyalty points. Each step is capped by what is
 * left, so the discount can never exceed the subtotal. Pure, for testing.
 */
export function stackDiscounts(args: {
  lines: PricedLine[];
  pass: { id: number } | null;
  promo: { kind: "code" | "happy_hour"; label: string; code?: string; percent?: number; fixedCents?: number } | null;
  giftCard: { id: number; code: string; balanceCents: number } | null;
  loyalty: { phone: string; points: number; availablePoints: number } | null;
  surchargePercent: number | null;
  surchargeLabel?: string;
  tipCents: number;
}): Quote {
  const subtotalCents = args.lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  let remaining = subtotalCents;

  let pass: Quote["pass"] = null;
  if (args.pass) {
    const coffee = args.lines.filter(l => l.category === "coffee").sort((a, b) => b.unitCents - a.unitCents)[0];
    if (coffee) {
      pass = { id: args.pass.id, cents: Math.min(coffee.unitCents, remaining) };
      remaining -= pass.cents;
    }
  }

  let promo: Quote["promo"] = null;
  if (args.promo) {
    const raw = args.promo.percent !== undefined
      ? Math.round(remaining * args.promo.percent / 100)
      : (args.promo.fixedCents ?? 0);
    const cents = Math.min(raw, remaining);
    if (cents > 0) {
      promo = { kind: args.promo.kind, label: args.promo.label, cents, code: args.promo.code };
      remaining -= cents;
    }
  }

  let giftCard: Quote["giftCard"] = null;
  if (args.giftCard && remaining > 0) {
    const cents = Math.min(args.giftCard.balanceCents, remaining);
    if (cents > 0) {
      giftCard = { id: args.giftCard.id, code: args.giftCard.code, cents };
      remaining -= cents;
    }
  }

  let loyalty: Quote["loyalty"] = null;
  if (args.loyalty && remaining > 0) {
    // Only spend whole points that the account actually has, and no more than
    // the remaining total is worth.
    const maxPoints = Math.min(args.loyalty.points, args.loyalty.availablePoints, Math.floor(remaining * POINTS_PER_DOLLAR / 100));
    if (maxPoints > 0) {
      const cents = Math.min(Math.floor(maxPoints * 100 / POINTS_PER_DOLLAR), remaining);
      loyalty = { phone: args.loyalty.phone, points: maxPoints, cents };
      remaining -= cents;
    }
  }

  // Public-holiday surcharge applies to the menu subtotal, as before.
  const surcharge = args.surchargePercent
    ? {
        label: args.surchargeLabel ?? "Public holiday surcharge",
        percent: args.surchargePercent,
        cents: Math.round(subtotalCents * args.surchargePercent / 100),
      }
    : null;

  const discountCents = subtotalCents - remaining;
  return {
    lines: args.lines,
    subtotalCents,
    pass, promo, giftCard, loyalty,
    discountCents,
    surcharge,
    tipCents: args.tipCents,
    totalCents: remaining + (surcharge?.cents ?? 0) + args.tipCents,
  };
}

/** Load the venue's catalogue and price the cart. Throws BAD_REQUEST with a
 *  customer-readable message when something in the cart can't be sold. */
export async function priceCart(db: Db, venue: Venue, input: PricingInput, now = new Date()): Promise<Quote> {
  if (input.items.length === 0) throw bad("Your cart is empty");
  if (input.items.length > 50) throw bad("Too many items in one order");
  const settings = (venue.settingsJson ?? {}) as Record<string, any>;
  const tz = timezoneForState(settings.state);
  const local = localDateTime(now, tz);

  // ── Menu items ───────────────────────────────────────────────────────────
  const itemIds = [...new Set(input.items.flatMap(i => (i.menuItemId ? [i.menuItemId] : [])))];
  const bundleIds = [...new Set(input.items.flatMap(i => (i.bundleId ? [i.bundleId] : [])))];

  const bundleRows = bundleIds.length
    ? await db.select().from(bundles).where(and(eq(bundles.venueId, venue.id), inArray(bundles.id, bundleIds)))
    : [];

  const itemRows = await db.select().from(menuItems).where(eq(menuItems.venueId, venue.id));
  const byId = new Map(itemRows.map(m => [m.id, m]));
  const bySlug = new Map(itemRows.map(m => [m.slug, m]));

  const soldOut = new Set(
    (await db.select({ menuItemId: inventory.menuItemId, isAvailable: inventory.isAvailable })
      .from(inventory).where(eq(inventory.venueId, venue.id)))
      .filter(r => r.isAvailable === false).map(r => r.menuItemId),
  );

  const modifierRows = itemIds.length
    ? await db.select().from(menuItemModifiers)
      .where(and(eq(menuItemModifiers.venueId, venue.id), inArray(menuItemModifiers.menuItemId, itemIds)))
    : [];

  const assertSellable = (m: typeof itemRows[number]) => {
    if (soldOut.has(m.id)) throw bad(`${m.name} is sold out`);
    if (m.activeFrom && m.activeFrom > now) throw bad(`${m.name} isn't available yet`);
    if (m.activeTo && m.activeTo < now) throw bad(`${m.name} is no longer available`);
  };

  const lines: PricedLine[] = [];
  for (const line of input.items) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw bad("Invalid quantity");

    if (line.bundleId) {
      const bundle = bundleRows.find(b => b.id === line.bundleId);
      if (!bundle || bundle.isActive === false) throw bad("That bundle is no longer available");
      const contents = bundle.itemSlugs.split(",").map(s => bySlug.get(s.trim())).filter(m => m !== undefined);
      if (contents.length === 0) throw bad(`${bundle.name} is no longer available`);
      contents.forEach(assertSellable);
      lines.push({
        menuItemId: contents[0].id,
        name: bundle.name,
        note: `Bundle: ${contents.map(m => m.name).join(" + ")}`,
        quantity: line.quantity,
        unitCents: toCents(bundle.bundlePrice),
        category: "bundle",
      });
      continue;
    }

    const item = line.menuItemId ? byId.get(line.menuItemId) : undefined;
    if (!item) throw bad("An item in your cart is no longer on the menu");
    assertSellable(item);

    // Options are matched by name against the venue's own modifier groups;
    // the price adjustment always comes from the database.
    const groups = modifierRows.filter(g => g.menuItemId === item.id);
    const chosen = line.modifiers ?? [];
    let adjCents = 0;
    const picked: string[] = [];
    for (const sel of chosen) {
      const group = groups.find(g => g.name === sel.group);
      const option = group?.options.find(o => o.name === sel.option);
      if (!group || !option) throw bad(`"${sel.option}" isn't available for ${item.name} any more`);
      adjCents += toCents(option.priceAdj);
      picked.push(option.name);
    }
    for (const g of groups) {
      if (g.required && !chosen.some(c => c.group === g.name)) throw bad(`Please choose ${g.name} for ${item.name}`);
    }
    lines.push({
      menuItemId: item.id,
      name: picked.length ? `${item.name} (${picked.join(", ")})` : item.name,
      note: picked.length ? chosen.map(c => `${c.group}: ${c.option}`).join(" | ") : null,
      quantity: line.quantity,
      unitCents: Math.max(0, toCents(item.price) + adjCents),
      category: item.category,
    });
  }

  // ── Pass credit: must belong to this customer at this venue ─────────────
  let pass: { id: number } | null = null;
  if (input.passId) {
    const [p] = await db.select().from(subscriptionPasses).where(and(
      eq(subscriptionPasses.id, input.passId), eq(subscriptionPasses.venueId, venue.id), eq(subscriptionPasses.isActive, true),
    )).limit(1);
    if (!p || p.remainingCredits <= 0 || !input.customerPhone || p.phone !== input.customerPhone) {
      throw bad("That pass can't be used for this order");
    }
    pass = { id: p.id };
  }

  // ── Promo: a valid code beats happy hour (the site shows one or the other) ─
  let promo: Parameters<typeof stackDiscounts>[0]["promo"] = null;
  const subtotalCents = lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  if (input.discountCode?.trim()) {
    const code = input.discountCode.trim().toUpperCase();
    const [dc] = await db.select().from(discountCodes).where(and(
      eq(discountCodes.venueId, venue.id), eq(discountCodes.code, code), eq(discountCodes.isActive, true),
    )).limit(1);
    if (!dc) throw bad("Discount code not found or inactive");
    if (dc.expiresAt && dc.expiresAt < now) throw bad("This discount code has expired");
    if (dc.maxUses !== null && dc.usedCount >= dc.maxUses) throw bad("This discount code has reached its usage limit");
    if (dc.minOrderAmount && subtotalCents < toCents(dc.minOrderAmount)) {
      throw bad(`Minimum order of $${Number(dc.minOrderAmount).toFixed(2)} required`);
    }
    promo = dc.type === "percentage"
      ? { kind: "code", code, label: `${Number(dc.value)}% off`, percent: Number(dc.value) }
      : { kind: "code", code, label: `$${Number(dc.value).toFixed(2)} off`, fixedCents: toCents(dc.value) };
  } else {
    const hh = settings.happyHour as { startTime?: string; endTime?: string; discountPercent?: number; label?: string } | undefined;
    if (hh?.startTime && hh.endTime && hh.discountPercent) {
      const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
      if (local.minutes >= toMin(hh.startTime) && local.minutes < toMin(hh.endTime)) {
        promo = { kind: "happy_hour", label: hh.label || "Happy Hour", percent: Number(hh.discountPercent) };
      }
    }
  }

  // ── Gift card: checked here, only deducted once payment succeeds ─────────
  let giftCard: Parameters<typeof stackDiscounts>[0]["giftCard"] = null;
  if (input.giftCardCode?.trim()) {
    const code = input.giftCardCode.trim().toUpperCase();
    const [card] = await db.select().from(giftCards)
      .where(and(eq(giftCards.venueId, venue.id), eq(giftCards.code, code))).limit(1);
    if (!card || toCents(card.balance) <= 0) throw bad("Gift card not found or has no balance");
    giftCard = { id: card.id, code, balanceCents: toCents(card.balance) };
  }

  // ── Loyalty points: spend only what the account holds ────────────────────
  let loyalty: Parameters<typeof stackDiscounts>[0]["loyalty"] = null;
  if (input.loyaltyPhone && (input.loyaltyPointsRedeemed ?? 0) > 0) {
    const [acc] = await db.select().from(loyaltyAccounts)
      .where(and(eq(loyaltyAccounts.venueId, venue.id), eq(loyaltyAccounts.phone, input.loyaltyPhone))).limit(1);
    if (!acc || acc.pointsBalance < input.loyaltyPointsRedeemed!) throw bad("Not enough loyalty points");
    loyalty = { phone: input.loyaltyPhone, points: input.loyaltyPointsRedeemed!, availablePoints: acc.pointsBalance };
  }

  // ── Public-holiday surcharge, by the venue's own calendar ────────────────
  const holiday = publicHolidayName(local.date, settings.state);
  const surchargePercent = holiday ? Number(settings.publicHolidaySurcharge ?? 10) || null : null;

  // Tips are the customer's choice, but cap them so a typo can't charge $5,000.
  const tipCents = Math.max(0, Math.min(Math.round((input.tipAmount ?? 0) * 100), Math.max(subtotalCents, 10_000)));

  return stackDiscounts({
    lines, pass, promo, giftCard, loyalty,
    surchargePercent,
    surchargeLabel: holiday ? `${holiday} surcharge (${surchargePercent}%)` : undefined,
    tipCents,
  });
}
