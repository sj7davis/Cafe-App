import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, protectedProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { venues, venueOwners } from "@db/schema";
import { eq } from "drizzle-orm";
import { env } from "./lib/env";
import { planFor, staffUsage } from "./lib/plans";
import { exportVenue as buildVenueExport } from "./lib/tenant-lifecycle";

const TIERS = {
  starter: { name: "Starter", monthlyPrice: 49, features: ["Basic menu", "Online orders", "2 staff members", "Email support"] },
  pro: { name: "Pro", monthlyPrice: 99, features: ["Square POS sync", "Analytics dashboard", "10 staff members", "Loyalty program", "Priority support"] },
  enterprise: { name: "Enterprise", monthlyPrice: 249, features: ["Multi-location", "API access", "White-label app", "Unlimited staff", "Account manager", "Custom integrations"] },
};

function tierToPriceId(tier: "starter" | "pro" | "enterprise"): string {
  if (tier === "starter") return env.stripePriceIdStarter;
  if (tier === "pro") return env.stripePriceIdPro;
  if (tier === "enterprise") return env.stripePriceIdPro; // fall back to pro price if enterprise not separate
  return "";
}

export const billingRouter = createRouter({
  // Get tier info
  tiers: publicQuery.query(() => TIERS),

  // Get venue's subscription status
  status: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const db = getDb();
    const venue = await db.query.venues?.findFirst({
      where: eq(venues.id, ctx.auth.venueId),
    });
    if (!venue) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });

    // Server-enforced entitlements for this venue's effective plan, plus live
    // usage, so the UI can show limits and disable upgrade-only actions.
    const plan = planFor(venue.subscriptionTier, venue.subscriptionStatus);
    const usage = await staffUsage(ctx.auth.venueId);

    return {
      tier: venue.subscriptionTier,
      status: venue.subscriptionStatus,
      trialEndsAt: venue.trialEndsAt,
      isTrial: venue.subscriptionStatus === "trial",
      tierDetails: TIERS[venue.subscriptionTier as keyof typeof TIERS],
      hasStripeCustomer: !!venue.stripeCustomerId,
      plan: {
        label: plan.label,
        features: plan.features,
        maxStaff: Number.isFinite(plan.maxStaff) ? plan.maxStaff : null,
      },
      usage: { staff: usage },
    };
  }),

  // Owner self-service data export (portability): a secret-redacted JSON
  // snapshot of this venue's own data.
  exportData: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    return buildVenueExport(ctx.auth.venueId);
  }),

  // Change subscription tier — wired to Stripe
  changeTier: protectedProcedure.input(z.object({
    token: z.string(),
    tier: z.enum(["free", "starter", "pro", "enterprise"]),
  })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const venue = await db.query.venues?.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });

    // ── Downgrade to free ────────────────────────────────────────────────
    if (input.tier === "free") {
      if (venue.stripeSubscriptionId && env.stripeSecretKey) {
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-04-22.dahlia" });
        await stripe.subscriptions.cancel(venue.stripeSubscriptionId);
      }
      await db.update(venues).set({
        subscriptionTier: "starter", // keep as starter in DB (no free enum value)
        subscriptionStatus: "cancelled",
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      }).where(eq(venues.id, venueId));
      return { ok: true };
    }

    // ── Paid tier — require Stripe configured ────────────────────────────
    const newPriceId = tierToPriceId(input.tier as "starter" | "pro" | "enterprise");
    if (!newPriceId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe pricing not configured for this tier" });
    }
    if (!env.stripeSecretKey) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe not configured" });
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-04-22.dahlia" });

    // ── Ensure Stripe customer exists ────────────────────────────────────
    let stripeCustomerId = venue.stripeCustomerId ?? null;
    if (!stripeCustomerId) {
      const ownerRow = await db.query.venueOwners?.findFirst({
        where: eq(venueOwners.venueId, venueId),
      });
      const customer = await stripe.customers.create({
        email: ownerRow?.email ?? undefined,
        metadata: { venueId: String(venueId) },
      });
      stripeCustomerId = customer.id;
      await db.update(venues).set({ stripeCustomerId, updatedAt: new Date() }).where(eq(venues.id, venueId));
    }

    // ── Upgrade / downgrade existing subscription ────────────────────────
    if (venue.stripeSubscriptionId) {
      const sub = await stripe.subscriptions.retrieve(venue.stripeSubscriptionId);
      await stripe.subscriptions.update(venue.stripeSubscriptionId, {
        items: [{ id: sub.items.data[0].id, price: newPriceId }],
        proration_behavior: "always_invoice",
      });
      await db.update(venues).set({
        subscriptionTier: input.tier as "starter" | "pro" | "enterprise",
        subscriptionStatus: "active",
        updatedAt: new Date(),
      }).where(eq(venues.id, venueId));
      return { ok: true };
    }

    // ── New subscription ─────────────────────────────────────────────────
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: newPriceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    await db.update(venues).set({
      stripeSubscriptionId: subscription.id,
      subscriptionTier: input.tier as "starter" | "pro" | "enterprise",
      updatedAt: new Date(),
    }).where(eq(venues.id, venueId));

    // Extract client secret if payment is required
    const invoice = subscription.latest_invoice as any;
    const clientSecret = invoice?.payment_intent?.client_secret ?? null;

    return { ok: true, clientSecret };
  }),

  // Cancel subscription
  cancel: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const venue = await db.query.venues?.findFirst({
      where: eq(venues.id, venueId),
    });

    if (venue?.stripeSubscriptionId && env.stripeSecretKey) {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-04-22.dahlia" });
      await stripe.subscriptions.cancel(venue.stripeSubscriptionId);
    }

    await db.update(venues)
      .set({ subscriptionStatus: "cancelled", stripeSubscriptionId: null, updatedAt: new Date() })
      .where(eq(venues.id, venueId));
    return { success: true };
  }),

  // Get Stripe billing portal URL
  getBillingPortalUrl: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const venue = await db.query.venues?.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue?.stripeCustomerId || !env.stripeSecretKey) {
      return { url: null };
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-04-22.dahlia" });
    const session = await stripe.billingPortal.sessions.create({
      customer: venue.stripeCustomerId,
      return_url: env.appUrl + "/dashboard",
    });
    return { url: session.url };
  }),
});
