import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { posIntegrations } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { seal, open } from "./lib/crypto";

export const tyroRouter = createRouter({
  // Save Tyro API key (Tyro uses API key auth, not OAuth)
  connect: protectedProcedure.input(z.object({
    token: z.string(),
    apiKey: z.string().min(1),
    merchantId: z.string().min(1),
    terminalId: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const existing = await db.select({ id: posIntegrations.id }).from(posIntegrations)
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "tyro"))).limit(1);
    const settings = { merchantId: input.merchantId, terminalId: input.terminalId };
    if (existing[0]) {
      await db.update(posIntegrations).set({ accessToken: seal(input.apiKey), isActive: true, settingsJson: settings })
        .where(eq(posIntegrations.id, existing[0].id));
    } else {
      await db.insert(posIntegrations).values({ venueId, provider: "tyro", accessToken: seal(input.apiKey), isActive: true, settingsJson: settings });
    }
    return { ok: true };
  }),

  getConnection: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const rows = await db.select().from(posIntegrations)
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "tyro"))).limit(1);
    if (!rows[0]) return null;
    const { accessToken, refreshToken, ...safe } = rows[0];
    return { ...safe, connected: !!rows[0].accessToken };
  }),

  // Fetch settlement report from Tyro API
  getSettlement: protectedProcedure.input(z.object({
    token: z.string(),
    date: z.string(), // YYYY-MM-DD
  })).query(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const conn = await db.select().from(posIntegrations)
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "tyro"))).limit(1);
    if (!conn[0]?.accessToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Tyro not connected" });

    const settings = conn[0].settingsJson as any;
    // Tyro API: https://docs.tyro.com/
    const res = await fetch(`https://api.tyro.com/connect/pay/settlements?date=${input.date}`, {
      headers: { Authorization: `Bearer ${open(conn[0].accessToken) ?? ""}`, "X-Merchant-Id": settings?.merchantId ?? "" },
    });
    if (!res.ok) return { transactions: [], totalSales: "0", totalRefunds: "0", date: input.date };
    const data = await res.json() as any;
    return {
      date: input.date,
      totalSales: data.totalSales ?? "0",
      totalRefunds: data.totalRefunds ?? "0",
      transactions: data.transactions ?? [],
    };
  }),

  disconnect: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    await db.update(posIntegrations).set({ isActive: false, accessToken: null })
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "tyro")));
    return { ok: true };
  }),
});
