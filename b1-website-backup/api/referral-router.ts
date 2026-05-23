import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { referralCodes, loyaltyAccounts } from "@db/schema";
import { eq } from "drizzle-orm";

function genCode(): string {
  return `B1R${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

export const referralRouter = createRouter({
  getOrCreate: publicQuery.input(z.object({ phone: z.string(), name: z.string().optional() })).query(async ({ input }) => {
    const db = getDb();
    const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.referrerPhone, input.phone)).limit(1);
    if (existing) return existing;
    await db.insert(referralCodes).values({ code: genCode(), referrerPhone: input.phone, referrerName: input.name || null });
    const [newCode] = await db.select().from(referralCodes).where(eq(referralCodes.referrerPhone, input.phone)).limit(1);
    return newCode;
  }),
  trackUse: publicQuery.input(z.object({ code: z.string(), newCustomerPhone: z.string() })).mutation(async ({ input }) => {
    const db = getDb();
    const [code] = await db.select().from(referralCodes).where(eq(referralCodes.code, input.code)).limit(1);
    if (!code) throw new Error("Invalid code");
    await db.update(referralCodes).set({ uses: code.uses + 1, creditEarned: (parseFloat(code.creditEarned) + 5).toString() }).where(eq(referralCodes.id, code.id));
    let [acct] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.phone, code.referrerPhone)).limit(1);
    if (!acct) { await db.insert(loyaltyAccounts).values({ phone: code.referrerPhone, name: code.referrerName }); [acct] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.phone, code.referrerPhone)).limit(1); }
    await db.update(loyaltyAccounts).set({ referralCredit: (parseFloat(acct.referralCredit) + 5).toString() }).where(eq(loyaltyAccounts.id, acct.id));
    return { success: true, creditEarned: parseFloat(code.creditEarned) + 5 };
  }),
});
