import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { venues } from "@db/schema";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.STAFF_JWT_SECRET || "b1-platform-jwt-secret-key-2024");

const TIERS = {
  starter: { name: "Starter", monthlyPrice: 49, features: ["Basic menu", "Online orders", "2 staff members", "Email support"] },
  pro: { name: "Pro", monthlyPrice: 99, features: ["Square POS sync", "Analytics dashboard", "10 staff members", "Loyalty program", "Priority support"] },
  enterprise: { name: "Enterprise", monthlyPrice: 249, features: ["Multi-location", "API access", "White-label app", "Unlimited staff", "Account manager", "Custom integrations"] },
};

export const billingRouter = createRouter({
  // Get tier info
  tiers: publicQuery.query(() => TIERS),

  // Get venue's subscription status
  status: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venue = await db.query.venues?.findFirst({
      where: eq(venues.id, payload.payload.venueId as number),
    });
    if (!venue) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });

    return {
      tier: venue.subscriptionTier,
      status: venue.subscriptionStatus,
      trialEndsAt: venue.trialEndsAt,
      isTrial: venue.subscriptionStatus === "trial",
      tierDetails: TIERS[venue.subscriptionTier as keyof typeof TIERS],
    };
  }),

  // Change subscription tier (would integrate with Stripe in production)
  changeTier: publicQuery.input(z.object({
    token: z.string(),
    tier: z.enum(["starter", "pro", "enterprise"]),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    await db.update(venues)
      .set({ subscriptionTier: input.tier, updatedAt: new Date() })
      .where(eq(venues.id, payload.payload.venueId as number));
    return { success: true, tier: input.tier, tierDetails: TIERS[input.tier] };
  }),

  // Cancel subscription
  cancel: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    await db.update(venues)
      .set({ subscriptionStatus: "cancelled", updatedAt: new Date() })
      .where(eq(venues.id, payload.payload.venueId as number));
    return { success: true };
  }),
});
