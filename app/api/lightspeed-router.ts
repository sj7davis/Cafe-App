import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { posIntegrations, menuItems } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";
import { buildAuthUrl, refreshAccessToken, expiryDate, needsRefresh } from "./lib/oauth";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);
const LIGHTSPEED_BASE = "https://api.kounta.com/v1";

// Return a non-expired Lightspeed access token, refreshing + persisting if needed.
async function getValidLightspeedToken(venueId: number): Promise<string> {
  const db = getDb();
  const rows = await db.select().from(posIntegrations)
    .where(and(eq(posIntegrations.venueId, venueId), eq(posIntegrations.provider, "lightspeed")))
    .limit(1);
  const conn = rows[0];
  if (!conn?.accessToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Lightspeed not connected" });
  if (!needsRefresh(conn.tokenExpiresAt ?? null) || !conn.refreshToken) return conn.accessToken;

  const tokens = await refreshAccessToken("lightspeed", conn.refreshToken);
  await db.update(posIntegrations).set({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? conn.refreshToken,
    tokenExpiresAt: expiryDate(tokens.expiresInSec),
  }).where(eq(posIntegrations.id, conn.id));
  return tokens.accessToken;
}

export const lightspeedRouter = createRouter({
  // Get OAuth authorization URL (signed state via shared module)
  getAuthUrl: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const url = await buildAuthUrl("lightspeed", venueId);
    return { url, configured: !!url };
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
    const accessToken = await getValidLightspeedToken(venueId);

    // Fetch products from Lightspeed API
    const res = await fetch(`${LIGHTSPEED_BASE}/companies/me/products.json`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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
      const rawCat = (p.category?.name || p.productType || "").toLowerCase();
      let category: "coffee" | "pastries" | "bread" | "food" | "drinks" | "snacks" | "merchandise" | "seasonal" = "food";
      if (rawCat.includes("coffee") || rawCat.includes("espresso") || rawCat.includes("tea") || rawCat.includes("hot drink")) category = "coffee";
      else if (rawCat.includes("pastry") || rawCat.includes("pastries") || rawCat.includes("cake") || rawCat.includes("croissant") || rawCat.includes("danish")) category = "pastries";
      else if (rawCat.includes("bread") || rawCat.includes("sourdough") || rawCat.includes("loaf")) category = "bread";
      else if (rawCat.includes("drink") || rawCat.includes("juice") || rawCat.includes("smoothie") || rawCat.includes("cold")) category = "drinks";
      else if (rawCat.includes("snack") || rawCat.includes("chip") || rawCat.includes("biscuit")) category = "snacks";
      else if (rawCat.includes("merch") || rawCat.includes("bag") || rawCat.includes("cup") || rawCat.includes("mug")) category = "merchandise";
      if (existing[0]) {
        await db.update(menuItems).set({ name: p.name, price, category })
          .where(eq(menuItems.id, existing[0].id));
      } else {
        await db.insert(menuItems).values({ venueId, slug, name: p.name, price, category });
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
