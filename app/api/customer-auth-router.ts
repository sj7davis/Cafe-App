import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { customerAccounts, loyaltyAccounts, favouriteOrders } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { hash, compare } from "bcrypt-ts";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const customerAuthRouter = createRouter({
  register: publicQuery.input(z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    phone: z.string().optional(),
    venueId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();

    // Check email uniqueness within venue
    const existing = await db.select({ id: customerAccounts.id })
      .from(customerAccounts)
      .where(and(eq(customerAccounts.email, input.email), eq(customerAccounts.venueId, input.venueId)))
      .limit(1);
    if (existing.length > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "Email already registered for this venue" });
    }

    const passwordHash = await hash(input.password, 10);
    const [row] = await db.insert(customerAccounts).values({
      venueId: input.venueId,
      email: input.email,
      passwordHash,
      name: input.name ?? null,
      phone: input.phone ?? null,
    }).returning({ id: customerAccounts.id });

    const token = await new SignJWT({ customerId: row.id, venueId: input.venueId, email: input.email })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("90d")
      .sign(JWT_SECRET);

    return { token, customerId: row.id };
  }),

  login: publicQuery.input(z.object({
    email: z.string().email(),
    password: z.string(),
    venueId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();

    const results = await db.select().from(customerAccounts)
      .where(and(eq(customerAccounts.email, input.email), eq(customerAccounts.venueId, input.venueId)))
      .limit(1);
    const account = results[0];
    if (!account) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    const valid = await compare(input.password, account.passwordHash);
    if (!valid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    const token = await new SignJWT({ customerId: account.id, venueId: account.venueId, email: account.email })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("90d")
      .sign(JWT_SECRET);

    await db.update(customerAccounts).set({ lastLoginAt: new Date() }).where(eq(customerAccounts.id, account.id));

    return {
      token,
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        phone: account.phone,
      },
    };
  }),

  me: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    try {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const customerId = payload.payload.customerId as number;
      const venueId = payload.payload.venueId as number;
      const db = getDb();

      const results = await db.select().from(customerAccounts)
        .where(eq(customerAccounts.id, customerId))
        .limit(1);
      const account = results[0];
      if (!account) throw new TRPCError({ code: "UNAUTHORIZED", message: "Account not found" });

      // Fetch linked loyalty account by phone
      let loyaltyBalance: number | null = null;
      if (account.phone) {
        const loyaltyResults = await db.select({ pointsBalance: loyaltyAccounts.pointsBalance })
          .from(loyaltyAccounts)
          .where(and(eq(loyaltyAccounts.venueId, venueId), eq(loyaltyAccounts.phone, account.phone)))
          .limit(1);
        loyaltyBalance = loyaltyResults[0]?.pointsBalance ?? null;
      }

      return {
        id: account.id,
        email: account.email,
        name: account.name,
        phone: account.phone,
        createdAt: account.createdAt,
        loyaltyBalance,
      };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
    }
  }),

  updateProfile: publicQuery.input(z.object({
    token: z.string(),
    name: z.string().optional(),
    phone: z.string().optional(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const customerId = payload.payload.customerId as number;
    const db = getDb();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;

    if (Object.keys(updateData).length === 0) {
      return { success: true };
    }

    await db.update(customerAccounts).set(updateData).where(eq(customerAccounts.id, customerId));
    return { success: true };
  }),

  getFavourites: publicQuery.input(z.object({
    token: z.string(),
    venueId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getDb();
    const customerId = payload.payload.customerId as number;

    // Get the customer's phone to look up favourites
    const accountRows = await db.select({ phone: customerAccounts.phone })
      .from(customerAccounts)
      .where(eq(customerAccounts.id, customerId))
      .limit(1);
    const phone = accountRows[0]?.phone;
    if (!phone) return [];

    return db.select()
      .from(favouriteOrders)
      .where(and(
        eq(favouriteOrders.venueId, input.venueId),
        eq(favouriteOrders.customerPhone, phone),
      ))
      .orderBy(desc(favouriteOrders.lastUsedAt))
      .limit(10);
  }),

  updatePushPreferences: publicQuery.input(z.object({
    token: z.string(),
    pushEnabled: z.boolean(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const customerId = payload.payload.customerId as number;
    const db = getDb();

    await db.update(customerAccounts)
      .set({ marketingOptIn: input.pushEnabled })
      .where(eq(customerAccounts.id, customerId));

    return { ok: true };
  }),
});
