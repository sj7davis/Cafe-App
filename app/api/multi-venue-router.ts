import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { venues, venueOwners, orders } from "@db/schema";
import { eq, gte, and, sql } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const multiVenueRouter = createRouter({
  // Get all venues owned by this owner (cross-venue dashboard)
  getAllVenues: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const ownerId = payload.payload.ownerId as number;
    const db = getDb();

    const ownerVenues = await db.select({
      venueId: venueOwners.venueId,
      role: venueOwners.role,
    }).from(venueOwners).where(eq(venueOwners.id, ownerId));

    const venueIds = ownerVenues.map(v => v.venueId);
    if (venueIds.length === 0) return { venues: [] };

    const venueList = await db.select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      subscriptionTier: venues.subscriptionTier,
      address: venues.address,
    }).from(venues).where(sql`${venues.id} = ANY(ARRAY[${sql.join(venueIds.map(id => sql`${id}`), sql`, `)}]::integer[])`);

    return { venues: venueList };
  }),

  // Consolidated revenue across all owned venues
  getConsolidatedRevenue: publicQuery.input(z.object({
    token: z.string(),
    days: z.number().default(30),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const ownerId = payload.payload.ownerId as number;
    const db = getDb();

    const ownerVenues = await db.select({ venueId: venueOwners.venueId })
      .from(venueOwners).where(eq(venueOwners.id, ownerId));
    const venueIds = ownerVenues.map(v => v.venueId);
    if (venueIds.length === 0) return { total: 0, byVenue: [] };

    const since = new Date(Date.now() - input.days * 86400000);
    const allOrders = await db.select({
      venueId: orders.venueId,
      total: orders.totalAmount,
      status: orders.status,
      createdAt: orders.createdAt,
    }).from(orders)
      .where(and(
        sql`${orders.venueId} = ANY(ARRAY[${sql.join(venueIds.map(id => sql`${id}`), sql`, `)}]::integer[])`,
        gte(orders.createdAt, since),
        eq(orders.status, "completed")
      ));

    const byVenue: Record<number, { venueId: number; orderCount: number; revenue: number }> = {};
    for (const o of allOrders) {
      if (!byVenue[o.venueId]) byVenue[o.venueId] = { venueId: o.venueId, orderCount: 0, revenue: 0 };
      byVenue[o.venueId].orderCount++;
      byVenue[o.venueId].revenue += Number(o.total || 0);
    }

    const byVenueArr = Object.values(byVenue).sort((a, b) => b.revenue - a.revenue);
    const total = byVenueArr.reduce((s, v) => s + v.revenue, 0);

    return { total, byVenue: byVenueArr, days: input.days };
  }),

  // Side-by-side comparison across venues
  getVenueComparison: publicQuery.input(z.object({
    token: z.string(),
    days: z.number().default(7),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const ownerId = payload.payload.ownerId as number;
    const db = getDb();

    const ownerVenues = await db.select({ venueId: venueOwners.venueId })
      .from(venueOwners).where(eq(venueOwners.id, ownerId));
    const venueIds = ownerVenues.map(v => v.venueId);
    if (venueIds.length === 0) return { venues: [] };

    const since = new Date(Date.now() - input.days * 86400000);
    const prevSince = new Date(Date.now() - input.days * 2 * 86400000);

    const venueList = await db.select({ id: venues.id, name: venues.name, slug: venues.slug })
      .from(venues)
      .where(sql`${venues.id} = ANY(ARRAY[${sql.join(venueIds.map(id => sql`${id}`), sql`, `)}]::integer[])`);

    const currentOrders = await db.select({ venueId: orders.venueId, total: orders.totalAmount })
      .from(orders)
      .where(and(
        sql`${orders.venueId} = ANY(ARRAY[${sql.join(venueIds.map(id => sql`${id}`), sql`, `)}]::integer[])`,
        gte(orders.createdAt, since),
        eq(orders.status, "completed")
      ));

    const prevOrders = await db.select({ venueId: orders.venueId, total: orders.totalAmount })
      .from(orders)
      .where(and(
        sql`${orders.venueId} = ANY(ARRAY[${sql.join(venueIds.map(id => sql`${id}`), sql`, `)}]::integer[])`,
        gte(orders.createdAt, prevSince),
        sql`${orders.createdAt} < ${since}`,
        eq(orders.status, "completed")
      ));

    const result = venueList.map(v => {
      const curr = currentOrders.filter(o => o.venueId === v.id);
      const prev = prevOrders.filter(o => o.venueId === v.id);
      const currRevenue = curr.reduce((s, o) => s + Number(o.total || 0), 0);
      const prevRevenue = prev.reduce((s, o) => s + Number(o.total || 0), 0);
      const change = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      return {
        venueId: v.id,
        name: v.name,
        slug: v.slug,
        currentRevenue: currRevenue,
        previousRevenue: prevRevenue,
        orderCount: curr.length,
        revenueChange: Math.round(change * 10) / 10,
      };
    });

    return { venues: result, days: input.days };
  }),
});
