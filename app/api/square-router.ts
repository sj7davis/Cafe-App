import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { venues, menuItems, inventory, orders } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { buildAuthUrl, refreshAccessToken, expiryDate, needsRefresh, squareApiBase as SQUARE_API_BASE } from "./lib/oauth";
import { seal, open } from "./lib/crypto";
import { featureProcedure } from "./lib/plans";

// Return a non-expired Square access token (refreshing in place if needed)
// plus the venue row, or throw if Square isn't connected for this venue.
async function getValidSquare(venueId: number) {
  const db = getDb();
  const venue = await db.query.venues?.findFirst({ where: eq(venues.id, venueId) });
  if (!venue?.squareAccessToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Square not connected" });
  const currentRefresh = open(venue.squareRefreshToken);
  if (!needsRefresh(venue.squareTokenExpiresAt ?? null) || !currentRefresh) {
    return { accessToken: open(venue.squareAccessToken)!, venue };
  }
  const tokens = await refreshAccessToken("square", currentRefresh);
  // Square returns an absolute expires_at; fall back to expires_in if not present.
  const expiresAt = typeof tokens.raw.expires_at === "string" ? new Date(tokens.raw.expires_at) : expiryDate(tokens.expiresInSec);
  await db.update(venues).set({
    squareAccessToken: seal(tokens.accessToken),
    squareRefreshToken: seal(tokens.refreshToken ?? currentRefresh),
    squareTokenExpiresAt: expiresAt,
    updatedAt: new Date(),
  }).where(eq(venues.id, venueId));
  return { accessToken: tokens.accessToken, venue };
}

// Minimal shapes for the Square API responses this router reads.
type SquareError = { errors?: { detail?: string }[] };
interface SquareCatalogObject {
  type?: string;
  id: string;
  imageData?: { url?: string };
  itemData?: {
    name: string;
    description?: string | null;
    variations?: { itemVariationData?: { priceMoney?: { amount?: number | string } } }[];
    imageIds?: string[];
  };
}
interface SquareInventoryCount { catalog_object_id?: string; quantity?: string; state?: string }
interface SquareLineItem { name?: string; quantity?: string | number; basePriceMoney?: { amount?: number | string } }
interface SquareOrder {
  id?: string;
  state?: string;
  createdAt?: string;
  totalMoney?: { amount?: number | string };
  lineItems?: SquareLineItem[];
}

export const squareRouter = createRouter({
  // Get Square OAuth URL for connecting a venue (signed state via shared module)
  getOAuthUrl: featureProcedure("pos_sync").input(z.object({
    token: z.string(),
  })).query(async ({ ctx }) => {
    const url = await buildAuthUrl("square", ctx.auth.venueId);
    if (!url) throw new TRPCError({ code: "NOT_FOUND", message: "Square not configured" });
    return { url };
  }),

  // Disconnect Square
  disconnect: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ ctx }) => {
    const db = getDb();
    await db.update(venues).set({
      squareMerchantId: null,
      squareLocationId: null,
      squareAccessToken: null,
      squareRefreshToken: null,
      squareTokenExpiresAt: null,
      squareEnabled: false,
      updatedAt: new Date(),
    }).where(eq(venues.id, ctx.auth.venueId));
    return { success: true };
  }),

  // Import menu from Square (one-way: Square → B1 only)
  // Fetches ITEM + IMAGE objects in one call so images are included.
  syncMenu: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const { accessToken } = await getValidSquare(venueId);

    try {
      // Fetch both ITEM and IMAGE objects in one request
      const res = await fetch(`${SQUARE_API_BASE}/v2/catalog/list?types=ITEM,IMAGE`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.json() as SquareError;
        throw new TRPCError({ code: "BAD_REQUEST", message: err.errors?.[0]?.detail || "Square API error" });
      }

      const data = await res.json() as { objects?: SquareCatalogObject[] };
      const allObjects: SquareCatalogObject[] = data.objects || [];

      // Build image lookup map: imageId → URL
      const imageMap: Record<string, string> = {};
      for (const obj of allObjects) {
        if (obj.type === "IMAGE" && obj.imageData?.url) {
          imageMap[obj.id] = obj.imageData.url;
        }
      }

      const items = allObjects.filter((o) => o.type === "ITEM");

      let imported = 0;
      let withImages = 0;

      for (const item of items) {
        const itemData = item.itemData;
        if (!itemData) continue;
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
            category,
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
            category,
            squareCatalogId: item.id,
            ...(imageUrl ? { image: imageUrl } : {}),
          });
          imported++;
        }
      }

      return { imported, updated: items.length - imported, total: items.length, withImages };
    } catch (e) {
      throw new TRPCError({ code: "BAD_REQUEST", message: (e as Error).message || "Failed to import from Square" });
    }
  }),

  // Sync inventory counts from Square
  syncInventory: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;

    const { accessToken, venue } = await getValidSquare(venueId);

    // Load menu items that have a Square catalog ID
    const items = await db.select().from(menuItems).where(eq(menuItems.venueId, venueId));
    const linkedItems = items.filter((item) => !!item.squareCatalogId);

    if (linkedItems.length === 0) return { synced: 0 };

    const catalogObjectIds = linkedItems.map((item) => item.squareCatalogId as string);

    const body: Record<string, string[]> = { catalog_object_ids: catalogObjectIds };
    if (venue.squareLocationId) {
      body.location_ids = [venue.squareLocationId];
    }

    const countsRes = await fetch(`${SQUARE_API_BASE}/v2/inventory/counts/batch-retrieve`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!countsRes.ok) {
      const err = await countsRes.json() as SquareError;
      throw new TRPCError({ code: "BAD_REQUEST", message: err.errors?.[0]?.detail || "Square inventory API error" });
    }

    const countsData = await countsRes.json() as { counts?: SquareInventoryCount[] };
    const counts: SquareInventoryCount[] = countsData.counts || [];

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
  status: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const db = getDb();
    const venue = await db.query.venues?.findFirst({
      where: eq(venues.id, ctx.auth.venueId),
    });

    return {
      connected: !!venue?.squareEnabled,
      merchantId: venue?.squareMerchantId || null,
      locationId: venue?.squareLocationId || null,
      tokenExpiresAt: venue?.squareTokenExpiresAt || null,
    };
  }),

  injectOrder: protectedProcedure.input(z.object({
    token: z.string(),
    squareOrderId: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const venueId = ctx.auth.venueId;
    const { accessToken } = await getValidSquare(venueId);

    const res = await fetch(`${SQUARE_API_BASE}/v2/orders/${input.squareOrderId}`, {
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Square order not found" });
    const data = await res.json() as { order: SquareOrder };
    const sqOrder = data.order;

    const totalMoney = sqOrder.totalMoney?.amount ? Number(sqOrder.totalMoney.amount) / 100 : 0;
    const lineItems = (sqOrder.lineItems || []).map((li) => ({
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

  getRecentSquareOrders: protectedProcedure.input(z.object({
    token: z.string(),
    limit: z.number().default(20),
  })).query(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const valid = await getValidSquare(venueId).catch(() => null);
    if (!valid || !valid.venue.squareLocationId) return { orders: [] };
    const { accessToken, venue } = valid;

    const body = {
      location_ids: [venue.squareLocationId],
      query: { sort: { sort_field: "CREATED_AT", sort_order: "DESC" } },
      limit: input.limit,
    };

    const res = await fetch(`${SQUARE_API_BASE}/v2/orders/search`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { orders: [] };
    const data = await res.json() as { orders?: SquareOrder[] };
    const sqOrders = (data.orders || []).map((o) => ({
      id: o.id,
      total: o.totalMoney?.amount ? Number(o.totalMoney.amount) / 100 : 0,
      state: o.state,
      createdAt: o.createdAt,
      itemCount: (o.lineItems || []).length,
    }));
    return { orders: sqOrders };
  }),
});
