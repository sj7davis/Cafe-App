import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { venues, menuItems, inventory, orders } from "@db/schema";
import { eq, and } from "drizzle-orm";
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
    // Must match EXACTLY what's registered in Square Developer Portal
    // and what boot.ts uses in the token exchange.
    const redirectUri = `${env.appUrl}/api/square/callback`;

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

  // Import menu from Square (one-way: Square → B1 only)
  // Fetches ITEM + IMAGE objects in one call so images are included.
  syncMenu: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const venue = await db.query.venues?.findFirst({ where: eq(venues.id, venueId) });
    if (!venue?.squareAccessToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Square not connected" });

    try {
      // Fetch both ITEM and IMAGE objects in one request
      const res = await fetch(`${SQUARE_API_BASE}/v2/catalog/list?types=ITEM,IMAGE`, {
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
      const allObjects: any[] = data.objects || [];

      // Build image lookup map: imageId → URL
      const imageMap: Record<string, string> = {};
      for (const obj of allObjects) {
        if (obj.type === "IMAGE" && obj.imageData?.url) {
          imageMap[obj.id] = obj.imageData.url;
        }
      }

      const items = allObjects.filter((o: any) => o.type === "ITEM");

      let imported = 0;
      let withImages = 0;

      for (const item of items) {
        const itemData = item.itemData;
        const variation = itemData.variations?.[0];
        if (!variation) continue;

        const price = variation.itemVariationData?.priceMoney?.amount
          ? Number(variation.itemVariationData.priceMoney.amount) / 100
          : 0;

        // Determine category from name keywords
        const name = (itemData.name || "").toLowerCase();
        let category: "coffee" | "pastries" | "bread" | "food" | "drinks" = "coffee";
        if (name.includes("bread") || name.includes("loaf") || name.includes("sourdough")) category = "bread";
        else if (name.includes("tart") || name.includes("danish") || name.includes("croissant") || name.includes("muffin") || name.includes("pastry")) category = "pastries";
        else if (name.includes("juice") || name.includes("smoothie") || name.includes("tea") || name.includes("chai") || name.includes("water")) category = "drinks";
        else if (name.includes("toast") || name.includes("sandwich") || name.includes("bowl") || name.includes("wrap") || name.includes("salad")) category = "food";

        // Resolve image URL: item may reference an IMAGE object via imageIds array
        const imageId = itemData.imageIds?.[0];
        const imageUrl = imageId ? (imageMap[imageId] || null) : null;
        if (imageUrl) withImages++;

        // Upsert: find existing by squareCatalogId
        const existing = await db.query.menuItems?.findFirst({
          where: eq(menuItems.squareCatalogId, item.id),
        });

        if (existing) {
          await db.update(menuItems).set({
            name: itemData.name,
            price: String(price),
            category: category as any,
            description: itemData.description || null,
            // Only update image if Square provides one (don't overwrite a manually-set image)
            ...(imageUrl ? { image: imageUrl } : {}),
          }).where(eq(menuItems.id, existing.id));
        } else {
          await db.insert(menuItems).values({
            venueId,
            slug: `square-${item.id}`,
            name: itemData.name,
            description: itemData.description || null,
            price: String(price),
            category: category as any,
            squareCatalogId: item.id,
            ...(imageUrl ? { image: imageUrl } : {}),
          });
          imported++;
        }
      }

      return { imported, updated: items.length - imported, total: items.length, withImages };
    } catch (e: any) {
      throw new TRPCError({ code: "BAD_REQUEST", message: e.message || "Failed to import from Square" });
    }
  }),

  // Sync inventory counts from Square
  syncInventory: publicQuery.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const venue = await db.query.venues?.findFirst({ where: eq(venues.id, venueId) });
    if (!venue?.squareAccessToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Square not connected" });

    // Load menu items that have a Square catalog ID
    const items = await db.select().from(menuItems).where(eq(menuItems.venueId, venueId));
    const linkedItems = items.filter((item) => !!item.squareCatalogId);

    if (linkedItems.length === 0) return { synced: 0 };

    const catalogObjectIds = linkedItems.map((item) => item.squareCatalogId as string);

    const body: Record<string, any> = { catalog_object_ids: catalogObjectIds };
    if (venue.squareLocationId) {
      body.location_ids = [venue.squareLocationId];
    }

    const countsRes = await fetch(`${SQUARE_API_BASE}/v2/inventory/counts/batch-retrieve`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${venue.squareAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!countsRes.ok) {
      const err = await countsRes.json() as any;
      throw new TRPCError({ code: "BAD_REQUEST", message: err.errors?.[0]?.detail || "Square inventory API error" });
    }

    const countsData = await countsRes.json() as any;
    const counts: any[] = countsData.counts || [];

    // Build a map from squareCatalogId → quantity
    const quantityByCatalogId = new Map<string, number>();
    for (const count of counts) {
      if (count.catalog_object_id) {
        const qty = parseFloat(count.quantity || "0");
        const existing = quantityByCatalogId.get(count.catalog_object_id) || 0;
        // Only track IN_STOCK state counts; NONE state = sold out
        if (count.state === "IN_STOCK") {
          quantityByCatalogId.set(count.catalog_object_id, existing + qty);
        } else if (!quantityByCatalogId.has(count.catalog_object_id)) {
          quantityByCatalogId.set(count.catalog_object_id, 0);
        }
      }
    }

    const now = new Date();
    let synced = 0;

    for (const item of linkedItems) {
      const catalogId = item.squareCatalogId as string;
      const quantity = quantityByCatalogId.get(catalogId) ?? 0;
      const isAvailable = quantity > 0;

      const existingEntry = await db.select().from(inventory).where(
        and(eq(inventory.venueId, venueId), eq(inventory.menuItemId, item.id))
      ).limit(1);

      if (existingEntry.length > 0) {
        await db.update(inventory).set({
          isAvailable,
          soldOutAt: isAvailable ? null : now,
          restockedAt: isAvailable ? now : null,
          updatedAt: now,
        }).where(and(eq(inventory.venueId, venueId), eq(inventory.menuItemId, item.id)));
      } else {
        await db.insert(inventory).values({
          venueId,
          menuItemId: item.id,
          isAvailable,
          soldOutAt: isAvailable ? null : now,
          restockedAt: isAvailable ? now : null,
          updatedAt: now,
        });
      }

      synced++;
    }

    return { synced };
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

  injectOrder: publicQuery.input(z.object({
    token: z.string(),
    squareOrderId: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const venue = await db.query.venues?.findFirst({ where: eq(venues.id, venueId) });
    if (!venue?.squareAccessToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Square not connected" });

    const res = await fetch(`${SQUARE_API_BASE}/v2/orders/${input.squareOrderId}`, {
      headers: { "Authorization": `Bearer ${venue.squareAccessToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Square order not found" });
    const data = await res.json() as any;
    const sqOrder = data.order;

    const totalMoney = sqOrder.totalMoney?.amount ? Number(sqOrder.totalMoney.amount) / 100 : 0;
    const lineItems = (sqOrder.lineItems || []).map((li: any) => ({
      name: li.name || "Item",
      quantity: Number(li.quantity || 1),
      unitPrice: li.basePriceMoney?.amount ? Number(li.basePriceMoney.amount) / 100 : 0,
    }));

    const [order] = await db.insert(orders).values({
      venueId,
      orderNumber: `SQ-${input.squareOrderId.slice(-8).toUpperCase()}`,
      customerName: "Square Customer",
      customerPhone: "",
      pickupTime: "ASAP",
      status: "completed",
      paymentMethod: "online",
      totalAmount: String(totalMoney),
      orderNote: JSON.stringify(lineItems),
      orderType: "dine_in",
      squareOrderId: input.squareOrderId,
    }).returning({ id: orders.id });

    return { id: order.id, total: totalMoney, items: lineItems.length };
  }),

  getRecentSquareOrders: publicQuery.input(z.object({
    token: z.string(),
    limit: z.number().default(20),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const venue = await db.query.venues?.findFirst({ where: eq(venues.id, venueId) });
    if (!venue?.squareAccessToken || !venue?.squareLocationId) return { orders: [] };

    const body = {
      location_ids: [venue.squareLocationId],
      query: { sort: { sort_field: "CREATED_AT", sort_order: "DESC" } },
      limit: input.limit,
    };

    const res = await fetch(`${SQUARE_API_BASE}/v2/orders/search`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${venue.squareAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { orders: [] };
    const data = await res.json() as any;
    const sqOrders = (data.orders || []).map((o: any) => ({
      id: o.id,
      total: o.totalMoney?.amount ? Number(o.totalMoney.amount) / 100 : 0,
      state: o.state,
      createdAt: o.createdAt,
      itemCount: (o.lineItems || []).length,
    }));
    return { orders: sqOrders };
  }),
});
