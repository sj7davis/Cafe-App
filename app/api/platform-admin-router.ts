import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
// Auth/identity router: uses the system (RLS-bypassing) connection via
// getSystemDb. These procedures verify their own token and filter explicitly by
// id/venueId, and several run before a venue scope exists (login, password
// reset) or legitimately span venues (platform admin), so they must not be
// constrained by Row-Level Security.
import { getSystemDb } from "./queries/connection";
import { venues, platformAdmins, orders, menuItems, franchiseePayouts } from "@db/schema";
import { eq, count, desc, sum } from "drizzle-orm";
import { compare } from "bcrypt-ts";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./lib/env";
import { exportVenue as buildVenueExport, purgeVenue } from "./lib/tenant-lifecycle";

const JWT_SECRET = new TextEncoder().encode(env.platformAdminSecret);

export const platformAdminRouter = createRouter({
  login: publicQuery.input(z.object({
    email: z.string().email(),
    password: z.string(),
  })).mutation(async ({ input }) => {
    const db = getSystemDb();
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
      const db = getSystemDb();
      const results = await db.select().from(platformAdmins).where(eq(platformAdmins.id, payload.payload.adminId as number)).limit(1);
      const admin = results[0];
      if (!admin) return null;
      return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
    } catch { return null; }
  }),

  stats: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getSystemDb();

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
    const db = getSystemDb();
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
    const db = getSystemDb();
    await db.update(venues).set(input.data).where(eq(venues.id, input.venueId));
    return { success: true };
  }),

  // ─── Tenant lifecycle ──────────────────────────────────────────────────────
  // Suspend: block all access immediately; reversible. Reactivate: restore.
  suspendVenue: publicQuery.input(z.object({ token: z.string(), venueId: z.number() })).mutation(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getSystemDb();
    await db.update(venues).set({ isActive: false }).where(eq(venues.id, input.venueId));
    return { success: true };
  }),

  reactivateVenue: publicQuery.input(z.object({ token: z.string(), venueId: z.number() })).mutation(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getSystemDb();
    await db.update(venues).set({ isActive: true }).where(eq(venues.id, input.venueId));
    return { success: true };
  }),

  // Soft offboard: stop access and billing but keep the data (reversible by
  // reactivating). A hard data purge is a separate, deliberate operation.
  offboardVenue: publicQuery.input(z.object({ token: z.string(), venueId: z.number() })).mutation(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getSystemDb();
    await db.update(venues).set({ isActive: false, subscriptionStatus: "cancelled" }).where(eq(venues.id, input.venueId));
    return { success: true };
  }),

  // Full secret-redacted JSON export of a venue's data (portability / archival).
  exportVenue: publicQuery.input(z.object({ token: z.string(), venueId: z.number() })).query(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    return buildVenueExport(input.venueId);
  }),

  // Hard, irreversible erasure of a venue and all its data (GDPR right to be
  // forgotten). Requires the venue's slug as confirmation. Export first.
  purgeVenue: publicQuery.input(z.object({
    token: z.string(),
    venueId: z.number(),
    confirmSlug: z.string(),
  })).mutation(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getSystemDb();
    const rows = await db.select({ slug: venues.slug }).from(venues).where(eq(venues.id, input.venueId)).limit(1);
    if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
    if (rows[0].slug !== input.confirmSlug) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmation does not match the venue slug" });
    }
    const result = await purgeVenue(input.venueId);
    return { success: true, ...result };
  }),

  // Aggregate platform fees collected per venue and in total (platform admin only)
  platformFees: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const db = getSystemDb();

    // Total platform fee across all payouts
    const [totalRow] = await db
      .select({ total: sum(franchiseePayouts.platformFee) })
      .from(franchiseePayouts);
    const totalPlatformFee = Number(totalRow?.total ?? 0);

    // Per-venue breakdown
    const byVenueRows = await db
      .select({
        venueId: franchiseePayouts.venueId,
        platformFee: sum(franchiseePayouts.platformFee),
        payoutCount: count(franchiseePayouts.id),
      })
      .from(franchiseePayouts)
      .groupBy(franchiseePayouts.venueId);

    // Join venue names
    let venueNames: Record<number, string> = {};
    if (byVenueRows.length > 0) {
      const allVenueRows = await db.select({ id: venues.id, name: venues.name }).from(venues);
      venueNames = Object.fromEntries(allVenueRows.map(v => [v.id, v.name]));
    }

    const byVenue = byVenueRows.map(r => ({
      venueId: r.venueId,
      venueName: venueNames[r.venueId] ?? `Venue ${r.venueId}`,
      platformFee: Number(r.platformFee ?? 0),
      payoutCount: Number(r.payoutCount ?? 0),
    }));

    return { totalPlatformFee, byVenue };
  }),
});
