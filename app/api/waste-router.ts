import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wasteLog, menuItems } from "@db/schema";
import { eq, and, desc, gte, sql, sum } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const wasteRouter = createRouter({
  // Staff: list recent waste log entries
  list: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      return db
        .select({
          id: wasteLog.id,
          venueId: wasteLog.venueId,
          menuItemId: wasteLog.menuItemId,
          itemName: wasteLog.itemName,
          quantity: wasteLog.quantity,
          reason: wasteLog.reason,
          costEstimate: wasteLog.costEstimate,
          staffId: wasteLog.staffId,
          createdAt: wasteLog.createdAt,
          menuItemName: menuItems.name,
        })
        .from(wasteLog)
        .leftJoin(menuItems, eq(wasteLog.menuItemId, menuItems.id))
        .where(eq(wasteLog.venueId, venueId))
        .orderBy(desc(wasteLog.createdAt))
        .limit(50);
    }),

  // Staff: log a waste entry
  log: publicQuery
    .input(
      z.object({
        token: z.string(),
        menuItemId: z.number().int().positive().optional(),
        itemName: z.string().min(1).max(128),
        quantity: z.number().int().positive(),
        reason: z.string().min(1).max(128),
        costEstimate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const staffId = payload.payload.staffId as number | undefined;
      const { token, ...data } = input;
      const db = getDb();
      const [entry] = await db
        .insert(wasteLog)
        .values({
          venueId,
          staffId: staffId ?? null,
          menuItemId: data.menuItemId ?? null,
          itemName: data.itemName,
          quantity: data.quantity,
          reason: data.reason,
          costEstimate: data.costEstimate ?? null,
        })
        .returning();
      return entry;
    }),

  // Owner: get waste summary
  getSummary: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();

      const entries = await db
        .select()
        .from(wasteLog)
        .where(eq(wasteLog.venueId, venueId));

      const totalWasteEntries = entries.length;

      const totalCost = entries.reduce((acc, e) => {
        const cost = e.costEstimate ? parseFloat(String(e.costEstimate)) : 0;
        return acc + cost;
      }, 0);

      // Top 5 wasted items by quantity
      const itemMap = new Map<string, number>();
      for (const e of entries) {
        itemMap.set(e.itemName, (itemMap.get(e.itemName) ?? 0) + e.quantity);
      }
      const topWastedItems = Array.from(itemMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([itemName, quantity]) => ({ itemName, quantity }));

      // Last 7 days daily waste count
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const recentEntries = entries.filter((e) => new Date(e.createdAt) >= sevenDaysAgo);
      const dailyMap = new Map<string, number>();
      for (const e of recentEntries) {
        const day = new Date(e.createdAt).toISOString().slice(0, 10);
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
      }
      const last7Days = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));

      return { totalWasteEntries, totalCost: Math.round(totalCost * 100) / 100, topWastedItems, last7Days };
    }),

  // Staff: delete a waste entry
  delete: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      await db
        .delete(wasteLog)
        .where(and(eq(wasteLog.id, input.id), eq(wasteLog.venueId, venueId)));
      return { success: true };
    }),
});
