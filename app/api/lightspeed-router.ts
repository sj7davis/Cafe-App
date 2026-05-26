import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { posIntegrations, menuItems } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);
const LIGHTSPEED_BASE = "https://api.kounta.com/v1";

export const lightspeedRouter = createRouter({
  // Get OAuth authorization URL
  getAuthUrl: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const clientId = process.env.LIGHTSPEED_CLIENT_ID;
    if (!clientId) return { url: null, configured: false };
    const state = Buffer.from(JSON.stringify({ venueId })).toString("base64");
    const url = `https://my.kounta.com/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(env.appUrl + "/api/lightspeed/callback")}&state=${state}&scope=read:catalog+read:sales+read:stock`;
    return { url, configured: true };
  }),

  // Get current connection status
  getConnection: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const rows = await db.select().from(posIntegrations)
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "lightspeed")))
      .limit(1);
    if (!rows[0]) return null;
    const { accessToken, refreshToken, ...safe } = rows[0];
    return safe;
  }),

  // Sync menu from Lightspeed
  syncMenu: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const conn = await db.select().from(posIntegrations)
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "lightspeed")))
      .limit(1);
    if (!conn[0]?.accessToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Lightspeed not connected" });

    // Fetch products from Lightspeed API
    const res = await fetch(`${LIGHTSPEED_BASE}/companies/me/products.json`, {
      headers: { Authorization: `Bearer ${conn[0].accessToken}` },
    });
    if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Lightspeed API error" });
    const data = await res.json() as any;
    const products = data.data ?? [];

    let synced = 0;
    for (const p of products) {
      const slug = `ls-${p.id}`;
      const existing = await db.select({ id: menuItems.id }).from(menuItems)
        .where(and(eq(menuItems.venueId, venueId), eq(menuItems.slug, slug))).limit(1);
      const price = String(Number(p.price ?? 0).toFixed(2));
      if (existing[0]) {
        await db.update(menuItems).set({ name: p.name, price, category: p.category?.name ?? "Other" })
          .where(eq(menuItems.id, existing[0].id));
      } else {
        await db.insert(menuItems).values({ venueId, slug, name: p.name, price, category: p.category?.name ?? "Other" });
      }
      synced++;
    }
    await db.update(posIntegrations).set({ lastSyncAt: new Date() })
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "lightspeed")));
    return { synced };
  }),

  // Disconnect
  disconnect: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    await db.update(posIntegrations).set({ isActive: false, accessToken: null, refreshToken: null })
      .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "lightspeed")));
    return { ok: true };
  }),
});
