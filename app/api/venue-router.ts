import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { venues, venueOwners, orders, orderItems, menuItems, inventory, locations, loyaltyAccounts, loyaltyTransactions, customerPreferences, reviews, giftCards, subscriptionPasses, cateringRequests } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { hash, compare } from "bcrypt-ts";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

function generateGiftCardCode(): string {
  return randomBytes(8).toString('base64url').toUpperCase().slice(0, 12);
}

export const venueRouter = createRouter({
  // Public: Get venue by slug (for customer-facing site)
  getBySlug: publicQuery.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(venues).where(eq(venues.slug, input.slug)).limit(1);
    const venue = results[0];
    if (!venue || !venue.isPublic) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
    const { squareAccessToken, squareRefreshToken, stripeCustomerId, stripeSubscriptionId, ...safe } = venue;
    return safe;
  }),

  // Public: List all public venues (for platform directory)
  listPublic: publicQuery.query(async () => {
    const db = getDb();
    const all = await db.select().from(venues).where(eq(venues.isPublic, true));
    return all.map(v => {
      const { squareAccessToken, squareRefreshToken, stripeCustomerId, stripeSubscriptionId, ...safe } = v;
      return safe;
    });
  }),

  // ─── Owner Auth ───
  register: publicQuery.input(z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string(),
    venueName: z.string(),
    venueSlug: z.string().regex(/^[a-z0-9-]+$/),
  })).mutation(async ({ input }) => {
    const db = getDb();

    // Check slug availability
    const existing = await db.select().from(venues).where(eq(venues.slug, input.venueSlug)).limit(1);
    if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Slug already taken" });

    // Check email
    const existingOwner = await db.select().from(venueOwners).where(eq(venueOwners.email, input.email)).limit(1);
    if (existingOwner.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });

    // Create venue
    const [venueResult] = await db.insert(venues).values({
      slug: input.venueSlug,
      name: input.venueName,
      subdomain: input.venueSlug,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    // Create owner
    const passwordHash = await hash(input.password, 10);
    await db.insert(venueOwners).values({
      venueId: Number(venueResult.insertId),
      email: input.email,
      name: input.name,
      passwordHash,
    });

    return { venueId: Number(venueResult.insertId), slug: input.venueSlug };
  }),

  login: publicQuery.input(z.object({
    email: z.string().email(),
    password: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(venueOwners).where(eq(venueOwners.email, input.email)).limit(1);
    const owner = results[0];
    if (!owner || !owner.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

    const valid = await compare(input.password, owner.passwordHash);
    if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

    const token = await new SignJWT({ ownerId: owner.id, venueId: owner.venueId, role: owner.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    await db.update(venueOwners).set({ lastLoginAt: new Date() }).where(eq(venueOwners.id, owner.id));

    const venueResults = await db.select().from(venues).where(eq(venues.id, owner.venueId)).limit(1);
    const venue = venueResults[0];

    return { token, owner: { id: owner.id, name: owner.name, email: owner.email, role: owner.role }, venue };
  }),

  me: publicQuery.input(z.object({ token: z.string() }).optional()).query(async ({ input }) => {
    if (!input?.token) return null;
    try {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const db = getDb();
      const ownerResults = await db.select().from(venueOwners).where(eq(venueOwners.id, payload.payload.ownerId as number)).limit(1);
      const owner = ownerResults[0];
      if (!owner || !owner.isActive) return null;
      const venueResults = await db.select().from(venues).where(eq(venues.id, owner.venueId)).limit(1);
      const venue = venueResults[0];
      return { owner: { id: owner.id, name: owner.name, email: owner.email, role: owner.role }, venue };
    } catch { return null; }
  }),

  // ─── Venue Settings ───
  update: publicQuery.input(z.object({
    token: z.string(),
    data: z.object({
      name: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      hoursWeekday: z.string().optional(),
      hoursSaturday: z.string().optional(),
      hoursSunday: z.string().optional(),
      description: z.string().optional(),
      primaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      settingsJson: z.any().optional(),
    }),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    await db.update(venues).set({
      ...input.data,
      updatedAt: new Date(),
    }).where(eq(venues.id, venueId));

    return { success: true };
  }),

  // ─── Upload Logo ───
  updateLogo: publicQuery.input(z.object({
    token: z.string(),
    logoUrl: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    await db.update(venues).set({ logoUrl: input.logoUrl }).where(eq(venues.id, payload.payload.venueId as number));
    return { success: true };
  }),

  // ─── Orders ───
  listOrders: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    status: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(50),
    locationId: z.number().int().positive().optional(),
  })).query(async ({ input }) => {
    const db = getDb();
    const conditions = [eq(orders.venueId, input.venueId)];
    if (input.status) {
      conditions.push(eq(orders.status, input.status as any));
    }
    if (input.locationId) {
      conditions.push(eq(orders.locationId, input.locationId));
    }
    const results = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(input.limit);
    return results;
  }),

  getOrderItems: publicQuery.input(z.object({
    orderId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    return db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
  }),

  getOrderByNumber: publicQuery.input(z.object({
    orderNumber: z.string().min(1),
  })).query(async ({ input }) => {
    const db = getDb();
    const orderResults = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, input.orderNumber))
      .limit(1);
    if (!orderResults[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
    }
    const orderRow = orderResults[0];

    // Look up venue for "Back to [venue]" link in the UI
    const venueResults = await db
      .select({ id: venues.id, name: venues.name, slug: venues.slug })
      .from(venues)
      .where(eq(venues.id, orderRow.venueId))
      .limit(1);
    const venue = venueResults[0] ?? null;

    // Look up items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderRow.id));

    // Strip staffNote — it is internal and must NOT leak to the public response
    const { staffNote: _omit, ...publicOrder } = orderRow;
    return { order: publicOrder, venue, items };
  }),

  updateOrderStatus: publicQuery.input(z.object({
    token: z.string(),
    orderId: z.number().int().positive(),
    status: z.enum(["pending", "confirmed", "ready", "completed", "cancelled"]),
    staffNote: z.string().optional(),
  })).mutation(async ({ input }) => {
    // SECURITY FIX: previous version accepted any token without verifying. Verify staff JWT.
    try {
      await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    } catch {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid staff token" });
    }

    const db = getDb();
    const updateData: Record<string, unknown> = { status: input.status };
    if (input.staffNote !== undefined) {
      updateData.staffNote = input.staffNote;
    }
    await db.update(orders).set(updateData).where(eq(orders.id, input.orderId));
    return { success: true };
  }),

  // ─── Create Order ───
  createOrder: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    customerName: z.string().min(1),
    customerPhone: z.string().min(1),
    pickupTime: z.string(),
    orderNote: z.string().optional(),
    paymentMethod: z.enum(["online", "pickup"]).default("pickup"),
    items: z.array(z.object({
      menuItemId: z.number().int().positive(),
      quantity: z.number().int().min(1),
      note: z.string().optional(),
    })),
    locationId: z.number().int().positive().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();

    // Verify all menu items belong to the venue and calculate total
    let totalAmount = 0;
    const itemDetails: { menuItemId: number; itemName: string; quantity: number; unitPrice: number; note?: string }[] = [];

    for (const item of input.items) {
      const mi = await db.select().from(menuItems).where(eq(menuItems.id, item.menuItemId)).limit(1);
      if (!mi[0] || mi[0].venueId !== input.venueId) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Menu item ${item.menuItemId} not found` });
      }
      const unitPrice = Number(mi[0].price);
      totalAmount += unitPrice * item.quantity;
      itemDetails.push({
        menuItemId: item.menuItemId,
        itemName: mi[0].name,
        quantity: item.quantity,
        unitPrice,
        note: item.note,
      });
    }

    // Generate order number
    const orderNumber = `B1-${Date.now().toString(36).toUpperCase()}`;

    // Create order
    const [orderResult] = await db.insert(orders).values({
      venueId: input.venueId,
      orderNumber,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      pickupTime: input.pickupTime,
      orderNote: input.orderNote,
      paymentMethod: input.paymentMethod as any,
      totalAmount: totalAmount.toFixed(2),
      locationId: input.locationId,
    });

    const orderId = Number(orderResult.insertId);

    // Create order items
    for (const item of itemDetails) {
      await db.insert(orderItems).values({
        orderId,
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        note: item.note,
      });
    }

    return { orderId, orderNumber, totalAmount: totalAmount.toFixed(2) };
  }),

  // ─── Menu Management ───
  listMenu: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    category: z.string().optional(),
  })).query(async ({ input }) => {
    const db = getDb();
    const conditions = [eq(menuItems.venueId, input.venueId)];
    if (input.category) {
      conditions.push(eq(menuItems.category, input.category as any));
    }
    return db.select().from(menuItems).where(and(...conditions));
  }),

  createMenuItem: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    slug: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.string().or(z.number()),
    category: z.enum(["coffee", "pastries", "bread"]),
    dietary: z.string().optional(),
    image: z.string().optional(),
    originRegion: z.string().optional(),
    originFarm: z.string().optional(),
    originAltitude: z.string().optional(),
    originProcess: z.string().optional(),
    originTastingNotes: z.string().optional(),
    originStory: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const { venueId: vid, ...data } = input;
    const price = typeof data.price === 'number' ? data.price.toFixed(2) : data.price;
    await db.insert(menuItems).values({
      venueId: vid,
      ...data,
      price,
    });
    return { success: true };
  }),

  updateMenuItem: publicQuery.input(z.object({
    token: z.string(),
    menuItemId: z.number().int().positive(),
    data: z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      price: z.string().or(z.number()).optional(),
      category: z.enum(["coffee", "pastries", "bread"]).optional(),
      dietary: z.string().optional(),
      image: z.string().optional(),
    }),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    // Ensure the item belongs to the authenticated venue
    const existing = await db.select().from(menuItems).where(eq(menuItems.id, input.menuItemId)).limit(1);
    if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Menu item not found" });
    if (existing[0].venueId !== venueId) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to edit this item" });

    const updateData: Record<string, unknown> = { ...input.data };
    if (updateData.price !== undefined) {
      updateData.price = typeof updateData.price === 'number' ? updateData.price.toFixed(2) : updateData.price;
    }

    await db.update(menuItems).set(updateData).where(eq(menuItems.id, input.menuItemId));
    return { success: true };
  }),

  deleteMenuItem: publicQuery.input(z.object({
    token: z.string(),
    menuItemId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    // Ensure the item belongs to the authenticated venue
    const existing = await db.select().from(menuItems).where(eq(menuItems.id, input.menuItemId)).limit(1);
    if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Menu item not found" });
    if (existing[0].venueId !== venueId) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to delete this item" });

    // FK protection: refuse if any order_items reference this menu item
    const referencingOrders = await db.select().from(orderItems).where(eq(orderItems.menuItemId, input.menuItemId)).limit(1);
    if (referencingOrders.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This item has existing orders and cannot be deleted. View your order history for details.",
      });
    }

    await db.delete(menuItems).where(eq(menuItems.id, input.menuItemId));
    return { success: true };
  }),

  // ─── Inventory ───
  getInventory: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    const items = await db
      .select()
      .from(inventory)
      .where(eq(inventory.venueId, input.venueId));
    return items;
  }),

  toggleInventoryItem: publicQuery.input(z.object({
    token: z.string(),
    venueId: z.number().int().positive(),
    menuItemId: z.number().int().positive(),
    isAvailable: z.boolean(),
    staffNote: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const existing = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.venueId, input.venueId), eq(inventory.menuItemId, input.menuItemId)))
      .limit(1);

    if (existing[0]) {
      await db.update(inventory)
        .set({
          isAvailable: input.isAvailable,
          staffNote: input.staffNote,
          soldOutAt: input.isAvailable ? null : new Date(),
          restockedAt: input.isAvailable ? new Date() : null,
        })
        .where(eq(inventory.id, existing[0].id));
    } else {
      await db.insert(inventory).values({
        venueId: input.venueId,
        menuItemId: input.menuItemId,
        isAvailable: input.isAvailable,
        staffNote: input.staffNote,
        soldOutAt: input.isAvailable ? null : new Date(),
        restockedAt: input.isAvailable ? new Date() : null,
      });
    }
    return { success: true };
  }),

  // ─── Loyalty ───
  getLoyaltyAccount: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string(),
  })).query(async ({ input }) => {
    const db = getDb();
    const results = await db
      .select()
      .from(loyaltyAccounts)
      .where(and(eq(loyaltyAccounts.venueId, input.venueId), eq(loyaltyAccounts.phone, input.phone)))
      .limit(1);
    return results[0] || null;
  }),

  createLoyaltyAccount: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string(),
    name: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    await db.insert(loyaltyAccounts).values({
      venueId: input.venueId,
      phone: input.phone,
      name: input.name,
    });
    return { success: true };
  }),

  addLoyaltyPoints: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    accountId: z.number().int().positive(),
    points: z.number().int().positive(),
    description: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    await db.insert(loyaltyTransactions).values({
      venueId: input.venueId,
      accountId: input.accountId,
      type: 'earn',
      points: input.points,
      description: input.description,
    });
    await db.update(loyaltyAccounts)
      .set({
        pointsBalance: sql`points_balance + ${input.points}`,
        totalLifetimePoints: sql`total_lifetime_points + ${input.points}`,
      })
      .where(eq(loyaltyAccounts.id, input.accountId));
    return { success: true };
  }),

  // ─── Locations ───
  listLocations: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    return db.select().from(locations).where(eq(locations.venueId, input.venueId));
  }),

  addLocation: publicQuery.input(z.object({
    token: z.string(),
    name: z.string().min(1).max(128),
    address: z.string().min(1).max(255),
    phone: z.string().optional(),
    isDefault: z.boolean().optional(),
    hoursWeekday: z.string().optional(),
    hoursSaturday: z.string().optional(),
    hoursSunday: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const result = await db.insert(locations).values({
      venueId,
      name: input.name,
      address: input.address,
      phone: input.phone,
      isDefault: input.isDefault ?? false,
      hoursWeekday: input.hoursWeekday,
      hoursSaturday: input.hoursSaturday,
      hoursSunday: input.hoursSunday,
    });
    return { locationId: Number(result[0].insertId) };
  }),

  updateLocation: publicQuery.input(z.object({
    token: z.string(),
    locationId: z.number().int().positive(),
    name: z.string().min(1).max(128).optional(),
    address: z.string().min(1).max(255).optional(),
    phone: z.string().optional(),
    isDefault: z.boolean().optional(),
    hoursWeekday: z.string().optional(),
    hoursSaturday: z.string().optional(),
    hoursSunday: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const loc = await db.select().from(locations).where(eq(locations.id, input.locationId)).limit(1);
    if (!loc[0] || loc[0].venueId !== venueId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });
    }
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.address !== undefined) updates.address = input.address;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.isDefault !== undefined) updates.isDefault = input.isDefault;
    if (input.hoursWeekday !== undefined) updates.hoursWeekday = input.hoursWeekday;
    if (input.hoursSaturday !== undefined) updates.hoursSaturday = input.hoursSaturday;
    if (input.hoursSunday !== undefined) updates.hoursSunday = input.hoursSunday;
    if (Object.keys(updates).length > 0) {
      await db.update(locations).set(updates).where(eq(locations.id, input.locationId));
    }
    return { success: true };
  }),

  deleteLocation: publicQuery.input(z.object({
    token: z.string(),
    locationId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const loc = await db.select().from(locations).where(eq(locations.id, input.locationId)).limit(1);
    if (!loc[0] || loc[0].venueId !== venueId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });
    }
    const orderCheck = await db.select({ id: orders.id }).from(orders)
      .where(eq(orders.locationId, input.locationId)).limit(1);
    if (orderCheck[0]) {
      throw new TRPCError({ code: "CONFLICT", message: "Cannot delete a location that has existing orders" });
    }
    await db.delete(locations).where(eq(locations.id, input.locationId));
    return { success: true };
  }),

  // ─── Customer Preferences ───
  getCustomerPreferences: publicQuery
    .input(z.object({
      venueId: z.number().int().positive(),
      phone: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const results = await db
        .select()
        .from(customerPreferences)
        .where(and(
          eq(customerPreferences.venueId, input.venueId),
          eq(customerPreferences.phone, input.phone)
        ))
        .limit(1);
      return results[0] ?? null;
    }),

  upsertCustomerPreferences: publicQuery
    .input(z.object({
      venueId: z.number().int().positive(),
      phone: z.string().min(1),
      milk: z.string().optional(),
      sugar: z.string().optional(),
      temperature: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(customerPreferences)
        .where(and(
          eq(customerPreferences.venueId, input.venueId),
          eq(customerPreferences.phone, input.phone)
        ))
        .limit(1);

      if (existing[0]) {
        const updates: Record<string, unknown> = {};
        if (input.milk !== undefined) updates.milk = input.milk;
        if (input.sugar !== undefined) updates.sugar = input.sugar;
        if (input.temperature !== undefined) updates.temperature = input.temperature;
        if (input.notes !== undefined) updates.notes = input.notes;
        if (Object.keys(updates).length > 0) {
          await db.update(customerPreferences).set(updates).where(eq(customerPreferences.id, existing[0].id));
        }
      } else {
        await db.insert(customerPreferences).values({
          venueId: input.venueId,
          phone: input.phone,
          milk: input.milk,
          sugar: input.sugar,
          temperature: input.temperature,
          notes: input.notes,
        });
      }
      return { success: true };
    }),

  // ─── Reviews ───
  submitReview: publicQuery
    .input(z.object({
      orderId: z.number().int().positive(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Derive venueId and customerName from the order — never trust client
      const orderResults = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      if (!orderResults[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }
      const order = orderResults[0];

      // Order must be completed before a review can be submitted
      if (order.status !== 'completed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order is not yet completed' });
      }

      // One review per order — schema has no unique index, enforce here
      const existingReview = await db
        .select()
        .from(reviews)
        .where(eq(reviews.orderId, input.orderId))
        .limit(1);
      if (existingReview[0]) {
        throw new TRPCError({ code: 'CONFLICT', message: 'A review already exists for this order' });
      }

      await db.insert(reviews).values({
        venueId: order.venueId,
        orderId: input.orderId,
        customerName: order.customerName,
        rating: input.rating,
        comment: input.comment,
      });

      return { success: true };
    }),

  listReviews: publicQuery
    .input(z.object({
      venueId: z.number().int().positive(),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(reviews)
        .where(eq(reviews.venueId, input.venueId))
        .orderBy(desc(reviews.createdAt))
        .limit(input.limit);
    }),

  // ─── Gift Cards ───
  createGiftCard: publicQuery.input(z.object({
    token: z.string(),
    amount: z.number().positive(),
    senderName: z.string().optional(),
    recipientName: z.string().optional(),
    recipientPhone: z.string().optional(),
    message: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const code = generateGiftCardCode();
    const [result] = await db.insert(giftCards).values({
      venueId,
      code,
      amount: String(input.amount.toFixed(2)),
      balance: String(input.amount.toFixed(2)),
      senderName: input.senderName,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      message: input.message,
    });
    return { id: Number(result.insertId), code };
  }),

  listGiftCards: publicQuery.input(z.object({
    token: z.string(),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    return db.select().from(giftCards)
      .where(eq(giftCards.venueId, venueId))
      .orderBy(desc(giftCards.createdAt));
  }),

  redeemGiftCard: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    code: z.string().min(1),
    orderTotal: z.number().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(giftCards)
      .where(and(
        eq(giftCards.venueId, input.venueId),
        eq(giftCards.code, input.code.toUpperCase()),
      ))
      .limit(1);
    const card = results[0];
    if (!card) throw new TRPCError({ code: 'NOT_FOUND', message: 'Gift card not found' });
    if (Number(card.balance) <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Gift card has no remaining balance' });

    const discount = Math.min(Number(card.balance), input.orderTotal);
    const newBalance = Number(card.balance) - discount;
    await db.update(giftCards)
      .set({ balance: String(newBalance.toFixed(2)), isRedeemed: newBalance <= 0 })
      .where(eq(giftCards.id, card.id));

    return { discount, remainingBalance: newBalance };
  }),

  // ─── Subscription Passes ───
  upsertPassConfig: publicQuery.input(z.object({
    token: z.string(),
    name: z.string().min(1),
    totalCredits: z.number().int().positive(),
    price: z.number().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const venueResults = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
    const venue = venueResults[0];
    if (!venue) throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue not found' });

    const existing = (venue.settingsJson as Record<string, unknown>) ?? {};
    const updated = {
      ...existing,
      passConfig: { name: input.name, totalCredits: input.totalCredits, price: input.price },
    };
    await db.update(venues).set({ settingsJson: updated }).where(eq(venues.id, venueId));
    return { success: true };
  }),

  getPassConfig: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(venues).where(eq(venues.id, input.venueId)).limit(1);
    const venue = results[0];
    if (!venue) return null;
    return (venue.settingsJson as any)?.passConfig ?? null;
  }),

  purchasePass: publicQuery.input(z.object({
    token: z.string(),
    phone: z.string().min(1),
    name: z.string().min(1),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const venueResults = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
    const venue = venueResults[0];
    if (!venue) throw new TRPCError({ code: 'NOT_FOUND', message: 'Venue not found' });

    const passConfig = (venue.settingsJson as any)?.passConfig;
    if (!passConfig) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No pass configured for this venue' });

    const [result] = await db.insert(subscriptionPasses).values({
      venueId,
      phone: input.phone,
      name: input.name,
      totalCredits: passConfig.totalCredits,
      remainingCredits: passConfig.totalCredits,
      price: String(Number(passConfig.price).toFixed(2)),
    });
    return { id: Number(result.insertId), remainingCredits: passConfig.totalCredits };
  }),

  getPassByPhone: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string().min(1),
  })).query(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(subscriptionPasses)
      .where(and(
        eq(subscriptionPasses.venueId, input.venueId),
        eq(subscriptionPasses.phone, input.phone),
        eq(subscriptionPasses.isActive, true),
      ))
      .orderBy(desc(subscriptionPasses.createdAt))
      .limit(1);
    return results[0] ?? null;
  }),

  usePassCredit: publicQuery.input(z.object({
    passId: z.number().int().positive(),
    venueId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const results = await db.select().from(subscriptionPasses)
      .where(and(
        eq(subscriptionPasses.id, input.passId),
        eq(subscriptionPasses.venueId, input.venueId),
        eq(subscriptionPasses.isActive, true),
      ))
      .limit(1);
    const pass = results[0];
    if (!pass) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pass not found' });
    if (pass.remainingCredits <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No remaining credits' });

    const newCredits = pass.remainingCredits - 1;
    await db.update(subscriptionPasses)
      .set({
        remainingCredits: sql`remaining_credits - 1`,
        isActive: newCredits > 0,
      })
      .where(eq(subscriptionPasses.id, pass.id));

    return { remainingCredits: newCredits };
  }),

  // ─── Catering Requests ───
  submitCateringRequest: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
    eventDate: z.string().min(1),
    guestCount: z.number().int().min(1),
    details: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const result = await db.insert(cateringRequests).values({
      venueId: input.venueId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      eventDate: input.eventDate,
      guestCount: input.guestCount,
      details: input.details,
    });
    return { requestId: Number(result[0].insertId) };
  }),

  listCateringRequests: publicQuery.input(z.object({
    token: z.string(),
    status: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const conditions = [eq(cateringRequests.venueId, venueId)];
    if (input.status) {
      conditions.push(eq(cateringRequests.status, input.status as any));
    }
    return db
      .select()
      .from(cateringRequests)
      .where(and(...conditions))
      .orderBy(desc(cateringRequests.createdAt))
      .limit(input.limit);
  }),

  updateCateringStatus: publicQuery.input(z.object({
    token: z.string(),
    requestId: z.number().int().positive(),
    status: z.enum(["new", "quoted", "confirmed", "completed"]),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const req = await db
      .select()
      .from(cateringRequests)
      .where(eq(cateringRequests.id, input.requestId))
      .limit(1);
    if (!req[0] || req[0].venueId !== venueId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Catering request not found" });
    }
    await db
      .update(cateringRequests)
      .set({ status: input.status })
      .where(eq(cateringRequests.id, input.requestId));
    return { success: true };
  }),
});
