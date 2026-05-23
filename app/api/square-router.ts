import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { venues, menuItems } from "@db/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);
const SQUARE_APP_ID = process.env.SQUARE_APP_ID || "";
const SQUARE_ENV = process.env.SQUARE_ENV || "sandbox"; // sandbox or production

// Square API base URL
const SQUARE_API_BASE = SQUARE_ENV === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

export const squareRouter = createRouter({
  // Get Square OAuth URL for connecting a venue
  getOAuthUrl: publicQuery.input(z.object({
    token: z.string(),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    if (!SQUARE_APP_ID) throw new TRPCError({ code: "NOT_FOUND", message: "Square not configured" });

    const scopes = "ITEMS_READ ORDERS_READ INVENTORY_READ PAYMENTS_READ ORDERS_WRITE";
    const state = Buffer.from(JSON.stringify({ venueId })).toString("base64");
    const redirectUri = `${process.env.API_URL || "https://api.b1platform.com.au"}/api/square/callback`;

    const url = `${SQUARE_API_BASE}/oauth2/authorize?client_id=${SQUARE_APP_ID}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return { url };
  }),

  // Disconnect Square
  disconnect: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    await db.update(venues).set({
      squareMerchantId: null,
      squareLocationId: null,
      squareAccessToken: null,
      squareRefreshToken: null,
      squareTokenExpiresAt: null,
      squareEnabled: false,
      updatedAt: new Date(),
    }).where(eq(venues.id, payload.payload.venueId as number));
    return { success: true };
  }),

  // Sync menu from Square
  syncMenu: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const venue = await db.query.venues?.findFirst({ where: eq(venues.id, venueId) });
    if (!venue?.squareAccessToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Square not connected" });

    // Fetch catalog from Square API
    try {
      const res = await fetch(`${SQUARE_API_BASE}/v2/catalog/list?types=ITEM`, {
        headers: {
          "Authorization": `Bearer ${venue.squareAccessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.json() as any;
        throw new TRPCError({ code: "BAD_REQUEST", message: err.errors?.[0]?.detail || "Square API error" });
      }

      const data = await res.json() as any;
      const items = data.objects || [];

      let imported = 0;
      for (const item of items) {
        if (item.type !== "ITEM") continue;
        const itemData = item.itemData;
        const variation = itemData.variations?.[0];
        if (!variation) continue;

        const price = variation.itemVariationData?.priceMoney?.amount
          ? Number(variation.itemVariationData.priceMoney.amount) / 100
          : 0;

        // Determine category
        const name = (itemData.name || "").toLowerCase();
        let category: "coffee" | "pastries" | "bread" = "coffee";
        if (name.includes("bread") || name.includes("loaf") || name.includes("sourdough")) category = "bread";
        else if (name.includes("tart") || name.includes("danish") || name.includes("croissant")) category = "pastries";

        // Upsert
        const existing = await db.query.menuItems?.findFirst({
          where: eq(menuItems.squareCatalogId, item.id),
        });

        if (existing) {
          await db.update(menuItems).set({
            name: itemData.name,
            price: String(price),
            category,
            description: itemData.description || null,
          }).where(eq(menuItems.id, existing.id));
        } else {
          await db.insert(menuItems).values({
            venueId,
            slug: `square-${item.id}`,
            name: itemData.name,
            description: itemData.description || null,
            price: String(price),
            category,
            squareCatalogId: item.id,
          });
          imported++;
        }
      }

      return { imported, total: items.length };
    } catch (e: any) {
      throw new TRPCError({ code: "BAD_REQUEST", message: e.message || "Failed to sync with Square" });
    }
  }),

  // Get connection status
  status: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venue = await db.query.venues?.findFirst({
      where: eq(venues.id, payload.payload.venueId as number),
    });

    return {
      connected: !!venue?.squareEnabled,
      merchantId: venue?.squareMerchantId || null,
      locationId: venue?.squareLocationId || null,
      tokenExpiresAt: venue?.squareTokenExpiresAt || null,
    };
  }),
});
