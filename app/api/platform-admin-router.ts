import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { venues, platformAdmins, orders, menuItems } from "@db/schema";
import { eq, count, desc } from "drizzle-orm";
import { compare } from "bcrypt-ts";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.platformAdminSecret);

export const platformAdminRouter = createRouter({
  login: publicQuery.input(z.object({
    email: z.string().email(),
    password: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(platformAdmins).where(eq(platformAdmins.email, input.email)).limit(1);
    const admin = results[0];
    if (!admin) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

    const valid = await compare(input.password, admin.passwordHash);
    if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

    const token = await new SignJWT({ adminId: admin.id, role: admin.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    return { token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } };
  }),

  me: publicQuery.input(z.object({ token: z.string() }).optional()).query(async ({ input }) => {
    if (!input?.token) return null;
    try {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const db = getDb();
      const results = await db.select().from(platformAdmins).where(eq(platformAdmins.id, payload.payload.adminId as number)).limit(1);
      const admin = results[0];
      if (!admin) return null;
      return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
    } catch { return null; }
  }),

  stats: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getDb();

    const totalVenues = await db.select({ count: count() }).from(venues);
    const activeVenues = await db.select({ count: count() }).from(venues).where(eq(venues.isActive, true));
    const trialVenues = await db.select({ count: count() }).from(venues).where(eq(venues.subscriptionStatus, "trial"));
    const totalOrders = await db.select({ count: count() }).from(orders);
    const totalMenuItems = await db.select({ count: count() }).from(menuItems);

    const tierBreakdown = await db.select({
      tier: venues.subscriptionTier,
      count: count(),
    }).from(venues).groupBy(venues.subscriptionTier);

    const recentVenues = await db.select().from(venues).orderBy(desc(venues.createdAt)).limit(10);

    return {
      totalVenues: totalVenues[0]?.count ?? 0,
      activeVenues: activeVenues[0]?.count ?? 0,
      trialVenues: trialVenues[0]?.count ?? 0,
      totalOrders: totalOrders[0]?.count ?? 0,
      totalMenuItems: totalMenuItems[0]?.count ?? 0,
      tierBreakdown,
      recentVenues: recentVenues.map(v => {
        const { squareAccessToken, squareRefreshToken, stripeCustomerId, stripeSubscriptionId, ...safe } = v;
        return safe;
      }),
    };
  }),

  listVenues: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getDb();
    const all = await db.select().from(venues).orderBy(desc(venues.createdAt));
    return all.map(v => {
      const { squareAccessToken, squareRefreshToken, stripeCustomerId, stripeSubscriptionId, ...safe } = v;
      return safe;
    });
  }),

  updateVenue: publicQuery.input(z.object({
    token: z.string(),
    venueId: z.number(),
    data: z.object({
      isActive: z.boolean().optional(),
      subscriptionStatus: z.enum(["trial", "active", "past_due", "cancelled"]).optional(),
      subscriptionTier: z.enum(["starter", "pro", "enterprise"]).optional(),
    }),
  })).mutation(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getDb();
    await db.update(venues).set(input.data).where(eq(venues.id, input.venueId));
    return { success: true };
  }),
});
