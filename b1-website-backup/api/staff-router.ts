import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems } from "@db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export const staffRouter = createRouter({
  activeOrders: publicQuery.query(async () => {
    const db = getDb();
    const activeStatuses = ["pending", "confirmed", "ready"];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const activeOrders = await db
      .select()
      .from(orders)
      .where(gte(orders.createdAt, since))
      .orderBy(desc(orders.createdAt));

    const filtered = activeOrders.filter((o) => activeStatuses.includes(o.status));

    const ordersWithItems = await Promise.all(
      filtered.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return {
          ...order,
          totalAmount: parseFloat(order.totalAmount),
          items: items.map((i) => ({ ...i, unitPrice: parseFloat(i.unitPrice) })),
        };
      })
    );

    return ordersWithItems;
  }),

  updateStatus: publicQuery
    .input(z.object({ orderId: z.number(), status: z.enum(["pending", "confirmed", "ready", "completed", "cancelled"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(orders).set({ status: input.status }).where(eq(orders.id, input.orderId));
      return { success: true };
    }),

  addStaffNote: publicQuery
    .input(z.object({ orderId: z.number(), note: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(orders).set({ staffNote: input.note }).where(eq(orders.id, input.orderId));
      return { success: true };
    }),

  todayStats: publicQuery.query(async () => {
    const db = getDb();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayOrders = await db.select().from(orders).where(gte(orders.createdAt, startOfDay));
    const totalRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
    return {
      orderCount: todayOrders.length,
      totalRevenue,
      pendingCount: todayOrders.filter((o) => o.status === "pending").length,
      readyCount: todayOrders.filter((o) => o.status === "ready").length,
      completedCount: todayOrders.filter((o) => o.status === "completed").length,
    };
  }),

  allOrders: publicQuery.query(async () => {
    const db = getDb();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const allOrders = await db.select().from(orders).where(gte(orders.createdAt, since)).orderBy(desc(orders.createdAt));
    const allItems = await db.select().from(orderItems);
    return allOrders.map((order) => ({
      ...order,
      totalAmount: parseFloat(order.totalAmount),
      items: allItems.filter((i) => i.orderId === order.id).map((i) => ({ ...i, unitPrice: parseFloat(i.unitPrice) })),
    }));
  }),
});
