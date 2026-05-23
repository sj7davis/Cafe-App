import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { loyaltyAccounts, loyaltyTransactions } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const loyaltyRouter = createRouter({
  getAccount: publicQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [existing] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.phone, input.phone)).limit(1);
      if (existing) return existing;
      const [newAcc] = await db.insert(loyaltyAccounts).values({ phone: input.phone }).$returningId();
      const [account] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.id, newAcc.id)).limit(1);
      return account;
    }),

  earnPoints: publicQuery
    .input(z.object({ phone: z.string(), points: z.number().min(1), description: z.string(), orderId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      let [account] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.phone, input.phone)).limit(1);
      if (!account) {
        const [newAcc] = await db.insert(loyaltyAccounts).values({ phone: input.phone }).$returningId();
        [account] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.id, newAcc.id)).limit(1);
      }
      await db.update(loyaltyAccounts).set({
        pointsBalance: account.pointsBalance + input.points,
        totalLifetimePoints: account.totalLifetimePoints + input.points,
      }).where(eq(loyaltyAccounts.id, account.id));
      await db.insert(loyaltyTransactions).values({
        accountId: account.id, type: "earn", points: input.points,
        description: input.description, orderId: input.orderId || null,
      });
      return { accountId: account.id, newBalance: account.pointsBalance + input.points };
    }),

  redeem: publicQuery
    .input(z.object({ phone: z.string(), points: z.number().min(1), description: z.string(), rewardType: z.enum(["coffee", "pastry", "bread"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.phone, input.phone)).limit(1);
      if (!account || account.pointsBalance < input.points) throw new Error("Insufficient points");
      const newBalance = account.pointsBalance - input.points;
      await db.update(loyaltyAccounts).set({
        pointsBalance: newBalance,
        ...(input.rewardType === "coffee" ? { coffeesRedeemed: account.coffeesRedeemed + 1 }
          : input.rewardType === "pastry" ? { pastriesRedeemed: account.pastriesRedeemed + 1 }
          : { breadRedeemed: account.breadRedeemed + 1 }),
      }).where(eq(loyaltyAccounts.id, account.id));
      await db.insert(loyaltyTransactions).values({
        accountId: account.id, type: "redeem", points: -input.points,
        description: input.description,
      });
      return { newBalance, rewardType: input.rewardType };
    }),

  transactions: publicQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [account] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.phone, input.phone)).limit(1);
      if (!account) return { account: null, transactions: [] };
      const txs = await db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.accountId, account.id)).orderBy(desc(loyaltyTransactions.createdAt));
      return { account, transactions: txs };
    }),

  availableRewards: publicQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [account] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.phone, input.phone)).limit(1);
      if (!account) return { balance: 0, rewards: [] };
      const rewards = [];
      if (account.pointsBalance >= 50) rewards.push({ type: "coffee" as const, name: "Free Coffee", cost: 50 });
      if (account.pointsBalance >= 80) rewards.push({ type: "pastry" as const, name: "Free Pastry", cost: 80 });
      if (account.pointsBalance >= 120) rewards.push({ type: "bread" as const, name: "Free Bread Loaf", cost: 120 });
      return { balance: account.pointsBalance, rewards };
    }),
});
