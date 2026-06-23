// ─── Subscription plans: server-side entitlements ─────────────────────────────
//
// The tier a venue is on (venues.subscriptionTier) decides which features and
// limits it gets. These were previously only described in marketing copy; this
// module enforces them on the server so limits can't be bypassed from the client.
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { getSystemDb } from "../queries/connection";
import { venues, staffAccounts } from "@db/schema";
import { protectedProcedure } from "../middleware";

export type Tier = "starter" | "pro" | "enterprise";
export type Feature = "pos_sync" | "analytics" | "loyalty" | "campaigns" | "multi_venue" | "api_webhooks";

interface Plan {
  label: string;
  maxStaff: number; // Number.POSITIVE_INFINITY = unlimited
  features: readonly Feature[];
}

export const PLANS: Record<Tier, Plan> = {
  starter: { label: "Starter", maxStaff: 2, features: [] },
  pro: {
    label: "Pro",
    maxStaff: 10,
    features: ["pos_sync", "analytics", "loyalty", "campaigns"],
  },
  enterprise: {
    label: "Enterprise",
    maxStaff: Number.POSITIVE_INFINITY,
    features: ["pos_sync", "analytics", "loyalty", "campaigns", "multi_venue", "api_webhooks"],
  },
};

const FEATURE_LABELS: Record<Feature, string> = {
  pos_sync: "POS sync",
  analytics: "the analytics dashboard",
  loyalty: "the loyalty program",
  campaigns: "marketing campaigns",
  multi_venue: "multi-venue management",
  api_webhooks: "API webhooks",
};

/** A cancelled subscription drops to Starter entitlements; trial/active/past_due
 *  keep the paid tier (past_due is a short grace window handled by billing). */
export function effectiveTier(tier: string | null | undefined, status: string | null | undefined): Tier {
  if (status === "cancelled") return "starter";
  return (tier as Tier) in PLANS ? (tier as Tier) : "starter";
}

export function planFor(tier: string | null | undefined, status?: string | null): Plan {
  return PLANS[effectiveTier(tier, status)];
}

async function loadVenuePlan(venueId: number): Promise<Plan> {
  const db = getSystemDb();
  const rows = await db
    .select({ tier: venues.subscriptionTier, status: venues.subscriptionStatus })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);
  return planFor(rows[0]?.tier, rows[0]?.status);
}

/** Throw FORBIDDEN unless the venue's plan includes `feature`. */
export async function requireFeature(venueId: number, feature: Feature): Promise<void> {
  const plan = await loadVenuePlan(venueId);
  if (!plan.features.includes(feature)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your ${plan.label} plan does not include ${FEATURE_LABELS[feature]}. Upgrade to unlock it.`,
    });
  }
}

/** Throw FORBIDDEN when the venue is already at its active-staff limit. */
export async function assertStaffLimit(venueId: number): Promise<void> {
  const plan = await loadVenuePlan(venueId);
  if (plan.maxStaff === Number.POSITIVE_INFINITY) return;
  const db = getSystemDb();
  const rows = await db
    .select({ id: staffAccounts.id })
    .from(staffAccounts)
    .where(and(eq(staffAccounts.venueId, venueId), eq(staffAccounts.isActive, true)));
  if (rows.length >= plan.maxStaff) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your ${plan.label} plan allows up to ${plan.maxStaff} staff members. Upgrade to add more.`,
    });
  }
}

/** Current active-staff usage, for surfacing limits in the UI. */
export async function staffUsage(venueId: number): Promise<{ used: number; max: number }> {
  const plan = await loadVenuePlan(venueId);
  const db = getSystemDb();
  const rows = await db
    .select({ id: staffAccounts.id })
    .from(staffAccounts)
    .where(and(eq(staffAccounts.venueId, venueId), eq(staffAccounts.isActive, true)));
  return { used: rows.length, max: plan.maxStaff };
}

/** A protectedProcedure that also requires the venue's plan to include `feature`. */
export function featureProcedure(feature: Feature) {
  return protectedProcedure.use(async (opts) => {
    await requireFeature(opts.ctx.auth.venueId, feature);
    return opts.next();
  });
}
