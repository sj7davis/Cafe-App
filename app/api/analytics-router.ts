import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, menuItems, loyaltyAccounts } from "@db/schema";
import { eq, and, gte, lte, desc, sql, count, sum } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const analyticsRouter = createRouter({
  // Overview stats: total revenue, order count, avg order, loyalty members
  getOverview: publicQuery.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const [revenue] = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(total_amount::numeric), 0)`,
        orderCount: count(orders.id),
        avgOrder: sql<string>`COALESCE(AVG(total_amount::numeric), 0)`,
      })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`status != 'cancelled'`,
      ));

    const [loyaltyCount] = await db
      .select({ count: count(loyaltyAccounts.id) })
      .from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.venueId, venueId));

    return {
      totalRevenue: Number(revenue.totalRevenue).toFixed(2),
      orderCount: Number(revenue.orderCount),
      avgOrder: Number(revenue.avgOrder).toFixed(2),
      loyaltyMembers: Number(loyaltyCount.count),
    };
  }),

  // Daily revenue chart data (last N days)
  getDailyRevenue: publicQuery.input(z.object({
    token: z.string(),
    days: z.number().int().min(7).max(90).default(30),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        revenue: sql<string>`COALESCE(SUM(total_amount::numeric), 0)`,
        orderCount: count(orders.id),
      })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`status != 'cancelled'`,
      ))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    return rows.map(r => ({
      date: r.date,
      revenue: Number(r.revenue).toFixed(2),
      orders: Number(r.orderCount),
    }));
  }),

  // Top selling items
  getTopItems: publicQuery.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
    limit: z.number().int().min(1).max(20).default(10),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        itemName: orderItems.itemName,
        totalQuantity: sql<string>`SUM(quantity)`,
        totalRevenue: sql<string>`SUM(quantity::numeric * unit_price::numeric)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(orderItems.itemName)
      .orderBy(sql`SUM(quantity) DESC`)
      .limit(input.limit);

    return rows.map(r => ({
      name: r.itemName,
      quantity: Number(r.totalQuantity),
      revenue: Number(r.totalRevenue).toFixed(2),
    }));
  }),

  // Hourly order distribution (heat map data)
  getHourlyDistribution: publicQuery.input(z.object({
    token: z.string(),
    days: z.number().int().min(7).max(90).default(30),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        hour: sql<string>`EXTRACT(HOUR FROM created_at)::int`,
        orderCount: count(orders.id),
      })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`status != 'cancelled'`,
      ))
      .groupBy(sql`EXTRACT(HOUR FROM created_at)::int`)
      .orderBy(sql`EXTRACT(HOUR FROM created_at)::int`);

    // Fill in all 24 hours (zeros for hours with no orders)
    const map: Record<number, number> = {};
    rows.forEach(r => { map[Number(r.hour)] = Number(r.orderCount); });
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`,
      orders: map[h] ?? 0,
    }));
  }),

  // Revenue by category
  getRevenueByCategory: publicQuery.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        category: menuItems.category,
        revenue: sql<string>`SUM(${orderItems.quantity}::numeric * ${orderItems.unitPrice}::numeric)`,
        quantity: sql<string>`SUM(${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(menuItems.category);

    return rows.map(r => ({
      category: r.category,
      revenue: Number(r.revenue).toFixed(2),
      quantity: Number(r.quantity),
    }));
  }),
});
