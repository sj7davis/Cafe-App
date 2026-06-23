import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { posIntegrations, menuItems } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { seal, open } from "./lib/crypto";

const IMPOS_BASE = "https://api.impos.com.au/v1";

export const imposRouter = createRouter({
  connect: protectedProcedure.input(z.object({
    token: z.string(),
    apiKey: z.string().min(1),
    siteId: z.string().min(1),
  })).mutation(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const existing = await db.select({ id: posIntegrations.id }).from(posIntegrations)
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "impos"))).limit(1);
    if (existing[0]) {
      await db.update(posIntegrations).set({ accessToken: seal(input.apiKey), accountId: input.siteId, isActive: true })
        .where(eq(posIntegrations.id, existing[0].id));
    } else {
      await db.insert(posIntegrations).values({ venueId, provider: "impos", accessToken: seal(input.apiKey), accountId: input.siteId, isActive: true });
    }
    return { ok: true };
  }),

  getConnection: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const rows = await db.select().from(posIntegrations)
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "impos"))).limit(1);
    if (!rows[0]) return null;
    const { accessToken, refreshToken, ...safe } = rows[0];
    return safe;
  }),

  syncMenu: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const conn = await db.select().from(posIntegrations)
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "impos"))).limit(1);
    if (!conn[0]?.accessToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Impos not connected" });

    const res = await fetch(`${IMPOS_BASE}/sites/${conn[0].accountId}/menu-items`, {
      headers: { "X-Api-Key": open(conn[0].accessToken) ?? "", "Content-Type": "application/json" },
    });
    if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Impos API error" });
    const items = await res.json() as any[];

    let synced = 0;
    for (const item of (Array.isArray(items) ? items : [])) {
      const slug = `impos-${item.id}`;
      const existing = await db.select({ id: menuItems.id }).from(menuItems)
        .where(and(eq(menuItems.venueId, venueId), eq(menuItems.slug, slug))).limit(1);
      const price = String(Number(item.price ?? 0).toFixed(2));
      if (existing[0]) {
        await db.update(menuItems).set({ name: item.name, price, category: item.category ?? "Other" })
          .where(eq(menuItems.id, existing[0].id));
      } else {
        await db.insert(menuItems).values({ venueId, slug, name: item.name, price, category: item.category ?? "Other" });
      }
      synced++;
    }
    await db.update(posIntegrations).set({ lastSyncAt: new Date() })
      .where(eq(posIntegrations.id, conn[0].id));
    return { synced };
  }),

  disconnect: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ ctx }) => {
    const venueId = ctx.auth.venueId;
    const db = getDb();
    await db.update(posIntegrations).set({ isActive: false, accessToken: null })
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "impos")));
    return { ok: true };
  }),
});
