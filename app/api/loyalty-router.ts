import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { loyaltyAccounts, loyaltyTransactions, orders, venues } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const loyaltyRouter = createRouter({
  // Public: get account by phone
  getAccount: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string().min(1),
  })).query(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(loyaltyAccounts)
      .where(and(eq(loyaltyAccounts.venueId, input.venueId), eq(loyaltyAccounts.phone, input.phone)))
      .limit(1);
    return results[0] ?? null;
  }),

  // Public: get recent transactions for a phone
  getTransactions: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string().min(1),
    limit: z.number().int().min(1).max(50).default(20),
  })).query(async ({ input }) => {
    const db = getDb();
    const account = await db.select().from(loyaltyAccounts)
      .where(and(eq(loyaltyAccounts.venueId, input.venueId), eq(loyaltyAccounts.phone, input.phone)))
      .limit(1);
    if (!account[0]) return [];
    return db.select().from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.accountId, account[0].id))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(input.limit);
  }),

  // Owner/staff: list all loyalty accounts
  listAccounts: publicQuery.input(z.object({
    token: z.string(),
    limit: z.number().int().min(1).max(200).default(100),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    return db.select().from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.venueId, venueId))
      .orderBy(desc(loyaltyAccounts.totalLifetimePoints))
      .limit(input.limit);
  }),

  // Owner/staff: manually adjust points
  adjustPoints: publicQuery.input(z.object({
    token: z.string(),
    phone: z.string().min(1),
    points: z.number().int(), // positive = add, negative = deduct
    reason: z.string().min(1),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    let account = await db.select().from(loyaltyAccounts)
      .where(and(eq(loyaltyAccounts.venueId, venueId), eq(loyaltyAccounts.phone, input.phone)))
      .limit(1);

    if (!account[0]) {
      // Create account if it doesn't exist
      const [newAccount] = await db.insert(loyaltyAccounts).values({
        venueId,
        phone: input.phone,
        pointsBalance: 0,
        totalLifetimePoints: 0,
      }).returning({ id: loyaltyAccounts.id });
      account = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.id, newAccount.id)).limit(1);
    }

    const acc = account[0];
    const newBalance = Math.max(0, acc.pointsBalance + input.points);

    await db.update(loyaltyAccounts).set({
      pointsBalance: newBalance,
      totalLifetimePoints: input.points > 0 ? acc.totalLifetimePoints + input.points : acc.totalLifetimePoints,
    }).where(eq(loyaltyAccounts.id, acc.id));

    await db.insert(loyaltyTransactions).values({
      venueId,
      accountId: acc.id,
      type: input.points >= 0 ? "earn" : "redeem",
      points: Math.abs(input.points),
      description: input.reason,
    });

    return { success: true, newBalance };
  }),

  // Public: redeem points at checkout (returns discount amount)
  // 10 points = $1 discount. Minimum 100 points to redeem.
  getRedemptionValue: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string().min(1),
    pointsToRedeem: z.number().int().min(100),
  })).query(async ({ input }) => {
    const db = getDb();
    const account = await db.select().from(loyaltyAccounts)
      .where(and(eq(loyaltyAccounts.venueId, input.venueId), eq(loyaltyAccounts.phone, input.phone)))
      .limit(1);
    if (!account[0]) throw new TRPCError({ code: "NOT_FOUND", message: "No loyalty account found" });

    const avail = account[0].pointsBalance;
    if (avail < input.pointsToRedeem) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Only ${avail} points available` });
    }
    const discount = Number((input.pointsToRedeem / 10).toFixed(2));
    return { discount, pointsBalance: avail };
  }),
});
