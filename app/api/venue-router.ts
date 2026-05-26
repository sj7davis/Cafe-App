import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { venues, venueOwners, orders, orderItems, menuItems, inventory, locations, loyaltyAccounts, loyaltyTransactions, customerPreferences, reviews, giftCards, subscriptionPasses, cateringRequests, menuItemModifiers, discountCodes, bundles, abandonedCarts, customerAccounts } from "@db/schema";
import { eq, and, desc, sql, gte, sum, isNull, lte, inArray, count, not } from "drizzle-orm";
import { hash, compare } from "bcrypt-ts";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { env } from "./lib/env";
import { sendEmail } from "./lib/email";
import { sendSms } from "./lib/sms";

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
    }).returning({ id: venues.id });

    // Create owner
    const passwordHash = await hash(input.password, 10);
    await db.insert(venueOwners).values({
      venueId: venueResult.id,
      email: input.email,
      name: input.name,
      passwordHash,
    });

    return { venueId: venueResult.id, slug: input.venueSlug };
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
    statuses: z.array(z.string()).optional(), // multi-status filter (e.g. for KDS)
    limit: z.number().int().min(1).max(200).default(50),
    locationId: z.number().int().positive().optional(),
  })).query(async ({ input }) => {
    const db = getDb();
    const conditions = [eq(orders.venueId, input.venueId)];
    if (input.statuses && input.statuses.length > 0) {
      conditions.push(sql`${orders.status} = ANY(${input.statuses})`);
    } else if (input.status) {
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

    // EMAIL-02b + SMS: send "your order is ready" when status → ready
    if (input.status === "ready") {
      const readyOrder = await db
        .select({ customerEmail: orders.customerEmail, customerName: orders.customerName, orderNumber: orders.orderNumber, customerPhone: orders.customerPhone })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      const ro = readyOrder[0];
      if (ro?.customerEmail) {
        sendEmail({
          to: ro.customerEmail,
          subject: "Your order is ready! ☕",
          html: `<p>Hi ${ro.customerName},</p>
<p>Great news — your order <strong>${ro.orderNumber}</strong> is <strong>ready for pickup</strong>!</p>
<p>Head to the counter and we'll have it waiting for you.</p>`,
        });
      }
      if (ro?.customerPhone) {
        void sendSms(ro.customerPhone, `Your order #${ro.orderNumber} is ready for pickup! ☕`);
      }
    }

    // SMS: notify customer when status → confirmed
    if (input.status === "confirmed") {
      const confirmedOrder = await db
        .select({ customerPhone: orders.customerPhone, orderNumber: orders.orderNumber })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      const co2 = confirmedOrder[0];
      if (co2?.customerPhone) {
        void sendSms(co2.customerPhone, `Your order #${co2.orderNumber} has been confirmed and is being prepared.`);
      }
    }

    // EMAIL-03: send review request when order marked completed
    if (input.status === "completed") {
      const completedOrder = await db
        .select({
          customerEmail: orders.customerEmail,
          customerName: orders.customerName,
          orderNumber: orders.orderNumber,
          id: orders.id,
        })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      const co = completedOrder[0];
      if (co?.customerEmail) {
        sendEmail({
          to: co.customerEmail,
          subject: "How was your order?",
          html: `<p>Hi ${co.customerName},</p>
<p>Thanks for your order <strong>${co.orderNumber}</strong>!</p>
<p>We'd love your feedback. Leave a review:</p>
<p><a href="${env.appUrl}/review/${co.id}">${env.appUrl}/review/${co.id}</a></p>`,
        });
      }
    }

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
      modifiers: z.array(z.object({
        group: z.string(),
        option: z.string(),
        priceAdj: z.number().default(0),
      })).optional(),
    })),
    locationId: z.number().int().positive().optional(),
    customerEmail: z.string().email().optional(),
    tipAmount: z.number().min(0).default(0),
    discountCode: z.string().optional(),
    discountAmount: z.number().min(0).default(0),
    stripeSessionId: z.string().optional(),
    earnLoyalty: z.boolean().default(true),
    tableNumber: z.string().optional(),
    orderType: z.string().optional(),
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
      // Add modifier price adjustments
      const modifierAdj = (item.modifiers ?? []).reduce((sum, m) => sum + m.priceAdj, 0);
      const effectivePrice = unitPrice + modifierAdj;
      totalAmount += effectivePrice * item.quantity;
      // Format modifiers into note
      const modifierStr = (item.modifiers ?? []).length > 0
        ? `[${(item.modifiers ?? []).map(m => `${m.group}: ${m.option}${m.priceAdj ? ` +$${m.priceAdj.toFixed(2)}` : ''}`).join(' | ')}]`
        : '';
      const fullNote = [modifierStr, item.note].filter(Boolean).join(' ');
      itemDetails.push({
        menuItemId: item.menuItemId,
        itemName: mi[0].name,
        quantity: item.quantity,
        unitPrice: effectivePrice,
        note: fullNote || undefined,
      });
    }

    // Generate order number
    const orderNumber = `B1-${Date.now().toString(36).toUpperCase()}`;

    // Apply discount
    const discountedTotal = Math.max(0, totalAmount - (input.discountAmount ?? 0));
    const finalTotal = discountedTotal + (input.tipAmount ?? 0);

    // Create order
    const [orderResult] = await db.insert(orders).values({
      venueId: input.venueId,
      orderNumber,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      pickupTime: input.pickupTime,
      orderNote: input.orderNote,
      paymentMethod: input.paymentMethod as any,
      totalAmount: finalTotal.toFixed(2),
      locationId: input.locationId,
      customerEmail: input.customerEmail,
      tipAmount: input.tipAmount ? input.tipAmount.toFixed(2) : "0",
      discountCode: input.discountCode ?? null,
      discountAmount: input.discountAmount ? input.discountAmount.toFixed(2) : "0",
      stripeSessionId: input.stripeSessionId ?? null,
      tableNumber: input.tableNumber ?? null,
      orderType: input.orderType ?? "pickup",
    }).returning({ id: orders.id });

    const orderId = orderResult.id;

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

    // LOYALTY: auto-earn 1 point per $1 spent (rounded down, excluding tip)
    if (input.earnLoyalty && discountedTotal >= 1) {
      const pointsEarned = Math.floor(discountedTotal);
      try {
        let loyaltyAcc = await db.select().from(loyaltyAccounts)
          .where(and(eq(loyaltyAccounts.venueId, input.venueId), eq(loyaltyAccounts.phone, input.customerPhone)))
          .limit(1);
        if (!loyaltyAcc[0]) {
          await db.insert(loyaltyAccounts).values({
            venueId: input.venueId,
            phone: input.customerPhone,
            name: input.customerName,
            pointsBalance: 0,
            totalLifetimePoints: 0,
          });
          loyaltyAcc = await db.select().from(loyaltyAccounts)
            .where(and(eq(loyaltyAccounts.venueId, input.venueId), eq(loyaltyAccounts.phone, input.customerPhone)))
            .limit(1);
        }
        const acc = loyaltyAcc[0];
        if (acc) {
          await db.update(loyaltyAccounts).set({
            pointsBalance: acc.pointsBalance + pointsEarned,
            totalLifetimePoints: acc.totalLifetimePoints + pointsEarned,
          }).where(eq(loyaltyAccounts.id, acc.id));
          await db.insert(loyaltyTransactions).values({
            venueId: input.venueId,
            accountId: acc.id,
            type: "earn",
            points: pointsEarned,
            description: `Order ${orderNumber} — earned ${pointsEarned} pts`,
            orderId,
          });
        }
      } catch {
        // Non-blocking — loyalty failure never blocks order
      }
    }

    // DISCOUNT CODE: increment usage count
    if (input.discountCode) {
      try {
        await db.update(discountCodes).set({ usedCount: sql`used_count + 1` })
          .where(and(
            eq(discountCodes.venueId, input.venueId),
            eq(discountCodes.code, input.discountCode.toUpperCase()),
          ));
      } catch { /* non-blocking */ }
    }

    // EMAIL-01 + EMAIL-02: send post-order emails (non-blocking; never throw)
    const ownerRow = await db
      .select({ email: venueOwners.email })
      .from(venueOwners)
      .where(eq(venueOwners.venueId, input.venueId))
      .limit(1);
    const ownerEmail = ownerRow[0]?.email;

    const itemLines = itemDetails
      .map(i => `<li>${i.quantity}x ${i.itemName} — $${(i.unitPrice * i.quantity).toFixed(2)}</li>`)
      .join("");

    // EMAIL-01: customer confirmation
    if (input.customerEmail) {
      sendEmail({
        to: input.customerEmail,
        subject: `Order confirmed — ${orderNumber}`,
        html: `<p>Hi ${input.customerName},</p>
<p>Your order <strong>${orderNumber}</strong> has been received!</p>
<ul>${itemLines}</ul>
<p><strong>Pickup time:</strong> ${input.pickupTime}</p>
<p><strong>Total:</strong> $${finalTotal.toFixed(2)}</p>
<p>Track your order: <a href="${env.appUrl}/order/${orderNumber}">${env.appUrl}/order/${orderNumber}</a></p>`,
      });
    }

    // EMAIL-02: owner alert
    if (ownerEmail) {
      sendEmail({
        to: ownerEmail,
        subject: `New order — ${orderNumber}`,
        html: `<p>A new order has been placed.</p>
<p><strong>Order:</strong> ${orderNumber}</p>
<p><strong>Customer:</strong> ${input.customerName} (${input.customerPhone})</p>
<ul>${itemLines}</ul>
<p><strong>Pickup time:</strong> ${input.pickupTime}</p>
<p><strong>Total:</strong> $${finalTotal.toFixed(2)}</p>`,
      });
    }

    // SMS: customer order confirmation (fire-and-forget)
    void sendSms(input.customerPhone, `Order #${orderNumber} confirmed! Pickup: ${input.pickupTime}. Total: $${finalTotal.toFixed(2)}`);

    return { orderId, orderNumber, totalAmount: finalTotal.toFixed(2) };
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
    recipientEmail: z.string().email().optional(),
    message: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    // Fetch venue name for email branding
    const venueRow = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, venueId)).limit(1);
    const venueName = venueRow[0]?.name ?? "the cafe";

    const code = generateGiftCardCode();
    const [result] = await db.insert(giftCards).values({
      venueId,
      code,
      amount: String(input.amount.toFixed(2)),
      balance: String(input.amount.toFixed(2)),
      senderName: input.senderName,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      recipientEmail: input.recipientEmail ?? null,
      message: input.message,
    }).returning({ id: giftCards.id });

    // EMAIL: send digital gift card to recipient
    if (input.recipientEmail) {
      sendEmail({
        to: input.recipientEmail,
        subject: `🎁 You've received a $${input.amount.toFixed(2)} gift card from ${venueName}!`,
        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
<h2>You've got a gift card! 🎉</h2>
${input.senderName ? `<p><strong>${input.senderName}</strong> sent you a gift card.</p>` : ""}
${input.message ? `<blockquote style="border-left:3px solid #5E8B8B;padding-left:1rem;color:#555">${input.message}</blockquote>` : ""}
<div style="background:#f9f9f9;border-radius:8px;padding:1.5rem;text-align:center;margin:1.5rem 0">
  <p style="margin:0;color:#666;font-size:0.875rem">Your gift card code</p>
  <p style="font-size:2rem;font-weight:bold;letter-spacing:0.2em;margin:0.5rem 0;color:#181818">${code}</p>
  <p style="margin:0;color:#5E8B8B;font-size:1.25rem">Value: $${input.amount.toFixed(2)}</p>
</div>
<p style="text-align:center;margin:1.5rem 0">
  <a href="${env.appUrl}/gift/${code}?v=${venueId}" style="display:inline-block;background:#5E8B8B;color:#fff;text-decoration:none;padding:0.75rem 2rem;border-radius:8px;font-weight:600">
    View &amp; Redeem Gift Card
  </a>
</p>
<p style="color:#666;font-size:0.875rem">Or use the code <strong>${code}</strong> at ${venueName} when ordering online or show it at the counter.</p>
<p style="color:#999;font-size:0.75rem">Gift cards do not expire.</p>
</div>`,
      });
    }

    return { id: result.id, code };
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
    }).returning({ id: subscriptionPasses.id });
    return { id: result.id, remainingCredits: passConfig.totalCredits };
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
    const [cateringResult] = await db.insert(cateringRequests).values({
      venueId: input.venueId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      eventDate: input.eventDate,
      guestCount: input.guestCount,
      details: input.details,
    }).returning({ id: cateringRequests.id });
    return { requestId: cateringResult.id };
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

  // ─── Customer Order History ───
  getOrdersByPhone: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string().min(1),
    limit: z.number().int().min(1).max(20).default(10),
  })).query(async ({ input }) => {
    const db = getDb();
    const results = await db
      .select()
      .from(orders)
      .where(and(eq(orders.venueId, input.venueId), eq(orders.customerPhone, input.phone)))
      .orderBy(desc(orders.createdAt))
      .limit(input.limit);
    return results;
  }),

  getOrderItemsByOrderId: publicQuery.input(z.object({
    orderId: z.number().int().positive(),
    venueId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    // Verify order belongs to venue
    const order = await db.select({ id: orders.id }).from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.venueId, input.venueId))).limit(1);
    if (!order[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
    return db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
  }),

  // ─── Daily Summary ───
  getDailySummary: publicQuery.input(z.object({
    token: z.string(),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.venueId, venueId), gte(orders.createdAt, today)))
      .orderBy(desc(orders.createdAt));

    const totalRevenue = todayOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const pendingCount = todayOrders.filter(o => o.status === 'pending').length;
    const completedCount = todayOrders.filter(o => o.status === 'completed').length;

    // Top items from order items
    const todayOrderIds = todayOrders.map(o => o.id);
    let topItems: { name: string; qty: number }[] = [];
    if (todayOrderIds.length > 0) {
      const allItems = await db
        .select()
        .from(orderItems)
        .where(sql`order_id = ANY(ARRAY[${sql.raw(todayOrderIds.join(','))}]::int[])`);
      const itemCounts: Record<string, number> = {};
      for (const item of allItems) {
        itemCounts[item.itemName] = (itemCounts[item.itemName] ?? 0) + item.quantity;
      }
      topItems = Object.entries(itemCounts)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);
    }

    return {
      date: today.toISOString().slice(0, 10),
      orderCount: todayOrders.length,
      totalRevenue,
      pendingCount,
      completedCount,
      topItems,
    };
  }),

  sendDailySummaryEmail: publicQuery.input(z.object({
    token: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await db.select().from(orders)
      .where(and(eq(orders.venueId, venueId), gte(orders.createdAt, today)));

    const totalRevenue = todayOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const completedCount = todayOrders.filter(o => o.status === 'completed').length;

    const todayOrderIds = todayOrders.map(o => o.id);
    let topItems: { name: string; qty: number }[] = [];
    if (todayOrderIds.length > 0) {
      const allItems = await db.select().from(orderItems)
        .where(sql`order_id = ANY(ARRAY[${sql.raw(todayOrderIds.join(','))}]::int[])`);
      const itemCounts: Record<string, number> = {};
      for (const item of allItems) {
        itemCounts[item.itemName] = (itemCounts[item.itemName] ?? 0) + item.quantity;
      }
      topItems = Object.entries(itemCounts).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
    }

    const ownerRow = await db.select({ email: venueOwners.email, name: venueOwners.name })
      .from(venueOwners).where(eq(venueOwners.venueId, venueId)).limit(1);
    const owner = ownerRow[0];
    if (!owner?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "No owner email on file" });

    const venueRow = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, venueId)).limit(1);
    const venueName = venueRow[0]?.name ?? "Your Venue";

    const dateStr = today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
    const topItemsHtml = topItems.length > 0
      ? `<ul>${topItems.map(i => `<li>${i.qty}× ${i.name}</li>`).join('')}</ul>`
      : '<p>No items yet today.</p>';

    await sendEmail({
      to: owner.email,
      subject: `${venueName} — Daily Summary for ${dateStr}`,
      html: `<h2>${venueName} — Daily Summary</h2>
<p><strong>Date:</strong> ${dateStr}</p>
<hr/>
<p>📦 <strong>Total Orders:</strong> ${todayOrders.length}</p>
<p>✅ <strong>Completed:</strong> ${completedCount}</p>
<p>💰 <strong>Revenue:</strong> $${totalRevenue.toFixed(2)}</p>
<hr/>
<p><strong>Top Items:</strong></p>${topItemsHtml}
<hr/>
<p style="color:#888;font-size:12px">B1 Platform — sent on demand from your Owner Dashboard</p>`,
    });

    return { success: true };
  }),

  // ─── Menu Item Modifiers ───
  listMenuModifiers: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    menuItemId: z.number().int().positive().optional(),
  })).query(async ({ input }) => {
    const db = getDb();
    const conditions = [eq(menuItemModifiers.venueId, input.venueId)];
    if (input.menuItemId) conditions.push(eq(menuItemModifiers.menuItemId, input.menuItemId));
    return db.select().from(menuItemModifiers).where(and(...conditions)).orderBy(menuItemModifiers.sortOrder, menuItemModifiers.id);
  }),

  // Public version — no token required (needed at checkout)
  listMenuModifiersPublic: publicQuery.input(z.object({
    menuItemId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    return db.select().from(menuItemModifiers)
      .where(eq(menuItemModifiers.menuItemId, input.menuItemId))
      .orderBy(menuItemModifiers.sortOrder, menuItemModifiers.id);
  }),

  addMenuModifier: publicQuery.input(z.object({
    token: z.string(),
    menuItemId: z.number().int().positive(),
    name: z.string().min(1).max(64),
    options: z.array(z.object({
      name: z.string().min(1),
      priceAdj: z.number().default(0),
    })).min(1),
    required: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    // Verify menu item belongs to venue
    const item = await db.select({ id: menuItems.id }).from(menuItems)
      .where(and(eq(menuItems.id, input.menuItemId), eq(menuItems.venueId, venueId))).limit(1);
    if (!item[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Menu item not found" });

    const [result] = await db.insert(menuItemModifiers).values({
      venueId,
      menuItemId: input.menuItemId,
      name: input.name,
      options: input.options,
      required: input.required,
      sortOrder: input.sortOrder,
    }).returning({ id: menuItemModifiers.id });

    return { id: result.id };
  }),

  updateMenuModifier: publicQuery.input(z.object({
    token: z.string(),
    modifierId: z.number().int().positive(),
    name: z.string().min(1).max(64).optional(),
    options: z.array(z.object({
      name: z.string().min(1),
      priceAdj: z.number().default(0),
    })).min(1).optional(),
    required: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const mod = await db.select().from(menuItemModifiers)
      .where(and(eq(menuItemModifiers.id, input.modifierId), eq(menuItemModifiers.venueId, venueId))).limit(1);
    if (!mod[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Modifier not found" });

    const updates: Partial<typeof menuItemModifiers.$inferInsert> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.options !== undefined) updates.options = input.options;
    if (input.required !== undefined) updates.required = input.required;
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

    await db.update(menuItemModifiers).set(updates).where(eq(menuItemModifiers.id, input.modifierId));
    return { success: true };
  }),

  deleteMenuModifier: publicQuery.input(z.object({
    token: z.string(),
    modifierId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    await db.delete(menuItemModifiers)
      .where(and(eq(menuItemModifiers.id, input.modifierId), eq(menuItemModifiers.venueId, venueId)));
    return { success: true };
  }),

  // ─── Bundles ───
  listBundlesPublic: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    const rows = await db.select().from(bundles)
      .where(and(eq(bundles.venueId, input.venueId), eq(bundles.isActive, true)));
    const result = [];
    for (const bundle of rows) {
      const slugList = bundle.itemSlugs.split(",").map(s => s.trim()).filter(Boolean);
      let items: { slug: string; name: string; price: string }[] = [];
      if (slugList.length > 0) {
        const menuRows = await db.select({ slug: menuItems.slug, name: menuItems.name, price: menuItems.price })
          .from(menuItems)
          .where(and(eq(menuItems.venueId, input.venueId), inArray(menuItems.slug, slugList)));
        items = menuRows.map(r => ({ slug: r.slug, name: r.name, price: r.price }));
      }
      result.push({
        id: bundle.id,
        name: bundle.name,
        description: bundle.description,
        itemSlugs: bundle.itemSlugs,
        bundlePrice: bundle.bundlePrice,
        items,
      });
    }
    return result;
  }),

  listBundles: publicQuery.input(z.object({
    token: z.string(),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    return db.select().from(bundles).where(eq(bundles.venueId, venueId)).orderBy(desc(bundles.createdAt));
  }),

  createBundle: publicQuery.input(z.object({
    token: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
    itemSlugs: z.string().min(1),
    bundlePrice: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const [result] = await db.insert(bundles).values({
      venueId,
      name: input.name,
      description: input.description,
      itemSlugs: input.itemSlugs,
      bundlePrice: input.bundlePrice,
    }).returning();
    return result;
  }),

  updateBundle: publicQuery.input(z.object({
    token: z.string(),
    id: z.number().int().positive(),
    name: z.string().optional(),
    description: z.string().optional(),
    itemSlugs: z.string().optional(),
    bundlePrice: z.string().optional(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const { token: _t, id, ...rest } = input;
    const updates: Record<string, unknown> = {};
    if (rest.name !== undefined) updates.name = rest.name;
    if (rest.description !== undefined) updates.description = rest.description;
    if (rest.itemSlugs !== undefined) updates.itemSlugs = rest.itemSlugs;
    if (rest.bundlePrice !== undefined) updates.bundlePrice = rest.bundlePrice;
    if (rest.isActive !== undefined) updates.isActive = rest.isActive;
    await db.update(bundles).set(updates).where(and(eq(bundles.id, id), eq(bundles.venueId, venueId)));
    return { success: true };
  }),

  deleteBundle: publicQuery.input(z.object({
    token: z.string(),
    id: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    await db.delete(bundles).where(and(eq(bundles.id, input.id), eq(bundles.venueId, venueId)));
    return { success: true };
  }),

  // ─── Happy Hour ───
  setHappyHour: publicQuery.input(z.object({
    token: z.string(),
    enabled: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    discountPercent: z.number().min(0).max(100),
    label: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const venueRows = await db.select({ settingsJson: venues.settingsJson }).from(venues).where(eq(venues.id, venueId)).limit(1);
    const existing = (venueRows[0]?.settingsJson as Record<string, unknown> | null) ?? {};
    const updated = {
      ...existing,
      happyHour: {
        enabled: input.enabled,
        startTime: input.startTime,
        endTime: input.endTime,
        discountPercent: input.discountPercent,
        label: input.label ?? "Happy Hour",
      },
    };
    await db.update(venues).set({ settingsJson: updated, updatedAt: new Date() }).where(eq(venues.id, venueId));
    return updated;
  }),

  getHappyHour: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    const venueRows = await db.select({ settingsJson: venues.settingsJson }).from(venues).where(eq(venues.id, input.venueId)).limit(1);
    const settings = venueRows[0]?.settingsJson as Record<string, unknown> | null;
    return (settings?.happyHour as Record<string, unknown> | undefined) ?? null;
  }),

  // ─── Upsell Suggestions ───
  getUpsellSuggestions: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    slugs: z.array(z.string()),
  })).query(async ({ input }) => {
    if (input.slugs.length === 0) return [];
    const db = getDb();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Find menu item ids for the given slugs
    const cartItems = await db.select({ id: menuItems.id, slug: menuItems.slug })
      .from(menuItems)
      .where(and(eq(menuItems.venueId, input.venueId), inArray(menuItems.slug, input.slugs)));
    const cartItemIds = cartItems.map(i => i.id);
    if (cartItemIds.length === 0) return [];

    // Find recent orders containing any of those items
    const matchingOrderItems = await db.select({ orderId: orderItems.orderId })
      .from(orderItems)
      .innerJoin(orders, and(eq(orderItems.orderId, orders.id), eq(orders.venueId, input.venueId), gte(orders.createdAt, ninetyDaysAgo)))
      .where(inArray(orderItems.menuItemId, cartItemIds));
    const orderIds = [...new Set(matchingOrderItems.map(r => r.orderId))].slice(0, 200);
    if (orderIds.length === 0) return [];

    // Find co-purchased items in those orders, excluding cart items
    const coPurchased = await db.select({
      menuItemId: orderItems.menuItemId,
      cnt: count(orderItems.menuItemId),
    })
      .from(orderItems)
      .where(and(inArray(orderItems.orderId, orderIds), not(inArray(orderItems.menuItemId, cartItemIds))))
      .groupBy(orderItems.menuItemId)
      .orderBy(desc(count(orderItems.menuItemId)))
      .limit(3);

    if (coPurchased.length === 0) return [];

    const topIds = coPurchased.map(r => r.menuItemId);
    const topItems = await db.select().from(menuItems).where(inArray(menuItems.id, topIds));
    return topItems;
  }),

  // ─── Inventory Quantity ───
  setInventoryQuantity: publicQuery.input(z.object({
    token: z.string(),
    menuItemId: z.number().int().positive(),
    quantity: z.number().int().min(0),
    quantityAlert: z.number().int().min(0).optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const existing = await db.select().from(inventory)
      .where(and(eq(inventory.venueId, venueId), eq(inventory.menuItemId, input.menuItemId)))
      .limit(1);
    if (existing[0]) {
      const updateData: Record<string, unknown> = {
        quantity: input.quantity,
        lastRestockedAt: new Date(),
      };
      if (input.quantityAlert !== undefined) updateData.quantityAlert = input.quantityAlert;
      await db.update(inventory).set(updateData).where(eq(inventory.id, existing[0].id));
      const updated = await db.select().from(inventory).where(eq(inventory.id, existing[0].id)).limit(1);
      return updated[0];
    } else {
      const [inserted] = await db.insert(inventory).values({
        venueId,
        menuItemId: input.menuItemId,
        quantity: input.quantity,
        quantityAlert: input.quantityAlert,
        lastRestockedAt: new Date(),
        isAvailable: true,
      }).returning();
      return inserted;
    }
  }),

  getInventoryLevels: publicQuery.input(z.object({
    token: z.string(),
  })).query(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const rows = await db.select({
      id: inventory.id,
      menuItemId: inventory.menuItemId,
      itemName: menuItems.name,
      quantity: inventory.quantity,
      quantityAlert: inventory.quantityAlert,
      isAvailable: inventory.isAvailable,
      lastRestockedAt: inventory.lastRestockedAt,
      staffNote: inventory.staffNote,
    })
      .from(inventory)
      .innerJoin(menuItems, eq(inventory.menuItemId, menuItems.id))
      .where(eq(inventory.venueId, venueId))
      .orderBy(sql`${inventory.quantity} asc nulls first`);
    return rows;
  }),

  // ─── Abandoned Carts ───
  saveAbandonedCart: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string().optional(),
    email: z.string().optional(),
    customerName: z.string().optional(),
    itemsJson: z.string(),
    totalAmount: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    if (input.phone) {
      const existing = await db.select({ id: abandonedCarts.id }).from(abandonedCarts)
        .where(and(
          eq(abandonedCarts.venueId, input.venueId),
          eq(abandonedCarts.phone, input.phone),
          eq(abandonedCarts.isRecovered, false),
        ))
        .limit(1);
      if (existing[0]) {
        await db.update(abandonedCarts).set({
          itemsJson: input.itemsJson,
          totalAmount: input.totalAmount,
          customerName: input.customerName,
          email: input.email ?? null,
        }).where(eq(abandonedCarts.id, existing[0].id));
        return { id: existing[0].id };
      }
    }
    const [inserted] = await db.insert(abandonedCarts).values({
      venueId: input.venueId,
      phone: input.phone ?? null,
      email: input.email ?? null,
      customerName: input.customerName ?? null,
      itemsJson: input.itemsJson,
      totalAmount: input.totalAmount,
    }).returning({ id: abandonedCarts.id });
    return { id: inserted.id };
  }),

  clearAbandonedCart: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
    phone: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    await db.update(abandonedCarts).set({ isRecovered: true })
      .where(and(
        eq(abandonedCarts.venueId, input.venueId),
        eq(abandonedCarts.phone, input.phone),
      ));
    return { success: true };
  }),

  // ─── Catering Quote Email ───
  sendCateringQuote: publicQuery.input(z.object({
    token: z.string(),
    requestId: z.number().int().positive(),
    quoteText: z.string().min(1),
    totalAmount: z.string(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const reqRows = await db.select().from(cateringRequests)
      .where(and(eq(cateringRequests.id, input.requestId), eq(cateringRequests.venueId, venueId)))
      .limit(1);
    const req = reqRows[0];
    if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Catering request not found" });
    if (!req.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Catering request has no email address" });

    const venueRow = await db.select({ name: venues.name, phone: venues.phone, address: venues.address })
      .from(venues).where(eq(venues.id, venueId)).limit(1);
    const venue = venueRow[0];
    const venueName = venue?.name ?? "the café";

    await sendEmail({
      to: req.email,
      subject: `Your catering quote from ${venueName}`,
      html: `<h2>Your Catering Quote from ${venueName}</h2>
<p>Hi ${req.name},</p>
<p>Thank you for your catering enquiry. Here is your quote:</p>
<div style="background:#f9f9f9;border-radius:8px;padding:1.5rem;margin:1rem 0;white-space:pre-wrap">${input.quoteText}</div>
<p><strong>Total: $${input.totalAmount}</strong></p>
${venue?.phone ? `<p>Contact us: <a href="tel:${venue.phone}">${venue.phone}</a></p>` : ""}
${venue?.address ? `<p>Address: ${venue.address}</p>` : ""}
<p>We look forward to hearing from you!</p>
<p>Regards,<br/>${venueName}</p>`,
    });

    await db.update(cateringRequests).set({ status: "quoted" })
      .where(eq(cateringRequests.id, input.requestId));

    return { ok: true };
  }),

  // ─── Wait Time ───
  setWaitTime: publicQuery.input(z.object({
    token: z.string(),
    minutes: z.number().int().min(0).max(120),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const venueRows = await db.select({ settingsJson: venues.settingsJson }).from(venues).where(eq(venues.id, venueId)).limit(1);
    const existing = (venueRows[0]?.settingsJson as Record<string, unknown> | null) ?? {};

    await db.update(venues).set({
      settingsJson: { ...existing, waitTimeMinutes: input.minutes },
      updatedAt: new Date(),
    }).where(eq(venues.id, venueId));

    return { success: true, minutes: input.minutes };
  }),

  getWaitTime: publicQuery.input(z.object({
    venueId: z.number().int().positive(),
  })).query(async ({ input }) => {
    const db = getDb();
    const venueRows = await db.select({ settingsJson: venues.settingsJson }).from(venues).where(eq(venues.id, input.venueId)).limit(1);
    const settings = venueRows[0]?.settingsJson as Record<string, unknown> | null;
    return { minutes: (settings?.waitTimeMinutes as number | undefined) ?? 0 };
  }),

  // ─── Review Reply ───
  replyToReview: publicQuery.input(z.object({
    token: z.string(),
    reviewId: z.number().int().positive(),
    reply: z.string().min(1),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;

    const reviewRows = await db.select().from(reviews).where(eq(reviews.id, input.reviewId)).limit(1);
    const review = reviewRows[0];
    if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
    if (review.venueId !== venueId) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });

    await db.update(reviews).set({
      ownerReply: input.reply,
      ownerRepliedAt: new Date(),
    }).where(eq(reviews.id, input.reviewId));

    return { success: true };
  }),
});
