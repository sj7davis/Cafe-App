import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, venues, franchiseeAccounts } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { env } from "./lib/env";

const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

function getStripe(): Stripe {
  if (!env.stripeSecretKey) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe is not configured" });
  }
  return new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
}

export const stripeCheckoutRouter = createRouter({
  // Create a Stripe Checkout session for an order
  createCheckoutSession: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    items: z.array(z.object({
      menuItemId: z.number().int().positive(),
      name: z.string(),
      itemName: z.string().optional(), // alias accepted
      quantity: z.number().int().min(1),
      unitPrice: z.number().positive(), // in dollars
    })),
    tipAmount: z.number().min(0).default(0),
    discountAmount: z.number().min(0).default(0),
    customerEmail: z.string().email().optional(),
    customerName: z.string().min(1),
    customerPhone: z.string().min(1),
    pickupTime: z.string(),
    orderNote: z.string().optional(),
    locationId: z.number().int().positive().optional(),
    discountCode: z.string().optional(),
    loyaltyPhone: z.string().optional(),
    loyaltyPointsRedeemed: z.number().int().min(0).default(0),
    metadata: z.record(z.string(), z.string()).optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const venueResults = await db.select().from(venues).where(eq(venues.id, input.venueId)).limit(1);
    const venue = venueResults[0];
    if (!venue) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });

    const stripe = getStripe();

    // Look up franchisee account for connected Stripe account + fee config
    const franchiseeRows = await db
      .select({
        stripeConnectAccountId: franchiseeAccounts.stripeConnectAccountId,
        platformFeePercent: franchiseeAccounts.platformFeePercent,
      })
      .from(franchiseeAccounts)
      .where(eq(franchiseeAccounts.venueId, input.venueId))
      .limit(1);
    const franchisee = franchiseeRows[0];

    // Build line items — authoritative prices come from the client but are
    // the same amounts Stripe will charge (display + charge aligned, T-08-01).
    const lineItems = input.items.map(item => ({
      price_data: {
        currency: "aud",
        product_data: { name: item.name },
        unit_amount: Math.round(item.unitPrice * 100), // convert to cents
      },
      quantity: item.quantity,
    }));

    // Compute subtotal in cents for application fee calculation
    const subtotalCents = input.items.reduce(
      (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
      0
    );

    // Add tip as a separate line item if present
    if (input.tipAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "aud",
          product_data: { name: "Tip — thank you!" },
          unit_amount: Math.round(input.tipAmount * 100),
        },
        quantity: 1,
      });
    }

    // Total cents including tip (before discount coupon — Stripe applies coupon server-side)
    const totalBeforeDiscountCents = subtotalCents + Math.round(input.tipAmount * 100);

    // Compute platform application fee
    const feePercent = franchisee?.platformFeePercent
      ? Number(franchisee.platformFeePercent)
      : Number(env.stripePlatformFeePercent);
    const applicationFeeCents = Math.round(totalBeforeDiscountCents * feePercent / 100);

    // Handle discount via coupon if discountAmount > 0
    let discounts: Stripe.Checkout.SessionCreateParams["discounts"];
    if (input.discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(input.discountAmount * 100),
        currency: "aud",
        name: input.discountCode ? `Code: ${input.discountCode}` : "Discount",
        duration: "once",
      });
      discounts = [{ coupon: coupon.id }];
    }

    const successUrl = `${env.appUrl}/${venue.slug}/order-status?session={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${env.appUrl}/${venue.slug}`;

    // Serialize cart items for webhook order reconstruction
    const itemsForWebhook = input.items.map(item => ({
      menuItemId: item.menuItemId,
      itemName: item.itemName ?? item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    // Build payment_intent_data — add Connect fee + transfer only when connected account exists
    const paymentIntentData: Stripe.Checkout.SessionCreateParams["payment_intent_data"] = {
      metadata: {
        venueId: String(input.venueId),
        customerPhone: input.customerPhone,
      },
    };

    const stripeConnectAccountId = franchisee?.stripeConnectAccountId ?? null;
    if (stripeConnectAccountId) {
      paymentIntentData.application_fee_amount = applicationFeeCents;
      paymentIntentData.transfer_data = { destination: stripeConnectAccountId };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      discounts,
      customer_email: input.customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        venueId: String(input.venueId),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        pickupTime: input.pickupTime,
        orderNote: input.orderNote ?? "",
        locationId: input.locationId ? String(input.locationId) : "",
        discountCode: input.discountCode ?? "",
        discountAmount: String(input.discountAmount),
        tipAmount: String(input.tipAmount),
        loyaltyPhone: input.loyaltyPhone ?? "",
        loyaltyPointsRedeemed: String(input.loyaltyPointsRedeemed),
        itemsJson: JSON.stringify(itemsForWebhook),
        ...input.metadata,
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
});
