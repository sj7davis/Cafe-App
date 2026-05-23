import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { customerPreferences } from "@db/schema";
import { eq } from "drizzle-orm";

export const preferencesRouter = createRouter({
  get: publicQuery.input(z.object({ phone: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const [pref] = await db.select().from(customerPreferences).where(eq(customerPreferences.phone, input.phone)).limit(1);
    return pref || null;
  }),
  set: publicQuery.input(z.object({
    phone: z.string(), milk: z.string().optional(), temperature: z.string().optional(),
    sugar: z.string().optional(), notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const [existing] = await db.select().from(customerPreferences).where(eq(customerPreferences.phone, input.phone)).limit(1);
    if (existing) {
      await db.update(customerPreferences).set({
        milk: input.milk || existing.milk, temperature: input.temperature || existing.temperature,
        sugar: input.sugar || existing.sugar, notes: input.notes || existing.notes,
      }).where(eq(customerPreferences.id, existing.id));
    } else {
      await db.insert(customerPreferences).values({ phone: input.phone, milk: input.milk, temperature: input.temperature, sugar: input.sugar, notes: input.notes });
    }
    return { success: true };
  }),
});
