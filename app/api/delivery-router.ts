import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { deliveryOrders } from "@db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const deliveryRouter = createRouter({
  list: publicQuery.input(z.object({
    token: z.string(),
    platform: z.enum(["uber_eats", "doordash", "menulog", "manual", "all"]).default("all"),
    days: z.number().default(30),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const since = new Date(Date.now() - input.days * 86400000);
    const conditions: any[] = [eq(deliveryOrders.venueId, venueId), gte(deliveryOrders.orderedAt, since)];
    if (input.platform !== "all") conditions.push(eq(deliveryOrders.platform, input.platform));
    return db.select().from(deliveryOrders).where(and(...conditions)).orderBy(desc(deliveryOrders.orderedAt)).limit(200);
  }),

  create: publicQuery.input(z.object({
    token: z.string(),
    platform: z.enum(["uber_eats", "doordash", "menulog", "manual"]),
    externalId: z.string().optional(),
    customerName: z.string().optional(),
    itemsJson: z.string(),
    subtotal: z.string(),
    platformFee: z.string().default("0"),
    notes: z.string().optional(),
    orderedAt: z.string().optional(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const netRevenue = String((Number(input.subtotal) - Number(input.platformFee)).toFixed(2));
    const [result] = await db.insert(deliveryOrders).values({
      venueId,
      platform: input.platform,
      externalId: input.externalId,
      customerName: input.customerName,
      itemsJson: input.itemsJson,
      subtotal: input.subtotal,
      platformFee: input.platformFee,
      netRevenue,
      notes: input.notes,
      orderedAt: input.orderedAt ? new Date(input.orderedAt) : new Date(),
    }).returning({ id: deliveryOrders.id });
    return { id: result.id };
  }),

  updateStatus: publicQuery.input(z.object({
    token: z.string(),
    id: z.number(),
    status: z.enum(["received", "preparing", "ready", "picked_up", "cancelled"]),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    await db.update(deliveryOrders).set({ status: input.status })
      .where(and(eq(deliveryOrders.id, input.id), eq(deliveryOrders.venueId, venueId)));
    return { ok: true };
  }),

  getSummary: publicQuery.input(z.object({ token: z.string(), days: z.number().default(30) })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const since = new Date(Date.now() - input.days * 86400000);
    const rows = await db.select().from(deliveryOrders)
      .where(and(eq(deliveryOrders.venueId, venueId), gte(deliveryOrders.orderedAt, since)));
    const byPlatform: Record<string, { count: number; revenue: number; fees: number }> = {};
    for (const row of rows) {
      if (!byPlatform[row.platform]) byPlatform[row.platform] = { count: 0, revenue: 0, fees: 0 };
      byPlatform[row.platform].count++;
      byPlatform[row.platform].revenue += Number(row.netRevenue);
      byPlatform[row.platform].fees += Number(row.platformFee);
    }
    return { byPlatform, totalOrders: rows.length, totalRevenue: rows.reduce((s, r) => s + Number(r.netRevenue), 0) };
  }),
});
