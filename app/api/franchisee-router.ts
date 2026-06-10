import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { franchiseeAccounts, franchiseePayouts, orders, venues } from "@db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const franchiseeRouter = createRouter({
  // Set up franchisee config for a venue
  setup: publicQuery.input(z.object({
    token: z.string(),
    platformFeePercent: z.number().min(0).max(100).default(3),
    payoutSchedule: z.enum(["weekly", "fortnightly", "monthly"]).default("monthly"),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const ownerId = payload.payload.ownerId as number;
    const db = getDb();

    const existing = await db.select().from(franchiseeAccounts)
      .where(eq(franchiseeAccounts.venueId, venueId)).limit(1);

    if (existing.length > 0) {
      await db.update(franchiseeAccounts).set({
        platformFeePercent: String(input.platformFeePercent),
        payoutSchedule: input.payoutSchedule,
        notes: input.notes,
        updatedAt: new Date(),
      }).where(eq(franchiseeAccounts.venueId, venueId));
      return { id: existing[0].id, updated: true };
    }

    const [account] = await db.insert(franchiseeAccounts).values({
      venueId,
      ownerId,
      platformFeePercent: String(input.platformFeePercent),
      payoutSchedule: input.payoutSchedule,
      notes: input.notes,
    }).returning();
    return { id: account.id, updated: false };
  }),

  // Get franchisee config
  getConfig: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const [config] = await db.select().from(franchiseeAccounts)
      .where(eq(franchiseeAccounts.venueId, venueId)).limit(1);
    return config || null;
  }),

  // Calculate revenue split for a period
  getRevenueSplit: publicQuery.input(z.object({
    token: z.string(),
    periodStart: z.string(), // ISO date string
    periodEnd: z.string(),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    const [config] = await db.select().from(franchiseeAccounts)
      .where(eq(franchiseeAccounts.venueId, venueId)).limit(1);
    const feePercent = config ? Number(config.platformFeePercent) : 3;

    const periodOrders = await db.select({ total: orders.totalAmount })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        eq(orders.status, "completed"),
        gte(orders.createdAt, new Date(input.periodStart)),
        lte(orders.createdAt, new Date(input.periodEnd))
      ));

    const grossRevenue = periodOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const platformFee = grossRevenue * (feePercent / 100);
    const netPayout = grossRevenue - platformFee;

    return {
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      platformFeePercent: feePercent,
      platformFee: Math.round(platformFee * 100) / 100,
      netPayout: Math.round(netPayout * 100) / 100,
      orderCount: periodOrders.length,
    };
  }),

  // List payout history
  listPayouts: publicQuery.input(z.object({
    token: z.string(),
    limit: z.number().default(24),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    return db.select().from(franchiseePayouts)
      .where(eq(franchiseePayouts.venueId, venueId))
      .orderBy(desc(franchiseePayouts.periodEnd))
      .limit(input.limit);
  }),

  // Process/record a payout for the current month
  processMonthlyPayout: publicQuery.input(z.object({
    token: z.string(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    const [config] = await db.select().from(franchiseeAccounts)
      .where(eq(franchiseeAccounts.venueId, venueId)).limit(1);
    if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Franchisee not configured" });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const periodOrders = await db.select({ total: orders.totalAmount })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        eq(orders.status, "completed"),
        gte(orders.createdAt, periodStart),
        lte(orders.createdAt, periodEnd)
      ));

    const grossRevenue = periodOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const feePercent = Number(config.platformFeePercent);
    const platformFee = grossRevenue * (feePercent / 100);
    const netPayout = grossRevenue - platformFee;

    const [payout] = await db.insert(franchiseePayouts).values({
      franchiseeId: config.id,
      venueId,
      periodStart,
      periodEnd,
      grossRevenue: String(grossRevenue.toFixed(2)),
      platformFee: String(platformFee.toFixed(2)),
      netPayout: String(netPayout.toFixed(2)),
      status: "pending",
    }).returning();

    // Attempt real Stripe transfer if Connect account is ready
    let stripePayoutId: string | null = null;
    if (config.stripeConnectAccountId && env.stripeSecretKey && netPayout > 0) {
      try {
        const stripe = new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
        const account = await stripe.accounts.retrieve(config.stripeConnectAccountId);
        if (account.charges_enabled && account.payouts_enabled) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(netPayout * 100), // cents
            currency: "aud",
            destination: config.stripeConnectAccountId,
            description: `B1 Platform payout — ${periodStart.toLocaleDateString("en-AU")} to ${periodEnd.toLocaleDateString("en-AU")}`,
            metadata: {
              venueId: String(venueId),
              payoutId: String(payout.id),
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
            },
          });
          stripePayoutId = transfer.id;
          await db.update(franchiseePayouts).set({
            status: "processing",
            stripePayoutId: transfer.id,
          }).where(eq(franchiseePayouts.id, payout.id));
        }
      } catch (e: any) {
        // Transfer failed — leave as pending, don't throw
        console.error("Stripe transfer failed:", e.message);
      }
    }

    return {
      id: payout.id,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      netPayout: Math.round(netPayout * 100) / 100,
      stripeTransferId: stripePayoutId,
      transferInitiated: !!stripePayoutId,
    };
  }),

  // Create (or retrieve) a Stripe Express connected account and return an onboarding URL
  createConnectAccountLink: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    if (!env.stripeSecretKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
    const stripe = new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

    const [config] = await db.select().from(franchiseeAccounts)
      .where(eq(franchiseeAccounts.venueId, venueId)).limit(1);
    if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Set up franchisee config first" });

    let accountId = config.stripeConnectAccountId;

    if (!accountId) {
      // Fetch venue + owner email for pre-fill
      const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
      const account = await stripe.accounts.create({
        type: "express",
        country: "AU",
        capabilities: { transfers: { requested: true } },
        business_profile: { name: venue?.name },
      });
      accountId = account.id;
      await db.update(franchiseeAccounts).set({ stripeConnectAccountId: accountId, updatedAt: new Date() })
        .where(eq(franchiseeAccounts.venueId, venueId));
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${env.appUrl}/dashboard?tab=franchisee&reauth=1`,
      return_url: `${env.appUrl}/dashboard?tab=franchisee&connected=stripe`,
      type: "account_onboarding",
    });

    return { url: link.url, accountId };
  }),

  // Check if the Stripe Connect account is fully onboarded and ready for transfers
  getConnectStatus: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    const [config] = await db.select().from(franchiseeAccounts)
      .where(eq(franchiseeAccounts.venueId, venueId)).limit(1);
    if (!config?.stripeConnectAccountId) return { ready: false, accountId: null, message: "No Stripe account linked" };

    if (!env.stripeSecretKey) return { ready: false, accountId: config.stripeConnectAccountId, message: "Stripe not configured" };
    const stripe = new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });

    try {
      const account = await stripe.accounts.retrieve(config.stripeConnectAccountId);
      const ready = account.charges_enabled && account.payouts_enabled && !account.requirements?.currently_due?.length;
      return {
        ready: !!ready,
        accountId: config.stripeConnectAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirementsDue: account.requirements?.currently_due ?? [],
        message: ready ? "Account verified and ready for payouts" : "Onboarding incomplete",
      };
    } catch {
      return { ready: false, accountId: config.stripeConnectAccountId, message: "Could not retrieve account status" };
    }
  }),

  // Retrieve the Stripe Connect payout balance for the caller's venue
  getPayoutBalance: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    const [config] = await db.select().from(franchiseeAccounts)
      .where(eq(franchiseeAccounts.venueId, venueId)).limit(1);

    if (!config?.stripeConnectAccountId || !env.stripeSecretKey) {
      return { connected: false, available: 0, pending: 0, currency: "aud", lastPayoutDate: null };
    }

    try {
      const stripe = new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION });
      const stripeAccount = config.stripeConnectAccountId;

      const [balance, payouts] = await Promise.all([
        stripe.balance.retrieve({}, { stripeAccount }),
        stripe.payouts.list({ limit: 1 }, { stripeAccount }),
      ]);

      return {
        connected: true,
        available: (balance.available[0]?.amount ?? 0) / 100,
        pending: (balance.pending[0]?.amount ?? 0) / 100,
        currency: balance.available[0]?.currency ?? "aud",
        lastPayoutDate: payouts.data[0]?.arrival_date
          ? new Date(payouts.data[0].arrival_date * 1000).toISOString()
          : null,
      };
    } catch {
      return { connected: false, available: 0, pending: 0, currency: "aud", lastPayoutDate: null };
    }
  }),
});
