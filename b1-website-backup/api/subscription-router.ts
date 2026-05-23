import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { subscriptionPasses } from "@db/schema";
import { eq, and, gt } from "drizzle-orm";

export const subscriptionRouter = createRouter({
  list: publicQuery.input(z.object({ phone: z.string() })).query(async ({ input }) => {
    const db = getDb();
    return db.select().from(subscriptionPasses)
      .where(and(eq(subscriptionPasses.phone, input.phone), eq(subscriptionPasses.isActive, true), gt(subscriptionPasses.remainingCredits, 0)));
  }),
  create: publicQuery.input(z.object({
    phone: z.string(), name: z.string(), totalCredits: z.number(), price: z.number(), expiresAt: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const [pass] = await db.insert(subscriptionPasses).values({
      phone: input.phone, name: input.name, totalCredits: input.totalCredits,
      remainingCredits: input.totalCredits, price: input.price.toString(),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    }).$returningId();
    return { passId: pass.id };
  }),
  redeemCredit: publicQuery.input(z.object({ passId: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    const [pass] = await db.select().from(subscriptionPasses).where(eq(subscriptionPasses.id, input.passId)).limit(1);
    if (!pass || pass.remainingCredits <= 0) throw new Error("No credits remaining");
    await db.update(subscriptionPasses).set({ remainingCredits: pass.remainingCredits - 1 }).where(eq(subscriptionPasses.id, input.passId));
    return { remaining: pass.remainingCredits - 1 };
  }),
});
