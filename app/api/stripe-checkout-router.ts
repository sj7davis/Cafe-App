import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, menuItems, venues, franchiseeAccounts, giftCards, subscriptionPasses } from "@db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { jwtVerify } from "jose";
import Stripe from "stripe";
import { env } from "./lib/env";
import { randomBytes } from "crypto";
import { sendEmail } from "./lib/email";

const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;
const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

function getStripe(): Stripe {
  if (!env.stripeSecretKey) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe is not configured" });
  }
  return new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
}

/** Generate a 12-char base64url gift card code — same algorithm as venue-router generateGiftCardCode(). */
function generateGiftCardCode(): string {
  return randomBytes(8).toString("base64url").toUpperCase().slice(0, 12);
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

    // ── Stripe-not-configured fallback ────────────────────────────────────────
    // When STRIPE_SECRET_KEY is absent, create the order directly and return
    // a local /order/<num> URL so ordering still works without payment.
    if (!env.stripeSecretKey) {
      const orderNumber = `B1-${Date.now().toString(36).toUpperCase()}`;
      let totalAmount = 0;
      const itemDetails: { menuItemId: number; itemName: string; quantity: number; unitPrice: number }[] = [];

      for (const item of input.items) {
        const miRows = await db.select().from(menuItems).where(eq(menuItems.id, item.menuItemId)).limit(1);
        const mi = miRows[0];
        if (!mi || mi.venueId !== input.venueId) continue;
        const unitPrice = Number(item.unitPrice ?? mi.price);
        totalAmount += unitPrice * item.quantity;
        itemDetails.push({ menuItemId: item.menuItemId, itemName: mi.name ?? item.name, quantity: item.quantity, unitPrice });
      }

      const finalTotal = Math.max(0, totalAmount - (input.discountAmount ?? 0)) + (input.tipAmount ?? 0);

      const [orderRow] = await db.insert(orders).values({
        venueId: input.venueId,
        orderNumber,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        pickupTime: input.pickupTime,
        orderNote: input.orderNote ?? null,
        paymentMethod: "pickup" as any,
        totalAmount: finalTotal.toFixed(2),
        locationId: input.locationId ?? null,
        tipAmount: (input.tipAmount ?? 0).toFixed(2),
        discountCode: input.discountCode ?? null,
        discountAmount: (input.discountAmount ?? 0).toFixed(2),
        status: "confirmed" as any,
      }).returning({ id: orders.id });

      for (const item of itemDetails) {
        await db.insert(orderItems).values({
          orderId: orderRow.id,
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
        });
      }

      const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
      const appUrl = domain ? `https://${domain}` : (env.appUrl || "http://localhost:3000");
      return { sessionId: null as string | null, url: `${appUrl}/order/${orderNumber}` };
    }
    // ── End fallback ──────────────────────────────────────────────────────────

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

    const successUrl = `${env.appUrl}/v/${venue.slug}?order=success&session={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${env.appUrl}/v/${venue.slug}`;

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
  getRefundableOrders: publicQuery.input(z.object({
    token: z.string(),
  })).query(async ({ input }) => {
    let venueId: number;
    try {
      const { payload } = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      venueId = payload.venueId as number;
    } catch {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
    }

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
  createRefund: publicQuery.input(z.object({
    token: z.string(),
    orderId: z.number().int().positive(),
    amount: z.number().positive().optional(), // partial refund in dollars; omit for full refund
    reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).default("requested_by_customer"),
  })).mutation(async ({ input }) => {
    // 1. Verify JWT and extract venueId (owner only)
    let venueId: number;
    try {
      const { payload } = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      venueId = payload.venueId as number;
    } catch {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
    }

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
