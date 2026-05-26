import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, venues } from "@db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { env } from "./lib/env";

function getStripe(): Stripe {
  if (!env.stripeSecretKey) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe is not configured" });
  }
  return new Stripe(env.stripeSecretKey, { apiVersion: "2025-04-30.basil" });
}

export const stripeCheckoutRouter = createRouter({
  // Create a Stripe Checkout session for an order
  createCheckoutSession: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    items: z.array(z.object({
      name: z.string(),
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
    metadata: z.record(z.string()).optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const venueResults = await db.select().from(venues).where(eq(venues.id, input.venueId)).limit(1);
    const venue = venueResults[0];
    if (!venue) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });

    const stripe = getStripe();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.items.map(item => ({
      price_data: {
        currency: "aud",
        product_data: { name: item.name },
        unit_amount: Math.round(item.unitPrice * 100), // convert to cents
      },
      quantity: item.quantity,
    }));

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
        ...input.metadata,
      },
      payment_intent_data: {
        metadata: {
          venueId: String(input.venueId),
          customerPhone: input.customerPhone,
        },
      },
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
