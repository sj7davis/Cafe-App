import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { loyaltyRewards, loyaltyAccounts, loyaltyTransactions } from "@db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const loyaltyRewardsRouter = createRouter({
  // Public: list active rewards for a venue
  list: publicQuery
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(loyaltyRewards)
        .where(and(eq(loyaltyRewards.venueId, input.venueId), eq(loyaltyRewards.isActive, true)))
        .orderBy(asc(loyaltyRewards.sortOrder), asc(loyaltyRewards.id));
    }),

  // Owner: list all rewards (including inactive)
  listAll: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      return db
        .select()
        .from(loyaltyRewards)
        .where(eq(loyaltyRewards.venueId, venueId))
        .orderBy(asc(loyaltyRewards.sortOrder), asc(loyaltyRewards.id));
    }),

  // Owner: create a reward
  create: publicQuery
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1).max(128),
        description: z.string().optional(),
        pointsCost: z.number().int().positive(),
        rewardType: z.enum(["free_item", "discount_percent", "discount_fixed", "custom"]),
        rewardValue: z.string().optional(),
        menuItemSlug: z.string().optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const { token, ...data } = input;
      const db = getDb();
      const [reward] = await db
        .insert(loyaltyRewards)
        .values({ ...data, venueId })
        .returning();
      return reward;
    }),

  // Owner: update a reward
  update: publicQuery
    .input(
      z.object({
        token: z.string(),
        id: z.number().int().positive(),
        name: z.string().min(1).max(128).optional(),
        description: z.string().optional(),
        pointsCost: z.number().int().positive().optional(),
        rewardType: z.enum(["free_item", "discount_percent", "discount_fixed", "custom"]).optional(),
        rewardValue: z.string().optional(),
        menuItemSlug: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const { token, id, ...data } = input;
      const db = getDb();
      const [reward] = await db
        .update(loyaltyRewards)
        .set(data)
        .where(and(eq(loyaltyRewards.id, id), eq(loyaltyRewards.venueId, venueId)))
        .returning();
      if (!reward) throw new TRPCError({ code: "NOT_FOUND", message: "Reward not found" });
      return reward;
    }),

  // Owner: delete a reward
  delete: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      await db
        .delete(loyaltyRewards)
        .where(and(eq(loyaltyRewards.id, input.id), eq(loyaltyRewards.venueId, venueId)));
      return { success: true };
    }),

  // Public: redeem a reward
  redeem: publicQuery
    .input(
      z.object({
        venueId: z.number().int().positive(),
        phone: z.string().min(1),
        rewardId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Fetch the reward
      const rewardResults = await db
        .select()
        .from(loyaltyRewards)
        .where(and(eq(loyaltyRewards.id, input.rewardId), eq(loyaltyRewards.venueId, input.venueId)))
        .limit(1);
      const reward = rewardResults[0];
      if (!reward || !reward.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reward not found or inactive" });
      }

      // Fetch loyalty account
      const accountResults = await db
        .select()
        .from(loyaltyAccounts)
        .where(and(eq(loyaltyAccounts.venueId, input.venueId), eq(loyaltyAccounts.phone, input.phone)))
        .limit(1);
      const account = accountResults[0];
      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Loyalty account not found" });
      }

      if (account.pointsBalance < reward.pointsCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient points" });
      }

      const newBalance = account.pointsBalance - reward.pointsCost;

      // Deduct points
      await db
        .update(loyaltyAccounts)
        .set({ pointsBalance: newBalance })
        .where(eq(loyaltyAccounts.id, account.id));

      // Insert redemption transaction
      await db.insert(loyaltyTransactions).values({
        venueId: input.venueId,
        accountId: account.id,
        type: "redeem",
        points: -reward.pointsCost,
        description: `Reward: ${reward.name}`,
      });

      return { success: true, reward, pointsRemaining: newBalance };
    }),
});
