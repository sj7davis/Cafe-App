import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, protectedProcedure, type AuthContext } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, venues, franchiseeAccounts } from "@db/schema";
import { eq, and, isNull } from "drizzle-orm";
import Stripe from "stripe";
import { env } from "./lib/env";
import { randomBytes } from "crypto";
import { priceCart } from "./lib/cart-pricing";
import { applyRedemptions } from "./lib/redemptions";
import { broadcastToVenue } from "./lib/sse-store";

const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

function getStripe(): Stripe {
  if (!env.stripeSecretKey) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe is not configured" });
  }
  return new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
}

/**
 * Look up the Connect account + fee config for a venue and return a
 * payment_intent_data block that includes application_fee_amount +
 * transfer_data.destination only when a connected account is present.
 */
async function buildPaymentIntentData(
  venueId: number,
  amountCents: number,
): Promise<Stripe.Checkout.SessionCreateParams["payment_intent_data"]> {
  const db = getDb();
  const franchiseeRows = await db
    .select({
      stripeConnectAccountId: franchiseeAccounts.stripeConnectAccountId,
      platformFeePercent: franchiseeAccounts.platformFeePercent,
    })
    .from(franchiseeAccounts)
    .where(eq(franchiseeAccounts.venueId, venueId))
    .limit(1);
  const franchisee = franchiseeRows[0];

  const feePercent = franchisee?.platformFeePercent
    ? Number(franchisee.platformFeePercent)
    : Number(env.stripePlatformFeePercent);
  const applicationFeeCents = Math.round(amountCents * feePercent / 100);

  const paymentIntentData: Stripe.Checkout.SessionCreateParams["payment_intent_data"] = {
    metadata: { venueId: String(venueId) },
  };

  const stripeConnectAccountId = franchisee?.stripeConnectAccountId ?? null;
  if (stripeConnectAccountId) {
    paymentIntentData.application_fee_amount = applicationFeeCents;
    paymentIntentData.transfer_data = { destination: stripeConnectAccountId };
  }

  return paymentIntentData;
}

/** Refunds move the venue's money, so only owners and admin/manager staff —
 *  never a basic staff login or the counter tablet. */
function assertCanRefund(auth: AuthContext): number {
  const isOwner = auth.ownerId !== undefined;
  const isSeniorStaff = auth.staffId !== undefined && (auth.role === "admin" || auth.role === "manager");
  if (!isOwner && !isSeniorStaff) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and managers can issue refunds" });
  }
  return auth.venueId;
}

const cartInput = z.object({
  venueId: z.number().int().positive(),
  items: z.array(z.object({
    menuItemId: z.number().int().positive().optional(),
    bundleId: z.number().int().positive().optional(),
    quantity: z.number().int().min(1).max(99),
    modifiers: z.array(z.object({ group: z.string().max(64), option: z.string().max(64) })).max(20).optional(),
  })).min(1).max(50),
  tipAmount: z.number().min(0).default(0),
  discountCode: z.string().max(32).optional(),
  giftCardCode: z.string().max(32).optional(),
  loyaltyPhone: z.string().max(32).optional(),
  loyaltyPointsRedeemed: z.number().int().min(0).default(0),
  passId: z.number().int().positive().optional(),
});

/** Venue that exists and is currently taking online orders. */
async function loadOrderableVenue(venueId: number) {
  const [venue] = await getDb().select().from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  if (!venue.isActive || venue.isPublic === false) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This cafe isn't taking online orders right now." });
  }
  return venue;
}

/** Timestamp plus random suffix — two orders in the same millisecond used to collide. */
export function newOrderNumber(): string {
  return `B1-${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`;
}

export const stripeCheckoutRouter = createRouter({
  // Price a cart exactly as checkout will charge it, so the cart drawer shows
  // the server's numbers (discounts, surcharge, pass credit) before paying.
  quoteCart: publicQuery.input(cartInput.extend({
    customerPhone: z.string().optional(),
  })).query(async ({ input }) => {
    const venue = await loadOrderableVenue(input.venueId);
    const quote = await priceCart(getDb(), venue, input);
    return {
      subtotal: quote.subtotalCents / 100,
      pass: quote.pass ? quote.pass.cents / 100 : 0,
      promo: quote.promo ? { kind: quote.promo.kind, label: quote.promo.label, amount: quote.promo.cents / 100 } : null,
      giftCard: quote.giftCard ? quote.giftCard.cents / 100 : 0,
      loyalty: quote.loyalty ? { points: quote.loyalty.points, amount: quote.loyalty.cents / 100 } : null,
      surcharge: quote.surcharge ? { label: quote.surcharge.label, amount: quote.surcharge.cents / 100 } : null,
      tip: quote.tipCents / 100,
      total: quote.totalCents / 100,
    };
  }),

  // Create a Stripe Checkout session for an order. Every amount comes from
  // priceCart — the client sends ids, option names and codes only.
  createCheckoutSession: publicQuery.input(cartInput.extend({
    customerEmail: z.string().email().optional(),
    customerName: z.string().trim().min(1).max(100),
    customerPhone: z.string().trim().min(6).max(32),
    pickupTime: z.string().max(32),
    orderNote: z.string().max(400).optional(),
    locationId: z.number().int().positive().optional(),
    // Post-purchase extras the webhook understands. Only these two are ever
    // copied into Stripe metadata, so a client can't overwrite venueId or kind.
    metadata: z.object({
      prefMilk: z.string().max(32).optional(),
      prefSugar: z.string().max(32).optional(),
    }).passthrough().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const venue = await loadOrderableVenue(input.venueId);
    const quote = await priceCart(db, venue, input);

    const noteParts = [input.orderNote?.trim()];
    if (quote.pass) noteParts.push("Pass credit used");
    if (quote.giftCard) noteParts.push(`Gift card: -$${(quote.giftCard.cents / 100).toFixed(2)}`);
    if (quote.surcharge) noteParts.push(`${quote.surcharge.label}: +$${(quote.surcharge.cents / 100).toFixed(2)}`);
    const orderNote = noteParts.filter(Boolean).join("; ").slice(0, 450);

    const discountDollars = (quote.discountCents / 100).toFixed(2);
    const tipDollars = (quote.tipCents / 100).toFixed(2);

    // ── No card payment needed: Stripe isn't configured (dev), or discounts
    // cover the whole order. Create the order straight away.
    if (!env.stripeSecretKey || quote.totalCents === 0) {
      const orderNumber = newOrderNumber();
      const paidInFull = quote.totalCents === 0;
      const [orderRow] = await db.insert(orders).values({
        venueId: venue.id,
        orderNumber,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        pickupTime: input.pickupTime,
        orderNote: orderNote || null,
        paymentMethod: paidInFull ? "online" : "pickup",
        totalAmount: (quote.totalCents / 100).toFixed(2),
        locationId: input.locationId ?? null,
        tipAmount: tipDollars,
        discountCode: quote.promo?.code ?? null,
        discountAmount: discountDollars,
        status: "confirmed",
      }).returning({ id: orders.id });
      for (const l of quote.lines) {
        await db.insert(orderItems).values({
          orderId: orderRow.id, menuItemId: l.menuItemId, itemName: l.name.slice(0, 128),
          quantity: l.quantity, unitPrice: (l.unitCents / 100).toFixed(2), note: l.note,
        });
      }
      await applyRedemptions(db, {
        venueId: venue.id, orderId: orderRow.id, orderNumber,
        discountCode: quote.promo?.code ?? null,
        giftCardId: quote.giftCard?.id ?? null,
        giftCardCents: quote.giftCard?.cents ?? null,
        loyaltyPhone: quote.loyalty?.phone ?? null,
        loyaltyPoints: quote.loyalty?.points ?? null,
        passId: quote.pass?.id ?? null,
      });
      broadcastToVenue(venue.id, "order_new", { orderId: orderRow.id, status: "confirmed", orderNumber });
      return { sessionId: null as string | null, url: `${env.appUrl}/order/${orderNumber}` };
    }

    if (quote.totalCents < 50) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Card payments must be at least $0.50 — try removing a discount." });
    }

    const stripe = getStripe();
    const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams["line_items"]> = quote.lines.map(l => ({
      price_data: {
        currency: "aud",
        // The webhook rebuilds the kitchen order from these, so a big cart no
        // longer has to fit in Stripe's 500-character metadata values.
        product_data: {
          name: l.name.slice(0, 250),
          metadata: { menuItemId: String(l.menuItemId), ...(l.note ? { note: l.note.slice(0, 450) } : {}) },
        },
        unit_amount: l.unitCents,
      },
      quantity: l.quantity,
    }));
    if (quote.surcharge) {
      lineItems.push({
        price_data: { currency: "aud", product_data: { name: quote.surcharge.label }, unit_amount: quote.surcharge.cents },
        quantity: 1,
      });
    }
    if (quote.tipCents > 0) {
      lineItems.push({
        price_data: { currency: "aud", product_data: { name: "Tip — thank you!" }, unit_amount: quote.tipCents },
        quantity: 1,
      });
    }

    let discounts: Stripe.Checkout.SessionCreateParams["discounts"];
    if (quote.discountCents > 0) {
      const labels = [
        quote.pass && "Pass credit",
        quote.promo?.code ? `Code ${quote.promo.code}` : quote.promo?.label,
        quote.giftCard && "Gift card",
        quote.loyalty && `${quote.loyalty.points} pts`,
      ].filter(Boolean).join(" + ");
      const coupon = await stripe.coupons.create({
        amount_off: quote.discountCents,
        currency: "aud",
        name: labels.slice(0, 40),
        duration: "once",
        max_redemptions: 1,
      });
      discounts = [{ coupon: coupon.id }];
    }

    // The platform fee is charged on what the customer actually pays.
    const paymentIntentData = await buildPaymentIntentData(venue.id, quote.totalCents);
    paymentIntentData!.metadata = { venueId: String(venue.id), customerPhone: input.customerPhone };

    const extras = input.metadata ?? {};
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      discounts,
      customer_email: input.customerEmail,
      success_url: `${env.appUrl}/v/${venue.slug}?order=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/v/${venue.slug}`,
      metadata: {
        ...(extras.prefMilk ? { prefMilk: String(extras.prefMilk) } : {}),
        ...(extras.prefSugar ? { prefSugar: String(extras.prefSugar) } : {}),
        kind: "order",
        pricing: "v2",
        venueId: String(venue.id),
        venueName: venue.name.slice(0, 100),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        pickupTime: input.pickupTime,
        orderNote,
        locationId: input.locationId ? String(input.locationId) : "",
        discountCode: quote.promo?.code ?? "",
        discountAmount: discountDollars,
        tipAmount: tipDollars,
        surchargeAmount: ((quote.surcharge?.cents ?? 0) / 100).toFixed(2),
        loyaltyPhone: quote.loyalty?.phone ?? "",
        loyaltyPointsRedeemed: String(quote.loyalty?.points ?? 0),
        giftCardId: quote.giftCard ? String(quote.giftCard.id) : "",
        giftCardCents: quote.giftCard ? String(quote.giftCard.cents) : "",
        passId: quote.pass ? String(quote.pass.id) : "",
      },
      payment_intent_data: paymentIntentData,
    });

    return { sessionId: session.id, url: session.url };
  }),

  // Verify a completed Stripe session and return the linked order
  verifySession: publicQuery.input(z.object({
    sessionId: z.string().min(1),
    venueSlug: z.string().min(1),
  })).query(async ({ input }) => {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(input.sessionId);

    if (session.payment_status !== "paid") {
      return { paid: false, orderId: null };
    }

    const db = getDb();
    // Find order by stripe session ID
    const orderResults = await db.select().from(orders)
      .where(eq(orders.stripeSessionId, input.sessionId))
      .limit(1);

    return {
      paid: true,
      orderId: orderResults[0]?.id ?? null,
      orderNumber: orderResults[0]?.orderNumber ?? null,
    };
  }),

  // ─── Gift Card Checkout (PAY-03) ────────────────────────────────────────────
  // Public mutation — no owner JWT required. Prices come from client input but
  // the gift card row is NOT created here; creation happens in the webhook after
  // payment_status === "paid" (T-08-05).
  createGiftCardCheckoutSession: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    amount: z.number().positive(), // in dollars
    senderName: z.string().optional(),
    recipientName: z.string().optional(),
    recipientEmail: z.string().email().optional(),
    recipientPhone: z.string().optional(),
    message: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const venueResults = await db.select({ id: venues.id, slug: venues.slug })
      .from(venues).where(eq(venues.id, input.venueId)).limit(1);
    const venue = venueResults[0];
    if (!venue) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });

    const stripe = getStripe();
    const amountCents = Math.round(input.amount * 100);

    const paymentIntentData = await buildPaymentIntentData(input.venueId, amountCents);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "aud",
          product_data: { name: `Gift Card — $${input.amount.toFixed(2)}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      success_url: `${env.appUrl}/v/${venue.slug}?giftcard=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/v/${venue.slug}?giftcard=cancelled`,
      metadata: {
        kind: "gift_card",
        venueId: String(input.venueId),
        amount: input.amount.toFixed(2),
        senderName: input.senderName ?? "",
        recipientName: input.recipientName ?? "",
        recipientEmail: input.recipientEmail ?? "",
        recipientPhone: input.recipientPhone ?? "",
        message: input.message ?? "",
      },
      payment_intent_data: paymentIntentData,
    });

    return { url: session.url, sessionId: session.id };
  }),

  // ─── Subscription Pass Checkout (PAY-04) ────────────────────────────────────
  // Public mutation — no owner JWT required. Pass price is read from
  // venues.settingsJson.passConfig server-side (T-08-04 mitigation).
  // The subscriptionPasses row is NOT created here; it is created in the webhook.
  createPassCheckoutSession: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string().min(1),
    name: z.string().min(1),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const venueResults = await db.select({ id: venues.id, slug: venues.slug, settingsJson: venues.settingsJson })
      .from(venues).where(eq(venues.id, input.venueId)).limit(1);
    const venue = venueResults[0];
    if (!venue) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });

    const passConfig = (venue.settingsJson as any)?.passConfig as
      { name: string; totalCredits: number; price: number } | undefined;
    if (!passConfig) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No pass configured for this venue" });
    }

    const stripe = getStripe();
    const amountCents = Math.round(Number(passConfig.price) * 100);

    const paymentIntentData = await buildPaymentIntentData(input.venueId, amountCents);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "aud",
          product_data: { name: `Coffee Pass — ${passConfig.name}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      success_url: `${env.appUrl}/v/${venue.slug}?pass=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/v/${venue.slug}?pass=cancelled`,
      metadata: {
        kind: "pass",
        venueId: String(input.venueId),
        phone: input.phone,
        name: input.name,
        totalCredits: String(passConfig.totalCredits),
        price: Number(passConfig.price).toFixed(2),
      },
      payment_intent_data: paymentIntentData,
    });

    return { url: session.url, sessionId: session.id };
  }),

  // ─── Refund Management (owner only) ────────────────────────────────────────

  // List orders eligible for refund: completed, has Stripe session, not yet refunded
  getRefundableOrders: protectedProcedure.input(z.object({
    token: z.string(),
  })).query(async ({ ctx }) => {
    const venueId = assertCanRefund(ctx.auth);

    const db = getDb();
    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        totalAmount: orders.totalAmount,
        stripeSessionId: orders.stripeSessionId,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.venueId, venueId),
          eq(orders.status, "completed" as any),
          isNull(orders.refundedAt),
        )
      )
      .orderBy(orders.createdAt);

    // Filter to only those with a Stripe session (can't refund cash orders)
    return rows.filter(r => !!r.stripeSessionId);
  }),

  // Issue a partial or full refund for a completed Stripe order
  createRefund: protectedProcedure.input(z.object({
    token: z.string(),
    orderId: z.number().int().positive(),
    amount: z.number().positive().optional(), // partial refund in dollars; omit for full refund
    reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).default("requested_by_customer"),
  })).mutation(async ({ input, ctx }) => {
    const venueId = assertCanRefund(ctx.auth);

    const db = getDb();

    // 2. Load order, verify venue ownership and refund eligibility
    const orderRows = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
    const order = orderRows[0];
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
    if (order.venueId !== venueId) throw new TRPCError({ code: "FORBIDDEN", message: "Order does not belong to your venue" });
    if (!order.stripeSessionId) throw new TRPCError({ code: "BAD_REQUEST", message: "Order has no Stripe session — cannot refund" });
    if (order.refundedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Order has already been refunded" });

    // 3. Retrieve Stripe session to get payment intent ID
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (!session.payment_intent) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No payment intent found on Stripe session" });
    }
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;

    // 4. Create refund via Stripe
    const amountCents = input.amount !== undefined ? Math.round(input.amount * 100) : undefined;
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountCents !== undefined ? { amount: amountCents } : {}),
      reason: input.reason,
    });

    const refundedDollars = refund.amount / 100;

    // 5. Update order with refund timestamp and amount
    await db.update(orders)
      .set({
        refundedAt: new Date(),
        refundAmount: refundedDollars.toFixed(2),
      })
      .where(eq(orders.id, input.orderId));

    // 6. Return result
    return {
      success: true,
      refundId: refund.id,
      amount: refundedDollars,
    };
  }),
});
