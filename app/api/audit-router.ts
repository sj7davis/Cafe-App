import { z } from "zod";
import { createRouter, protectedProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { auditLog, orders, loyaltyAccounts } from "@db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export const auditRouter = createRouter({
  list: protectedProcedure.input(z.object({
    token: z.string(),
    days: z.number().default(30),
    entityType: z.string().optional(),
  })).query(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const since = new Date(Date.now() - input.days * 86400000);
    const conditions: any[] = [eq(auditLog.venueId, venueId), gte(auditLog.createdAt, since)];
    if (input.entityType) conditions.push(eq(auditLog.entityType, input.entityType));
    return db.select().from(auditLog).where(and(...conditions)).orderBy(desc(auditLog.createdAt)).limit(500);
  }),

  // Export orders as CSV
  exportOrders: protectedProcedure.input(z.object({
    token: z.string(),
    fromDate: z.string(),
    toDate: z.string(),
  })).query(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, new Date(input.fromDate)),
        lte(orders.createdAt, new Date(input.toDate + "T23:59:59")),
      ))
      .orderBy(desc(orders.createdAt))
      .limit(5000);
    // Build CSV
    const headers = ["Order Number", "Date", "Customer", "Phone", "Status", "Payment", "Total", "Tip", "Discount", "Order Type", "Table"];
    const csvRows = rows.map(r => [
      r.orderNumber, new Date(r.createdAt).toISOString().slice(0, 19).replace("T", " "),
      r.customerName, r.customerPhone, r.status, r.paymentMethod,
      r.totalAmount, r.tipAmount ?? "0", r.discountAmount ?? "0", r.orderType ?? "pickup", r.tableNumber ?? "",
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    return { csv: [headers.join(","), ...csvRows].join("\n"), count: rows.length };
  }),

  // Export customers as CSV
  exportCustomers: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const rows = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.venueId, venueId)).limit(10000);
    const headers = ["Name", "Phone", "Points Balance", "Lifetime Points", "Created"];
    const csvRows = rows.map(r => [r.name ?? "", r.phone, r.pointsBalance, r.totalLifetimePoints, new Date(r.createdAt).toISOString().slice(0, 10)]
      .map(v => `"${String(v ?? "")}"`).join(","));
    return { csv: [headers.join(","), ...csvRows].join("\n"), count: rows.length };
  }),
});
