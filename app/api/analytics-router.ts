import { z } from "zod";
import { createRouter } from "./middleware";
import { featureProcedure } from "./lib/plans";
import { getDb } from "./queries/connection";
import { orders, orderItems, menuItems, loyaltyAccounts, inventory, staffClockEvents, staffAccounts } from "@db/schema";
import { eq, and, gte, lte, desc, sql, count, isNotNull } from "drizzle-orm";

// Every analytics endpoint requires the "analytics" feature (Pro+).
const analyticsProcedure = featureProcedure("analytics");

export const analyticsRouter = createRouter({
  // Overview stats: total revenue, order count, avg order, loyalty members
  getOverview: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

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
  getDailyRevenue: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(7).max(90).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

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
  getTopItems: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
    limit: z.number().int().min(1).max(20).default(10),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

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

  // Profit by item over a period — joins sales to each item's recorded cost
  // (menu_items.cost). Items without a cost set return null profit/margin so the
  // UI can prompt the owner to fill them in. Ordered most-profitable first.
  getProfitByItem: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
    limit: z.number().int().min(1).max(50).default(15),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;
    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        itemName: orderItems.itemName,
        units: sql<string>`SUM(${orderItems.quantity})`,
        revenue: sql<string>`SUM(${orderItems.quantity}::numeric * ${orderItems.unitPrice}::numeric)`,
        unitCost: menuItems.cost,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(orderItems.itemName, menuItems.cost)
      .orderBy(sql`(SUM(${orderItems.quantity}::numeric * ${orderItems.unitPrice}::numeric) - ${menuItems.cost} * SUM(${orderItems.quantity})) DESC NULLS LAST`)
      .limit(input.limit);

    let withoutCost = 0;
    const items = rows.map(r => {
      const units = Number(r.units);
      const revenue = Number(r.revenue);
      const unitCost = r.unitCost != null ? Number(r.unitCost) : null;
      if (unitCost == null) withoutCost++;
      const profit = unitCost != null ? revenue - unitCost * units : null;
      const marginPct = profit != null && revenue > 0 ? Math.round((profit / revenue) * 100) : null;
      return {
        name: r.itemName,
        units,
        revenue: revenue.toFixed(2),
        unitCost: unitCost != null ? unitCost.toFixed(2) : null,
        profit: profit != null ? profit.toFixed(2) : null,
        marginPct,
      };
    });
    const totalProfit = items.reduce((s, i) => s + (i.profit != null ? Number(i.profit) : 0), 0);
    return { items, totalProfit: totalProfit.toFixed(2), withoutCost };
  }),

  // Hourly order distribution (heat map data)
  getHourlyDistribution: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(7).max(90).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

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
  getRevenueByCategory: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

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

  // Heatmap: quantity ordered per item per hour of day
  getItemsByHour: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        itemName: orderItems.itemName,
        hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})::int`,
        qty: sql<number>`SUM(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(orderItems.itemName, sql`EXTRACT(HOUR FROM ${orders.createdAt})::int`)
      .orderBy(orderItems.itemName, sql`EXTRACT(HOUR FROM ${orders.createdAt})::int`);

    return rows;
  }),

  // When items went sold out, grouped by item
  getSelloutEvents: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        itemName: menuItems.name,
        soldOutAt: inventory.soldOutAt,
        hour: sql<number>`EXTRACT(HOUR FROM ${inventory.soldOutAt})::int`,
      })
      .from(inventory)
      .innerJoin(menuItems, eq(menuItems.id, inventory.menuItemId))
      .where(and(
        eq(inventory.venueId, venueId),
        isNotNull(inventory.soldOutAt),
        gte(inventory.soldOutAt, since),
      ))
      .orderBy(desc(inventory.soldOutAt));

    return rows;
  }),

  // Item popularity broken down by day of week (top 10 items)
  getItemPopularityByDayOfWeek: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(60),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    // Get top 10 items by total qty first
    const topItems = await db
      .select({ itemName: orderItems.itemName })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(orderItems.itemName)
      .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
      .limit(10);

    if (topItems.length === 0) return [];

    const topNames = topItems.map(r => r.itemName);

    const rows = await db
      .select({
        itemName: orderItems.itemName,
        dow: sql<number>`EXTRACT(DOW FROM ${orders.createdAt})::int`,
        qty: sql<number>`SUM(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
        sql`${orderItems.itemName} = ANY(${sql.raw(`ARRAY[${topNames.map(n => `'${n.replace(/'/g, "''")}'`).join(",")}]`)})`,
      ))
      .groupBy(orderItems.itemName, sql`EXTRACT(DOW FROM ${orders.createdAt})::int`)
      .orderBy(orderItems.itemName, sql`EXTRACT(DOW FROM ${orders.createdAt})::int`);

    return rows;
  }),

  // Repeat customer rate
  getRepeatCustomerRate: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const [result] = await db
      .select({
        total: sql<number>`COUNT(DISTINCT customer_phone)::int`,
        repeat: sql<number>`COUNT(DISTINCT CASE WHEN order_count > 1 THEN customer_phone END)::int`,
      })
      .from(
        sql`(
          SELECT customer_phone, COUNT(*) AS order_count
          FROM ${orders}
          WHERE venue_id = ${venueId}
            AND created_at >= ${since}
            AND status != 'cancelled'
          GROUP BY customer_phone
        ) sub`
      );

    const total = Number(result.total);
    const repeat = Number(result.repeat);
    const rate = total > 0 ? Math.round((repeat / total) * 100) : 0;

    return { total, repeat, rate };
  }),

  // Revenue and count broken down by order type
  getOrderTypeBreakdown: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        orderType: orders.orderType,
        count: sql<number>`COUNT(*)::int`,
        revenue: sql<string>`COALESCE(SUM(total_amount::numeric), 0)`,
      })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(orders.orderType);

    return rows.map(r => ({
      orderType: r.orderType,
      count: Number(r.count),
      revenue: Number(r.revenue).toFixed(2),
    }));
  }),

  // Period comparison: current N days vs previous N days
  getPeriodComparison: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const now = Date.now();
    const currentStart = new Date(now - input.days * 86400000);
    const previousStart = new Date(now - input.days * 2 * 86400000);

    async function getPeriodStats(from: Date, to: Date) {
      const [result] = await db
        .select({
          revenue: sql<string>`COALESCE(SUM(total_amount::numeric), 0)`,
          orderCount: count(orders.id),
          avgOrder: sql<string>`COALESCE(AVG(total_amount::numeric), 0)`,
        })
        .from(orders)
        .where(and(
          eq(orders.venueId, venueId),
          gte(orders.createdAt, from),
          lte(orders.createdAt, to),
          sql`${orders.status} != 'cancelled'`,
        ));
      return {
        revenue: Number(result.revenue).toFixed(2),
        orders: Number(result.orderCount),
        avgOrder: Number(result.avgOrder).toFixed(2),
      };
    }

    const current = await getPeriodStats(currentStart, new Date(now));
    const previous = await getPeriodStats(previousStart, currentStart);

    function pctChange(cur: string, prev: string): string {
      const c = Number(cur);
      const p = Number(prev);
      if (p === 0) return c > 0 ? "+100.0" : "0.0";
      return ((c - p) / p * 100).toFixed(1);
    }

    return {
      current,
      previous,
      changes: {
        revenueChange: pctChange(current.revenue, previous.revenue),
        ordersChange: pctChange(String(current.orders), String(previous.orders)),
        avgOrderChange: pctChange(current.avgOrder, previous.avgOrder),
      },
    };
  }),

  // Revenue forecast for the next 7 days based on 8-week DOW averages
  getRevenueForecast: analyticsProcedure.input(z.object({
    token: z.string(),
  })).query(async ({ ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const since = new Date(Date.now() - 56 * 86400000); // 8 weeks

    const rows = await db
      .select({
        dow: sql<number>`EXTRACT(DOW FROM created_at)::int`,
        revenue: sql<string>`COALESCE(SUM(total_amount::numeric), 0)`,
        dayCount: sql<number>`COUNT(DISTINCT DATE(created_at))::int`,
      })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(sql`EXTRACT(DOW FROM created_at)::int`);

    const avgByDow: Record<number, { avg: number; weeks: number }> = {};
    for (const r of rows) {
      avgByDow[r.dow] = {
        avg: r.dayCount > 0 ? Number(r.revenue) / r.dayCount : 0,
        weeks: r.dayCount,
      };
    }

    const forecast: { date: string; predictedRevenue: string; basedOnWeeks: number }[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(Date.now() + i * 86400000);
      const dow = d.getDay();
      const dateStr = d.toISOString().slice(0, 10);
      const entry = avgByDow[dow];
      forecast.push({
        date: dateStr,
        predictedRevenue: entry ? entry.avg.toFixed(2) : "0.00",
        basedOnWeeks: entry ? entry.weeks : 0,
      });
    }

    return forecast;
  }),

  // Menu scorecard: performance of each item over the period
  getMenuScorecard: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(365).default(30),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const since = new Date(Date.now() - input.days * 86400000);
    const midpoint = new Date(Date.now() - (input.days / 2) * 86400000);

    // First half stats
    const firstHalf = await db
      .select({
        itemName: orderItems.itemName,
        qty: sql<number>`SUM(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        lte(orders.createdAt, midpoint),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(orderItems.itemName);

    // Full period stats
    const fullPeriod = await db
      .select({
        itemName: orderItems.itemName,
        totalQty: sql<number>`SUM(${orderItems.quantity})::int`,
        totalRevenue: sql<string>`SUM(${orderItems.quantity}::numeric * ${orderItems.unitPrice}::numeric)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(orderItems.itemName)
      .orderBy(sql`SUM(${orderItems.quantity}::numeric * ${orderItems.unitPrice}::numeric) DESC`)
      .limit(20);

    const totalRevenue = fullPeriod.reduce((s, r) => s + Number(r.totalRevenue), 0);
    const firstHalfMap: Record<string, number> = {};
    for (const r of firstHalf) firstHalfMap[r.itemName] = r.qty;

    return fullPeriod.map(r => {
      const firstQty = firstHalfMap[r.itemName] ?? 0;
      const secondQty = r.totalQty - firstQty;
      let trend = "0.0";
      if (firstQty > 0) trend = (((secondQty - firstQty) / firstQty) * 100).toFixed(1);
      else if (secondQty > 0) trend = "+100.0";
      return {
        name: r.itemName,
        totalQty: r.totalQty,
        totalRevenue: Number(r.totalRevenue).toFixed(2),
        avgDailyQty: (r.totalQty / input.days).toFixed(2),
        revenueShare: totalRevenue > 0 ? ((Number(r.totalRevenue) / totalRevenue) * 100).toFixed(1) : "0.0",
        trend,
      };
    });
  }),

  // GST summary for Australian tax reporting
  getGSTSummary: analyticsProcedure.input(z.object({
    token: z.string(),
    fromDate: z.string(),
    toDate: z.string(),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const rows = await db
      .select({
        paymentMethod: orders.paymentMethod,
        total: sql<string>`COALESCE(SUM(total_amount::numeric), 0)`,
        orderCount: count(orders.id),
      })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, new Date(input.fromDate)),
        lte(orders.createdAt, new Date(input.toDate + "T23:59:59")),
        sql`${orders.status} != 'cancelled'`,
      ))
      .groupBy(orders.paymentMethod);

    const totalRevenue = rows.reduce((s, r) => s + Number(r.total), 0);
    const gst = totalRevenue / 11; // AU GST: 10%, so GST component = total / 11
    const netExGst = totalRevenue - gst;

    return {
      fromDate: input.fromDate,
      toDate: input.toDate,
      totalRevenue: totalRevenue.toFixed(2),
      gst: gst.toFixed(2),
      netExGst: netExGst.toFixed(2),
      byPaymentMethod: rows.map(r => ({
        paymentMethod: r.paymentMethod,
        total: Number(r.total).toFixed(2),
        orderCount: Number(r.orderCount),
        gst: (Number(r.total) / 11).toFixed(2),
        netExGst: (Number(r.total) - Number(r.total) / 11).toFixed(2),
      })),
    };
  }),

  // Staff hours summary (from clock events)
  getStaffHoursSummary: analyticsProcedure.input(z.object({
    token: z.string(),
    days: z.number().int().min(1).max(90).default(14),
  })).query(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const since = new Date(Date.now() - input.days * 86400000);

    function getPenaltyFlag(clockedAt: Date): string | null {
      const day = clockedAt.getDay();
      const hour = clockedAt.getHours();
      if (day === 0) return "Sunday penalty (200%)";
      if (day === 6) return "Saturday penalty (125%)";
      if (hour >= 21 || hour < 6) return "Late night / early morning (125%)";
      return null;
    }

    const events = await db.select({
      staffId: staffClockEvents.staffId,
      staffName: staffAccounts.name,
      eventType: staffClockEvents.eventType,
      clockedAt: staffClockEvents.clockedAt,
    })
      .from(staffClockEvents)
      .innerJoin(staffAccounts, eq(staffClockEvents.staffId, staffAccounts.id))
      .where(and(eq(staffClockEvents.venueId, venueId), gte(staffClockEvents.clockedAt, since)))
      .orderBy(staffClockEvents.staffId, staffClockEvents.clockedAt);

    const staffMap: Record<number, { name: string; totalMinutes: number; shifts: number; penaltyFlags: string[] }> = {};
    const inEvents: Record<number, Date> = {};
    for (const e of events) {
      if (!staffMap[e.staffId]) staffMap[e.staffId] = { name: e.staffName ?? "Unknown", totalMinutes: 0, shifts: 0, penaltyFlags: [] };
      if (e.eventType === "in") {
        inEvents[e.staffId] = e.clockedAt;
        const flag = getPenaltyFlag(e.clockedAt);
        if (flag && !staffMap[e.staffId].penaltyFlags.includes(flag)) staffMap[e.staffId].penaltyFlags.push(flag);
      } else if (e.eventType === "out" && inEvents[e.staffId]) {
        const mins = Math.round((e.clockedAt.getTime() - inEvents[e.staffId].getTime()) / 60000);
        staffMap[e.staffId].totalMinutes += mins;
        staffMap[e.staffId].shifts++;
        delete inEvents[e.staffId];
      }
    }

    return Object.entries(staffMap).map(([id, data]) => ({
      staffId: Number(id),
      ...data,
      totalHours: (data.totalMinutes / 60).toFixed(1),
    }));
  }),
});
