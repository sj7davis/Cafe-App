import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { giftCards } from "@db/schema";
import { eq } from "drizzle-orm";

function generateCode(): string {
  return `B1${Math.random().toString(36).substring(2, 8).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export const giftCardRouter = createRouter({
  create: publicQuery
    .input(z.object({
      amount: z.number().min(10),
      senderName: z.string().optional(),
      recipientName: z.string().optional(),
      recipientPhone: z.string().optional(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const code = generateCode();
      await db.insert(giftCards).values({
        code,
        amount: input.amount.toString(),
        balance: input.amount.toString(),
        senderName: input.senderName || null,
        recipientName: input.recipientName || null,
        recipientPhone: input.recipientPhone || null,
        message: input.message || null,
      });
      return { code };
    }),

  checkBalance: publicQuery
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [card] = await db.select().from(giftCards).where(eq(giftCards.code, input.code)).limit(1);
      if (!card) return null;
      return { ...card, amount: parseFloat(card.amount), balance: parseFloat(card.balance) };
    }),

  redeem: publicQuery
    .input(z.object({ code: z.string(), amount: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [card] = await db.select().from(giftCards).where(eq(giftCards.code, input.code)).limit(1);
      if (!card || card.isRedeemed) throw new Error("Invalid or redeemed gift card");
      const balance = parseFloat(card.balance);
      if (balance < input.amount) throw new Error("Insufficient balance");
      await db.update(giftCards).set({
        balance: (balance - input.amount).toString(),
        isRedeemed: balance - input.amount <= 0,
      }).where(eq(giftCards.id, card.id));
      return { newBalance: balance - input.amount };
    }),
});
