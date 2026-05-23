import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems } from "@db/schema";
import { eq, desc } from "drizzle-orm";

function generateOrderNumber(): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `B1-${Date.now().toString(36).toUpperCase().slice(-4)}${random}`;
}

export const orderRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        customerName: z.string().min(1),
        customerPhone: z.string().min(6),
        pickupTime: z.string(),
        orderNote: z.string().optional(),
        paymentMethod: z.enum(["online", "pickup"]).default("pickup"),
        items: z.array(
          z.object({
            menuItemId: z.number(),
            itemName: z.string(),
            quantity: z.number().min(1),
            unitPrice: z.number(),
            note: z.string().optional(),
          })
        ),
        totalAmount: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const orderNumber = generateOrderNumber();

      const [order] = await db.insert(orders).values({
        orderNumber,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        pickupTime: input.pickupTime,
        orderNote: input.orderNote || null,
        paymentMethod: input.paymentMethod,
        totalAmount: input.totalAmount.toString(),
        status: "pending",
      }).$returningId();

      for (const item of input.items) {
        await db.insert(orderItems).values({
          orderId: order.id,
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          note: item.note || null,
        });
      }

      return { orderId: order.id, orderNumber };
    }),

  getByNumber: publicQuery
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [order] = await db.select().from(orders).where(eq(orders.orderNumber, input.orderNumber)).limit(1);
      if (!order) return null;
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return { ...order, totalAmount: parseFloat(order.totalAmount), items: items.map((i) => ({ ...i, unitPrice: parseFloat(i.unitPrice) })) };
    }),

  customerHistory: publicQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const customerOrders = await db.select().from(orders).where(eq(orders.customerPhone, input.phone)).orderBy(desc(orders.createdAt));
      return customerOrders.map((o) => ({ ...o, totalAmount: parseFloat(o.totalAmount) }));
    }),

  cancel: publicQuery
    .input(z.object({ orderNumber: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { orders } = await import("@db/schema");
      const [order] = await db.select().from(orders).where(eq(orders.orderNumber, input.orderNumber)).limit(1);
      if (!order || order.status !== "pending") throw new Error("Cannot cancel this order");
      await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
      return { success: true };
    }),
});
