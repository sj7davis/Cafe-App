import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { franchiseeAccounts, franchiseePayouts, orders, venues } from "@db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

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

    return {
      id: payout.id,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      netPayout: Math.round(netPayout * 100) / 100,
    };
  }),
});
