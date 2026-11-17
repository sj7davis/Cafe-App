// Spending the customer's stored value (gift card balance, loyalty points,
// pass credits, discount-code uses) happens only once an order is paid — from
// the Stripe webhook, or straight away for an order discounts fully cover.
// Each step is non-blocking: the customer has already paid, so a failure here
// is logged rather than allowed to lose the order.

import { and, eq, gte, sql } from "drizzle-orm";
import { discountCodes, giftCards, loyaltyAccounts, loyaltyTransactions, subscriptionPasses } from "@db/schema";
import type { getDb } from "../queries/connection";

type Db = ReturnType<typeof getDb>;

export interface Redemptions {
  venueId: number;
  orderId: number;
  orderNumber: string;
  discountCode?: string | null;
  giftCardId?: number | null;
  giftCardCents?: number | null;
  loyaltyPhone?: string | null;
  loyaltyPoints?: number | null;
  passId?: number | null;
}

export async function applyRedemptions(db: Db, r: Redemptions): Promise<void> {
  if (r.discountCode) {
    try {
      await db.update(discountCodes)
        .set({ usedCount: sql`used_count + 1` })
        .where(and(eq(discountCodes.venueId, r.venueId), eq(discountCodes.code, r.discountCode.toUpperCase())));
    } catch (err) { console.error("[redemptions] discount usage", r.orderNumber, err); }
  }

  if (r.giftCardId && r.giftCardCents && r.giftCardCents > 0) {
    const amount = (r.giftCardCents / 100).toFixed(2);
    try {
      // Atomic and guarded: two checkouts racing on one card can't both spend it.
      const updated = await db.update(giftCards)
        .set({
          balance: sql`${giftCards.balance} - ${amount}`,
          isRedeemed: sql`${giftCards.balance} - ${amount} <= 0`,
        })
        .where(and(eq(giftCards.id, r.giftCardId), eq(giftCards.venueId, r.venueId), gte(giftCards.balance, amount)))
        .returning({ id: giftCards.id });
      if (!updated[0]) console.error(`[redemptions] gift card ${r.giftCardId} had insufficient balance for order ${r.orderNumber}`);
    } catch (err) { console.error("[redemptions] gift card", r.orderNumber, err); }
  }

  if (r.loyaltyPhone && r.loyaltyPoints && r.loyaltyPoints > 0) {
    try {
      const [acc] = await db.select().from(loyaltyAccounts)
        .where(and(eq(loyaltyAccounts.venueId, r.venueId), eq(loyaltyAccounts.phone, r.loyaltyPhone))).limit(1);
      if (acc) {
        await db.update(loyaltyAccounts)
          .set({ pointsBalance: sql`GREATEST(0, ${loyaltyAccounts.pointsBalance} - ${r.loyaltyPoints})` })
          .where(eq(loyaltyAccounts.id, acc.id));
        await db.insert(loyaltyTransactions).values({
          venueId: r.venueId,
          accountId: acc.id,
          type: "redeem",
          points: r.loyaltyPoints,
          description: `Redeemed ${r.loyaltyPoints} pts at checkout`,
          orderId: r.orderId,
        });
      }
    } catch (err) { console.error("[redemptions] loyalty", r.orderNumber, err); }
  }

  if (r.passId) {
    try {
      await db.update(subscriptionPasses)
        .set({
          remainingCredits: sql`${subscriptionPasses.remainingCredits} - 1`,
          isActive: sql`${subscriptionPasses.remainingCredits} - 1 > 0`,
        })
        .where(and(
          eq(subscriptionPasses.id, r.passId),
          eq(subscriptionPasses.venueId, r.venueId),
          eq(subscriptionPasses.isActive, true),
          gte(subscriptionPasses.remainingCredits, 1),
        ));
    } catch (err) { console.error("[redemptions] pass credit", r.orderNumber, err); }
  }
}
