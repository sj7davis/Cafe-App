import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, protectedProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { discountCodes, referralCodes, loyaltyAccounts } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
}

export const promoRouter = createRouter({
  // ─── Discount Codes ───

  // Public: validate a discount code at checkout
  validateDiscount: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    code: z.string().min(1),
    orderAmount: z.number().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(discountCodes)
      .where(and(
        eq(discountCodes.venueId, input.venueId),
        eq(discountCodes.code, input.code.toUpperCase()),
        eq(discountCodes.isActive, true),
      ))
      .limit(1);

    const dc = results[0];
    if (!dc) throw new TRPCError({ code: "NOT_FOUND", message: "Discount code not found or inactive" });

    // Check expiry
    if (dc.expiresAt && new Date(dc.expiresAt) < new Date()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This discount code has expired" });
    }

    // Check max uses
    if (dc.maxUses !== null && dc.usedCount >= dc.maxUses) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This discount code has reached its usage limit" });
    }

    // Check minimum order
    if (dc.minOrderAmount && input.orderAmount < Number(dc.minOrderAmount)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Minimum order of $${Number(dc.minOrderAmount).toFixed(2)} required`,
      });
    }

    let discountAmount: number;
    if (dc.type === "percentage") {
      discountAmount = Number(((input.orderAmount * Number(dc.value)) / 100).toFixed(2));
    } else {
      discountAmount = Math.min(Number(dc.value), input.orderAmount);
    }

    return {
      valid: true,
      type: dc.type,
      value: Number(dc.value),
      discountAmount: Number(discountAmount.toFixed(2)),
      description: dc.type === "percentage"
        ? `${dc.value}% off`
        : `$${Number(dc.value).toFixed(2)} off`,
    };
  }),

  // Internal: increment usedCount after order placed (called server-side)
  markDiscountUsed: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    code: z.string().min(1),
  })).mutation(async ({ input }) => {
    const db = getDb();
    await db.update(discountCodes)
      .set({ usedCount: sql`used_count + 1` })
      .where(and(
        eq(discountCodes.venueId, input.venueId),
        eq(discountCodes.code, input.code.toUpperCase()),
      ));
    return { success: true };
  }),

  // Owner: list all discount codes
  listDiscountCodes: protectedProcedure.input(z.object({
    token: z.string(),
  })).query(async ({ ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;
    return db.select().from(discountCodes)
      .where(eq(discountCodes.venueId, venueId))
      .orderBy(desc(discountCodes.createdAt));
  }),

  // Owner: create discount code
  createDiscountCode: protectedProcedure.input(z.object({
    token: z.string(),
    code: z.string().min(3).max(32).transform(s => s.toUpperCase()),
    type: z.enum(["percentage", "fixed"]),
    value: z.number().positive(),
    minOrderAmount: z.number().positive().optional(),
    maxUses: z.number().int().positive().optional(),
    expiresAt: z.string().optional(), // ISO string
  })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    // Check uniqueness
    const existing = await db.select().from(discountCodes)
      .where(and(eq(discountCodes.venueId, venueId), eq(discountCodes.code, input.code)))
      .limit(1);
    if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Code already exists" });

    const [result] = await db.insert(discountCodes).values({
      venueId,
      code: input.code,
      type: input.type,
      value: String(input.value),
      minOrderAmount: input.minOrderAmount ? String(input.minOrderAmount) : null,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: true,
    }).returning({ id: discountCodes.id });

    return { success: true, id: result.id };
  }),

  // Owner: toggle active/inactive
  toggleDiscountCode: protectedProcedure.input(z.object({
    token: z.string(),
    id: z.number().int().positive(),
    isActive: z.boolean(),
  })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    await db.update(discountCodes)
      .set({ isActive: input.isActive })
      .where(and(eq(discountCodes.id, input.id), eq(discountCodes.venueId, venueId)));
    return { success: true };
  }),

  // Owner: delete discount code
  deleteDiscountCode: protectedProcedure.input(z.object({
    token: z.string(),
    id: z.number().int().positive(),
  })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    await db.delete(discountCodes)
      .where(and(eq(discountCodes.id, input.id), eq(discountCodes.venueId, venueId)));
    return { success: true };
  }),

  // ─── Referral Codes ───

  // Public: get or create referral code for a phone number
  getOrCreateReferralCode: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string().min(1),
    name: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const existing = await db.select().from(referralCodes)
      .where(and(
        eq(referralCodes.venueId, input.venueId),
        eq(referralCodes.referrerPhone, input.phone),
      ))
      .limit(1);
    if (existing[0]) return existing[0];

    let code: string;
    let tries = 0;
    do {
      code = generateReferralCode();
      const conflict = await db.select().from(referralCodes)
        .where(and(eq(referralCodes.venueId, input.venueId), eq(referralCodes.code, code)))
        .limit(1);
      if (!conflict[0]) break;
      tries++;
    } while (tries < 10);

    const [result] = await db.insert(referralCodes).values({
      venueId: input.venueId,
      code: code!,
      referrerPhone: input.phone,
      referrerName: input.name ?? null,
    }).returning();

    return result;
  }),

  // Public: validate a referral code at signup
  validateReferralCode: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    code: z.string().min(1),
  })).query(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(referralCodes)
      .where(and(
        eq(referralCodes.venueId, input.venueId),
        eq(referralCodes.code, input.code.toUpperCase()),
      ))
      .limit(1);
    const ref = results[0];
    if (!ref) return { valid: false };
    return { valid: true, referrerName: ref.referrerName, code: ref.code };
  }),

  // Internal: record referral use and award bonus points to both parties
  useReferralCode: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    code: z.string().min(1),
    newUserPhone: z.string().min(1),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const ref = await db.select().from(referralCodes)
      .where(and(
        eq(referralCodes.venueId, input.venueId),
        eq(referralCodes.code, input.code.toUpperCase()),
      ))
      .limit(1);
    if (!ref[0]) return { success: false };

    // Increment use count
    await db.update(referralCodes)
      .set({ uses: sql`uses + 1` })
      .where(eq(referralCodes.id, ref[0].id));

    // Award 100 bonus points to referrer
    const referrerAcc = await db.select().from(loyaltyAccounts)
      .where(and(
        eq(loyaltyAccounts.venueId, input.venueId),
        eq(loyaltyAccounts.phone, ref[0].referrerPhone),
      ))
      .limit(1);

    if (referrerAcc[0]) {
      await db.update(loyaltyAccounts)
        .set({
          pointsBalance: referrerAcc[0].pointsBalance + 100,
          totalLifetimePoints: referrerAcc[0].totalLifetimePoints + 100,
        })
        .where(eq(loyaltyAccounts.id, referrerAcc[0].id));
    }

    return { success: true, bonusPointsForNewUser: 50 };
  }),

  // Owner: list referral codes
  listReferralCodes: protectedProcedure.input(z.object({
    token: z.string(),
  })).query(async ({ ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;
    return db.select().from(referralCodes)
      .where(eq(referralCodes.venueId, venueId))
      .orderBy(desc(referralCodes.uses));
  }),
});
