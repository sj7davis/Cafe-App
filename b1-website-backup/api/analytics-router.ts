import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, menuItems } from "@db/schema";
import { gte, desc, sql } from "drizzle-orm";

export const analyticsRouter = createRouter({
  dashboard: publicQuery.query(async () => {
    const db = getDb();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayOrders = await db.select().from(orders).where(gte(orders.createdAt, startOfDay));
    const weekOrders = await db.select().from(orders).where(gte(orders.createdAt, startOfWeek));

    const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const weekRevenue = weekOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0);

    const allOrderItems = await db.select().from(orderItems).orderBy(desc(orderItems.createdAt));
    const itemCounts: Record<string, number> = {};
    for (const oi of allOrderItems) {
      itemCounts[oi.itemName] = (itemCounts[oi.itemName] || 0) + oi.quantity;
    }
    const topItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const statusCounts = {
      pending: todayOrders.filter((o) => o.status === "pending").length,
      confirmed: todayOrders.filter((o) => o.status === "confirmed").length,
      ready: todayOrders.filter((o) => o.status === "ready").length,
      completed: todayOrders.filter((o) => o.status === "completed").length,
    };

    const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

    return {
      today: { orders: todayOrders.length, revenue: todayRevenue, avgOrderValue },
      week: { orders: weekOrders.length, revenue: weekRevenue },
      topItems,
      statusCounts,
    };
  }),
});
