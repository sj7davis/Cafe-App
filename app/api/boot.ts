import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HttpBindings } from "@hono/node-server";
import { getRequestListener } from "@hono/node-server";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { addSseClient, removeSseClient, broadcastToVenue } from "./lib/sse-store";
import { getDb } from "./queries/connection";
import { venues, venueOwners, orders, orderItems, discountCodes, loyaltyAccounts, loyaltyTransactions, customerAccounts, abandonedCarts, xeroConnections, reservations, deliveryOrders, inventory, menuItems, giftCards, subscriptionPasses } from "@db/schema";
import { eq, and, gte, isNull, lte, sql } from "drizzle-orm";
import { sendEmail } from "./lib/email";
import { sendSms } from "./lib/sms";
import cron from "node-cron";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, extname } from "path";
import { randomBytes } from "crypto";
import { jwtVerify } from "jose";

const SQUARE_API_BASE = process.env.SQUARE_ENV === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

// ─── Image uploads ────────────────────────────────────────────────────────────
const UPLOAD_JWT_SECRET = new TextEncoder().encode(env.jwtSecret);
const UPLOADS_DIR = join(process.cwd(), "uploads");
try {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[uploads] directory ready: ${UPLOADS_DIR}`);
} catch (e) {
  console.warn(`[uploads] could not create directory ${UPLOADS_DIR}:`, e);
}

const app = new Hono<{ Bindings: HttpBindings }>();

// Allow cross-origin in dev; in prod the frontend is co-located
if (!env.isProduction) {
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
}

// Square OAuth callback
app.get("/api/square/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) {
    return c.json({ error: "Missing code or state" }, 400);
  }

  let venueId: number;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
    venueId = decoded.venueId;
  } catch {
    return c.json({ error: "Invalid state" }, 400);
  }

  try {
    const tokenRes = await fetch(`${SQUARE_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SQUARE_APP_ID,
        client_secret: process.env.SQUARE_APP_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${env.appUrl}/api/square/callback`,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Square token exchange failed", await tokenRes.text());
      return c.redirect("/dashboard?square=error");
    }

    const tokenData = await tokenRes.json() as any;

    const db = getDb();
    await db.update(venues).set({
      squareAccessToken: tokenData.access_token,
      squareRefreshToken: tokenData.refresh_token || null,
      squareMerchantId: tokenData.merchant_id || null,
      squareEnabled: true,
      squareTokenExpiresAt: tokenData.expires_at ? new Date(tokenData.expires_at) : null,
      updatedAt: new Date(),
    }).where(eq(venues.id, venueId));

    return c.redirect("/dashboard?square=connected");
  } catch (err) {
    console.error("Square OAuth callback error", err);
    return c.redirect("/dashboard?square=error");
  }
});

// Xero OAuth callback
app.get("/api/xero/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state) return c.redirect("/dashboard?xero=error");

  let venueId: number;
  try {
    venueId = JSON.parse(Buffer.from(state, "base64").toString("utf8")).venueId;
  } catch {
    return c.redirect("/dashboard?xero=error");
  }

  const xeroClientId = env.xeroClientId;
  const xeroClientSecret = env.xeroClientSecret;
  if (!xeroClientId || !xeroClientSecret) return c.redirect("/dashboard?xero=error");

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${xeroClientId}:${xeroClientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${env.appUrl}/api/xero/callback`,
      }).toString(),
    });

    if (!tokenRes.ok) {
      console.error("Xero token exchange failed:", await tokenRes.text());
      return c.redirect("/dashboard?xero=error");
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Get tenant ID (connected org)
    const connectionsRes = await fetch("https://api.xero.com/connections", {
      headers: { "Authorization": `Bearer ${tokenData.access_token}` },
    });
    const xeroConnsList = await connectionsRes.json() as Array<{ tenantId: string }>;
    const tenantId = xeroConnsList[0]?.tenantId;

    if (!tenantId) {
      console.error("Xero connections returned no tenant:", xeroConnsList);
      return c.redirect("/dashboard?xero=error");
    }

    const db = getDb();
    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 1800) * 1000);

    // Upsert xeroConnections
    const existing = await db
      .select({ id: xeroConnections.id })
      .from(xeroConnections)
      .where(eq(xeroConnections.venueId, venueId))
      .limit(1);

    if (existing[0]) {
      await db.update(xeroConnections).set({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tenantId,
        tokenExpiresAt: expiresAt,
        isConnected: true,
      }).where(eq(xeroConnections.venueId, venueId));
    } else {
      await db.insert(xeroConnections).values({
        venueId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tenantId,
        tokenExpiresAt: expiresAt,
        isConnected: true,
      });
    }

    return c.redirect("/dashboard?xero=connected");
  } catch (err) {
    console.error("Xero OAuth callback error:", err);
    return c.redirect("/dashboard?xero=error");
  }
});

// Lightspeed (Kounta) OAuth callback
app.get("/api/lightspeed/callback", async (c) => {
  const code = c.req.query("code");
  const stateRaw = c.req.query("state");
  if (!code || !stateRaw) return c.redirect(`${env.appUrl}/dashboard?error=lightspeed_denied`);
  try {
    const { venueId } = JSON.parse(Buffer.from(stateRaw, "base64").toString());
    const clientId = process.env.LIGHTSPEED_CLIENT_ID;
    const clientSecret = process.env.LIGHTSPEED_CLIENT_SECRET;
    if (!clientId || !clientSecret) return c.redirect(`${env.appUrl}/dashboard?error=lightspeed_not_configured`);

    const redirectUri = `${env.appUrl}/api/lightspeed/callback`;
    const tokenRes = await fetch("https://my.kounta.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    if (!tokenRes.ok) return c.redirect(`${env.appUrl}/dashboard?error=lightspeed_auth_failed`);
    const tokenData = await tokenRes.json() as any;

    // Fetch company info
    const companyRes = await fetch("https://api.kounta.com/v1/companies/me.json", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const companyData = await companyRes.json() as any;

    const db = getDb();
    const { posIntegrations } = await import("@db/schema");
    const { eq: eqDrizzle, and: andDrizzle } = await import("drizzle-orm");
    const existing = await db.select({ id: posIntegrations.id })
      .from(posIntegrations)
      .where(andDrizzle(eqDrizzle(posIntegrations.venueId, venueId), eqDrizzle(posIntegrations.provider, "lightspeed")))
      .limit(1);

    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;
    const values = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      accountId: String(companyData.id || ""),
      tokenExpiresAt: expiresAt,
      isActive: true,
      lastSyncAt: new Date(),
    };

    if (existing[0]) {
      await db.update(posIntegrations).set(values).where(eqDrizzle(posIntegrations.id, existing[0].id));
    } else {
      await db.insert(posIntegrations).values({ venueId, provider: "lightspeed", ...values });
    }

    return c.redirect(`${env.appUrl}/dashboard?connected=lightspeed`);
  } catch (e) {
    console.error("Lightspeed OAuth callback error:", e);
    return c.redirect(`${env.appUrl}/dashboard?error=lightspeed_error`);
  }
});

// Uber Eats order webhook
app.post("/api/webhooks/uber-eats", async (c) => {
  try {
    const body = await c.req.json() as any;
    const db = getDb();
    // Uber Eats sends events with type like "orders.notification"
    const event = body.meta?.status || body.type || "";
    if (!event.includes("order") && !event.includes("notification")) {
      return c.json({ received: true });
    }
    const order = body.data?.order || body.order || body;
    const venueId = Number(c.req.query("venue") || body.meta?.resource_href?.split("/")[3] || 0);
    if (!venueId) return c.json({ received: true });

    const items = (order.cart?.items || []).map((i: any) => ({
      name: i.title || i.name || "Item",
      quantity: i.quantity || 1,
      price: i.price?.unit_price?.total_price ? Number(i.price.unit_price.total_price) / 100 : 0,
    }));
    const subtotal = order.payment?.charges?.total_charge?.amount
      ? Number(order.payment.charges.total_charge.amount) / 100
      : items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const platformFee = subtotal * 0.30; // ~30% UE commission

    await db.insert(deliveryOrders).values({
      venueId,
      platform: "uber_eats",
      externalId: order.id || body.order_id,
      customerName: order.eater?.first_name ? `${order.eater.first_name} ${order.eater.last_name || ""}`.trim() : "Uber Eats Customer",
      itemsJson: JSON.stringify(items),
      subtotal: String(subtotal.toFixed(2)),
      platformFee: String(platformFee.toFixed(2)),
      netRevenue: String((subtotal - platformFee).toFixed(2)),
      status: "received",
    });
    return c.json({ received: true });
  } catch {
    return c.json({ received: true });
  }
});

// DoorDash order webhook
app.post("/api/webhooks/doordash", async (c) => {
  try {
    const body = await c.req.json() as any;
    const db = getDb();
    const event = body.event_type || "";
    if (!event.includes("ORDER")) return c.json({ received: true });

    const order = body.order_data || body;
    const venueId = Number(c.req.query("venue") || body.merchant_id || 0);
    if (!venueId) return c.json({ received: true });

    const items = (order.items || []).map((i: any) => ({
      name: i.name || "Item",
      quantity: i.quantity || 1,
      price: i.price ? Number(i.price) / 100 : 0,
    }));
    const subtotal = order.subtotal ? Number(order.subtotal) / 100 : items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const platformFee = subtotal * 0.25;

    await db.insert(deliveryOrders).values({
      venueId,
      platform: "doordash",
      externalId: order.id || order.delivery_id,
      customerName: order.consumer_name || "DoorDash Customer",
      itemsJson: JSON.stringify(items),
      subtotal: String(subtotal.toFixed(2)),
      platformFee: String(platformFee.toFixed(2)),
      netRevenue: String((subtotal - platformFee).toFixed(2)),
      status: "received",
    });
    return c.json({ received: true });
  } catch {
    return c.json({ received: true });
  }
});

// Menulog/Just Eat order webhook
app.post("/api/webhooks/menulog", async (c) => {
  try {
    const body = await c.req.json() as any;
    const db = getDb();
    const event = body.event || body.EventType || "";
    if (!String(event).toLowerCase().includes("order")) return c.json({ received: true });

    const venueId = Number(c.req.query("venue") || body.restaurant_id || 0);
    if (!venueId) return c.json({ received: true });

    const order = body.order || body.Order || body;
    const items = (order.ProductLines || order.items || []).map((i: any) => ({
      name: i.ProductName || i.name || "Item",
      quantity: i.Quantity || i.quantity || 1,
      price: i.UnitPrice || i.unit_price || 0,
    }));
    const subtotal = Number(order.TotalOrderValue || order.total || items.reduce((s: number, i: any) => s + i.price * i.quantity, 0));
    const platformFee = subtotal * 0.12;

    await db.insert(deliveryOrders).values({
      venueId,
      platform: "menulog",
      externalId: String(order.OrderId || order.id || Date.now()),
      customerName: order.CustomerName || order.customer_name || "Menulog Customer",
      itemsJson: JSON.stringify(items),
      subtotal: String(subtotal.toFixed(2)),
      platformFee: String(platformFee.toFixed(2)),
      netRevenue: String((subtotal - platformFee).toFixed(2)),
      status: "received",
    });
    return c.json({ received: true });
  } catch {
    return c.json({ received: true });
  }
});

// Server-Sent Events — real-time order updates for KDS
app.get("/api/sse/orders/:venueId", async (c) => {
  const venueId = Number(c.req.param("venueId"));
  if (!venueId) return c.text("Bad venueId", 400);

  const res = c.env.outgoing;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");

  addSseClient(venueId, res);

  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 25000);

  res.on("close", () => {
    clearInterval(heartbeat);
    removeSseClient(venueId, res);
  });
});

// Health check
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));

// ─── Image upload endpoint ────────────────────────────────────────────────────
// Accepts multipart/form-data: { token: string, file: File }
// Validates the owner/staff JWT, saves to ./uploads/, returns { url: string }
app.post("/api/upload/image", async (c) => {
  try {
    const body = await c.req.parseBody();
    const token = body["token"] as string;
    const file = body["file"] as File;
    if (!token || !file || !(file instanceof File)) {
      return c.json({ error: "Missing token or file" }, 400);
    }
    try {
      await jwtVerify(token, UPLOAD_JWT_SECRET, { clockTolerance: 60 });
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "File too large — maximum 5 MB." }, 400);
    }
    const ext = extname(file.name).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
      return c.json({ error: "Only JPG, PNG, WebP and GIF files are allowed." }, 400);
    }
    const filename = `${randomBytes(14).toString("hex")}${ext}`;
    writeFileSync(join(UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));
    return c.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error("[upload] Error:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// Serve uploaded images at /uploads/:filename
// (In production Railway needs a Volume mounted at /app/uploads for persistence across deploys)
app.get("/uploads/:filename", (c) => {
  const filename = c.req.param("filename");
  // Prevent directory traversal
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return c.notFound();
  }
  const filepath = join(UPLOADS_DIR, filename);
  if (!existsSync(filepath)) return c.notFound();
  const ext = extname(filename).toLowerCase();
  const TYPES: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  };
  const data = readFileSync(filepath);
  return new Response(data, {
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

// 404 for unmatched /api/* routes (excluding /api/trpc which is handled below)
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// Serve frontend static files in production
if (env.isProduction) {
  const { serveStaticFiles } = await import("./lib/vite");
  await serveStaticFiles(app);
}

// Get Hono's Node.js request listener
const honoListener = getRequestListener(app.fetch);

const port = env.port;

// ─── Stripe webhook handler ───────────────────────────────────────────────
// In-memory idempotency guard for gift-card / pass sessions (no stripeSessionId
// column on those tables this phase — T-08-06 accept).
// Cleared on process restart; Stripe re-delivery is rare for completed events.
const processedGiftPassSessions = new Set<string>();

// Must read raw body before any JSON parse; Stripe verifies the raw bytes.
async function handleStripeWebhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const rawBody = Buffer.concat(chunks);

  if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
    res.writeHead(400);
    res.end("Stripe not configured");
    return;
  }

  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2026-04-22.dahlia" });
    const sig = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(rawBody, sig, env.stripeWebhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      if (session.payment_status === "paid") {
        const meta = session.metadata ?? {};
        const venueId = Number(meta.venueId);
        if (!venueId) { res.writeHead(200); res.end("ok"); return; }

        const db = getDb();
        const kind: string = meta.kind ?? "order"; // default to order for backwards compat

        // ── Gift Card fulfillment (PAY-03) ─────────────────────────────────────
        if (kind === "gift_card") {
          // In-memory idempotency guard (T-08-06 accept — no stripeSessionId on giftCards)
          if (!processedGiftPassSessions.has(session.id)) {
            processedGiftPassSessions.add(session.id);
            const amountDollars = ((session.amount_total ?? 0) / 100).toFixed(2);
            const code = randomBytes(8).toString("base64url").toUpperCase().slice(0, 12);
            await db.insert(giftCards).values({
              venueId,
              code,
              amount: amountDollars,
              balance: amountDollars,
              senderName: meta.senderName || null,
              recipientName: meta.recipientName || null,
              recipientEmail: meta.recipientEmail || null,
              recipientPhone: meta.recipientPhone || null,
              message: meta.message || null,
            });

            // Send digital gift card email if recipient email present
            if (meta.recipientEmail) {
              const venueRow = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, venueId)).limit(1);
              const venueName = venueRow[0]?.name ?? "the cafe";
              sendEmail({
                to: meta.recipientEmail,
                subject: `🎁 You've received a $${amountDollars} gift card from ${venueName}!`,
                html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
<h2>You've got a gift card! 🎉</h2>
${meta.senderName ? `<p><strong>${meta.senderName}</strong> sent you a gift card.</p>` : ""}
${meta.message ? `<blockquote style="border-left:3px solid #5E8B8B;padding-left:1rem;color:#555">${meta.message}</blockquote>` : ""}
<div style="background:#f9f9f9;border-radius:8px;padding:1.5rem;text-align:center;margin:1.5rem 0">
  <p style="margin:0;color:#666;font-size:0.875rem">Your gift card code</p>
  <p style="font-size:2rem;font-weight:bold;letter-spacing:0.2em;margin:0.5rem 0;color:#181818">${code}</p>
  <p style="margin:0;color:#5E8B8B;font-size:1.25rem">Value: $${amountDollars}</p>
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
          }
        }

        // ── Subscription Pass fulfillment (PAY-04) ────────────────────────────
        else if (kind === "pass") {
          if (!processedGiftPassSessions.has(session.id)) {
            processedGiftPassSessions.add(session.id);
            const totalCredits = Number(meta.totalCredits ?? 0);
            await db.insert(subscriptionPasses).values({
              venueId,
              phone: meta.phone ?? "",
              name: meta.name ?? "Customer",
              totalCredits,
              remainingCredits: totalCredits,
              price: ((session.amount_total ?? 0) / 100).toFixed(2),
              isActive: true,
            });
          }
        }

        // ── Order fulfillment (default, from 08-01) ───────────────────────────
        else {
          // Parse cart items stored in session metadata by createCheckoutSession (Task 2)
          type CartItem = { menuItemId: number; itemName: string; quantity: number; unitPrice: number };
          let parsedItems: CartItem[] = [];
          if (meta.itemsJson) {
            try { parsedItems = JSON.parse(meta.itemsJson) as CartItem[]; } catch { /* malformed — skip items */ }
          }

          // Idempotency: skip if an order with this session ID already exists
          const existing = await db.select({ id: orders.id })
            .from(orders)
            .where(eq(orders.stripeSessionId, session.id))
            .limit(1);

          if (!existing[0]) {
            const orderNumber = `B1-${Date.now().toString(36).toUpperCase()}`;
            const totalCents = session.amount_total ?? 0;

            // PAY-01 / PAY-02: order is confirmed only after webhook fires with payment_status === "paid"
            const [orderResult] = await db.insert(orders).values({
              venueId,
              orderNumber,
              customerName: meta.customerName ?? "Online Customer",
              customerPhone: meta.customerPhone ?? "",
              pickupTime: meta.pickupTime ?? "ASAP",
              orderNote: meta.orderNote || null,
              paymentMethod: "online",
              totalAmount: (totalCents / 100).toFixed(2),
              locationId: meta.locationId ? Number(meta.locationId) : null,
              customerEmail: session.customer_details?.email ?? null,
              stripeSessionId: session.id,
              tipAmount: meta.tipAmount ? meta.tipAmount : "0",
              discountCode: meta.discountCode || null,
              discountAmount: meta.discountAmount ? meta.discountAmount : "0",
              status: "confirmed",
            }).returning({ id: orders.id });

            const orderId = orderResult.id;

            // Persist order line items from metadata cart
            for (const item of parsedItems) {
              try {
                await db.insert(orderItems).values({
                  orderId,
                  menuItemId: Number(item.menuItemId),
                  itemName: String(item.itemName),
                  quantity: Number(item.quantity),
                  unitPrice: Number(item.unitPrice).toFixed(2),
                });
              } catch { /* non-blocking per item — order already committed */ }
            }

            // Broadcast new confirmed order to KDS/staff SSE listeners
            broadcastToVenue(venueId, "order_update", { orderId, status: "confirmed", orderNumber });

            // Discount code: increment usedCount (non-blocking)
            if (meta.discountCode) {
              try {
                await db.update(discountCodes)
                  .set({ usedCount: sql`used_count + 1` })
                  .where(and(
                    eq(discountCodes.venueId, venueId),
                    eq(discountCodes.code, meta.discountCode.toUpperCase()),
                  ));
              } catch { /* non-blocking */ }
            }

            // Earn loyalty points: 1pt per $1 of order subtotal (excluding tip)
            const subtotal = Math.max(0, (totalCents / 100) - Number(meta.tipAmount ?? 0));
            const pointsEarned = Math.floor(subtotal);
            const loyaltyPhone = meta.loyaltyPhone || meta.customerPhone;
            if (loyaltyPhone && pointsEarned > 0) {
              try {
                let loyaltyAcc = await db.select().from(loyaltyAccounts)
                  .where(and(eq(loyaltyAccounts.venueId, venueId), eq(loyaltyAccounts.phone, loyaltyPhone)))
                  .limit(1);
                if (!loyaltyAcc[0]) {
                  await db.insert(loyaltyAccounts).values({
                    venueId,
                    phone: loyaltyPhone,
                    name: meta.customerName ?? null,
                    pointsBalance: 0,
                    totalLifetimePoints: 0,
                  });
                  loyaltyAcc = await db.select().from(loyaltyAccounts)
                    .where(and(eq(loyaltyAccounts.venueId, venueId), eq(loyaltyAccounts.phone, loyaltyPhone)))
                    .limit(1);
                }
                const acc = loyaltyAcc[0];
                if (acc) {
                  await db.update(loyaltyAccounts).set({
                    pointsBalance: acc.pointsBalance + pointsEarned,
                    totalLifetimePoints: acc.totalLifetimePoints + pointsEarned,
                  }).where(eq(loyaltyAccounts.id, acc.id));
                  await db.insert(loyaltyTransactions).values({
                    venueId,
                    accountId: acc.id,
                    type: "earn",
                    points: pointsEarned,
                    description: `Online order ${orderNumber} — ${pointsEarned} pts`,
                    orderId,
                  });
                }
              } catch { /* non-blocking */ }
            }

            // ── CHK-02: Loyalty redemption — decrement balance on paid order ───
            const loyaltyRedemptionPhone = meta.loyaltyPhone || meta.customerPhone;
            const pointsRedeemed = Number(meta.loyaltyPointsRedeemed ?? 0);
            if (loyaltyRedemptionPhone && pointsRedeemed > 0) {
              try {
                const redeemAcc = await db.select().from(loyaltyAccounts)
                  .where(and(eq(loyaltyAccounts.venueId, venueId), eq(loyaltyAccounts.phone, loyaltyRedemptionPhone)))
                  .limit(1);
                const acc = redeemAcc[0];
                if (acc) {
                  const newBalance = Math.max(0, acc.pointsBalance - pointsRedeemed);
                  await db.update(loyaltyAccounts)
                    .set({ pointsBalance: newBalance })
                    .where(eq(loyaltyAccounts.id, acc.id));
                  await db.insert(loyaltyTransactions).values({
                    venueId,
                    accountId: acc.id,
                    type: "redeem",
                    points: pointsRedeemed,
                    description: `Redeemed ${pointsRedeemed} pts at checkout`,
                    orderId,
                  });
                }
              } catch { /* non-blocking — loyalty failure must not abort order confirmation */ }
            }
          }
        }
      }
    }

    // ── Subscription lifecycle events ────────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as any;
      const db = getDb();
      // Find venue by stripeSubscriptionId
      const venueRows = await db.select({ id: venues.id }).from(venues)
        .where(eq(venues.stripeSubscriptionId, sub.id)).limit(1);
      if (venueRows[0]) {
        await db.update(venues).set({
          subscriptionTier: "starter",
          subscriptionStatus: "cancelled",
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        }).where(eq(venues.id, venueRows[0].id));
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as any;
      if (sub.status === "active") {
        const priceId: string = sub.items?.data?.[0]?.price?.id ?? "";
        // Map price ID to tier
        const { env: appEnv } = await import("./lib/env");
        let tier: string = "starter";
        if (priceId === appEnv.stripePriceIdStarter) tier = "starter";
        else if (priceId === appEnv.stripePriceIdPro) tier = "pro";
        else if (priceId === appEnv.stripePriceIdGrowth) tier = "pro";

        const db = getDb();
        const venueRows = await db.select({ id: venues.id }).from(venues)
          .where(eq(venues.stripeSubscriptionId, sub.id)).limit(1);
        if (venueRows[0]) {
          await db.update(venues).set({
            subscriptionTier: tier as "starter" | "pro" | "enterprise",
            subscriptionStatus: "active",
            updatedAt: new Date(),
          }).where(eq(venues.id, venueRows[0].id));
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any;
      console.warn(`[Stripe] Payment failed for subscription ${invoice.subscription} — customer ${invoice.customer}`);
      // Optionally: update subscriptionStatus to 'past_due' here
    }

    res.writeHead(200);
    res.end("ok");
  } catch (err) {
    console.error("Stripe webhook error:", err);
    res.writeHead(400);
    res.end("Webhook error");
  }
}

// Raw Node.js HTTP server — intercept /api/trpc/* before Hono's Fetch-API
// translation so that nodeHTTPRequestHandler can read the body natively.
const server = createServer((req, res) => {
  if (req.url?.startsWith("/api/stripe/webhook")) {
    handleStripeWebhook(req, res);
  } else if (req.url?.startsWith("/api/trpc")) {
    // Extract the tRPC procedure path from the URL.
    // e.g. /api/trpc/venue.login?batch=1 → "venue.login"
    const trpcPath = (req.url ?? "").replace(/^\/api\/trpc\/?/, "").split("?")[0];
    nodeHTTPRequestHandler({
      router: appRouter,
      req,
      res,
      path: trpcPath,
      createContext,
    });
  } else {
    honoListener(req, res);
  }
});

server.listen(port, () => {
  console.log(`B1 Platform API running on http://localhost:${port}/`);
  if (env.isProduction) {
    console.log("Serving frontend from ./dist");
  }
});

// ─── Daily digest cron — every day at 6pm ────────────────────────────────────
cron.schedule("0 18 * * *", async () => {
  try {
    const db = getDb();
    const allVenues = await db.select({ id: venues.id, name: venues.name }).from(venues).where(eq(venues.isActive, true));

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

    for (const venue of allVenues) {
      try {
        // Fetch today's orders for this venue
        const todayOrders = await db
          .select({ id: orders.id, totalAmount: orders.totalAmount, status: orders.status })
          .from(orders)
          .where(
            and(
              eq(orders.venueId, venue.id),
              gte(orders.createdAt, new Date(`${todayStr}T00:00:00.000Z`)),
            )
          );

        const orderCount = todayOrders.length;
        const revenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const completed = todayOrders.filter(o => o.status === "completed").length;
        const cancelled = todayOrders.filter(o => o.status === "cancelled").length;

        // Get venue owner email
        const ownerRows = await db
          .select({ email: venueOwners.email, name: venueOwners.name })
          .from(venueOwners)
          .where(and(eq(venueOwners.venueId, venue.id), eq(venueOwners.isActive, true)))
          .limit(1);
        const owner = ownerRows[0];
        if (!owner?.email) continue;

        await sendEmail({
          to: owner.email,
          subject: `Daily summary for ${venue.name} — ${todayStr}`,
          html: `<h2>Daily Summary — ${venue.name}</h2>
<p>Hi ${owner.name ?? "there"},</p>
<p>Here's your summary for today (${todayStr}):</p>
<ul>
  <li><strong>Total orders:</strong> ${orderCount}</li>
  <li><strong>Revenue:</strong> $${revenue.toFixed(2)}</li>
  <li><strong>Completed:</strong> ${completed}</li>
  <li><strong>Cancelled:</strong> ${cancelled}</li>
</ul>
<p>Log in to your dashboard for full details.</p>`,
        });
      } catch (venueErr) {
        console.error(`Daily digest error for venue ${venue.id}:`, venueErr);
      }
    }
  } catch (err) {
    console.error("Daily digest cron error:", err);
  }
});

// ─── Birthday rewards cron — every day at 9am ────────────────────────────────
cron.schedule("0 9 * * *", async () => {
  try {
    const db = getDb();
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Find all customer accounts with birthday = today and marketingOptIn = true
    const birthdayCustomers = await db.select()
      .from(customerAccounts)
      .where(and(eq(customerAccounts.birthday, mmdd), eq(customerAccounts.marketingOptIn, true)));

    for (const customer of birthdayCustomers) {
      try {
        // Award 50 loyalty points
        if (customer.phone) {
          let loyaltyAcc = await db.select().from(loyaltyAccounts)
            .where(and(eq(loyaltyAccounts.venueId, customer.venueId), eq(loyaltyAccounts.phone, customer.phone)))
            .limit(1);

          if (loyaltyAcc[0]) {
            await db.update(loyaltyAccounts).set({
              pointsBalance: loyaltyAcc[0].pointsBalance + 50,
              totalLifetimePoints: loyaltyAcc[0].totalLifetimePoints + 50,
            }).where(eq(loyaltyAccounts.id, loyaltyAcc[0].id));
            await db.insert(loyaltyTransactions).values({
              venueId: customer.venueId,
              accountId: loyaltyAcc[0].id,
              type: "earn",
              points: 50,
              description: "Birthday bonus — 50 pts 🎂",
            });
          }
        }

        // Send birthday email if email on file
        if (customer.email) {
          const venueRow = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, customer.venueId)).limit(1);
          const venueName = venueRow[0]?.name ?? "your favourite café";
          await sendEmail({
            to: customer.email,
            subject: `Happy Birthday from ${venueName}! 🎂`,
            html: `<h2>Happy Birthday, ${customer.name ?? "friend"}! 🎂</h2>
<p>We've added <strong>50 bonus loyalty points</strong> to your account as a birthday gift.</p>
<p>Come in and treat yourself — you deserve it!</p>
<p>With love,<br/>${venueName}</p>`,
          });
        }
      } catch (err) {
        console.error(`Birthday cron error for customer ${customer.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Birthday cron error:", err);
  }
});

// ─── Reservation SMS reminders — every hour ───────────────────────────────────
cron.schedule("0 * * * *", async () => {
  try {
    const db = getDb();
    const now = new Date();
    // Target: reservations 1.75h to 2.25h from now (±15min window around 2hr mark)
    const windowStart = new Date(now.getTime() + 105 * 60000); // +1h45m
    const windowEnd   = new Date(now.getTime() + 135 * 60000); // +2h15m

    // Find reservations that haven't been reminded yet and are still pending/confirmed
    const candidates = await db.select().from(reservations)
      .where(
        and(
          sql`${reservations.status} IN ('pending', 'confirmed')`,
          isNull(reservations.smsReminderSentAt),
        )
      )
      .limit(100);

    for (const res of candidates) {
      try {
        const resDateTime = new Date(`${res.reservationDate}T${res.reservationTime}:00`);
        if (resDateTime >= windowStart && resDateTime <= windowEnd) {
          await sendSms(
            res.customerPhone,
            `Reminder: Your reservation on ${res.reservationDate} at ${res.reservationTime} is in about 2 hours. Reply CANCEL to cancel.`
          );
          await db.update(reservations)
            .set({ smsReminderSentAt: new Date() })
            .where(eq(reservations.id, res.id));
        }
      } catch { /* per-reservation errors are non-blocking */ }
    }
  } catch (err) {
    console.error("Reservation reminder cron error:", err);
  }
});

// ─── Inventory low-stock alert cron — every day at 8am ───────────────────────
cron.schedule("0 8 * * *", async () => {
  try {
    const db = getDb();
    const allVenues = await db.select({ id: venues.id, name: venues.name }).from(venues).where(eq(venues.isActive, true));

    for (const venue of allVenues) {
      try {
        // Find sold-out items (isAvailable = false)
        const soldOutRows = await db
          .select({ itemName: menuItems.name })
          .from(inventory)
          .innerJoin(menuItems, eq(inventory.menuItemId, menuItems.id))
          .where(and(eq(inventory.venueId, venue.id), eq(inventory.isAvailable, false)));

        if (soldOutRows.length === 0) continue;

        // Look up venue owner email
        const ownerRow = await db
          .select({ email: venueOwners.email, name: venueOwners.name })
          .from(venueOwners)
          .where(and(eq(venueOwners.venueId, venue.id), eq(venueOwners.isActive, true)))
          .limit(1);
        const owner = ownerRow[0];
        if (!owner?.email) continue;

        const itemListHtml = soldOutRows.map(r => `<li>${r.itemName}</li>`).join("");
        await sendEmail({
          to: owner.email,
          subject: `Inventory Alert — ${soldOutRows.length} item${soldOutRows.length === 1 ? "" : "s"} sold out at ${venue.name}`,
          html: `<h2>Inventory Alert — ${venue.name}</h2>
<p>Hi ${owner.name ?? "there"},</p>
<p>The following ${soldOutRows.length === 1 ? "item is" : "items are"} currently sold out:</p>
<ul>${itemListHtml}</ul>
<p>Please update your inventory in the dashboard.</p>`,
        });
      } catch (venueErr) {
        console.error(`Inventory alert error for venue ${venue.id}:`, venueErr);
      }
    }
  } catch (err) {
    console.error("Inventory alert cron error:", err);
  }
});

// ─── Loyalty birthday rewards cron — every day at 9am ────────────────────────
// Checks loyaltyAccounts.birthday (MM-DD) for today's birthdays and awards 100 bonus points.
cron.schedule("0 9 * * *", async () => {
  try {
    const db = getDb();
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const currentYear = today.getFullYear();

    // Find loyalty accounts with birthday matching today's MM-DD
    const birthdayAccounts = await db.select().from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.birthday, mmdd));

    for (const acc of birthdayAccounts) {
      try {
        // Guard against sending twice in the same year: check if a birthday transaction
        // already exists this year for this account
        const yearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`);
        const txRows = await db.select({ description: loyaltyTransactions.description })
          .from(loyaltyTransactions)
          .where(and(
            eq(loyaltyTransactions.accountId, acc.id),
            gte(loyaltyTransactions.createdAt, yearStart),
          ));
        const alreadySent = txRows.some(tx => tx.description.includes("Birthday bonus"));
        if (alreadySent) continue;

        // Award 100 bonus points
        await db.update(loyaltyAccounts).set({
          pointsBalance: acc.pointsBalance + 100,
          totalLifetimePoints: acc.totalLifetimePoints + 100,
        }).where(eq(loyaltyAccounts.id, acc.id));

        await db.insert(loyaltyTransactions).values({
          venueId: acc.venueId,
          accountId: acc.id,
          type: "earn",
          points: 100,
          description: "🎂 Birthday bonus — 100 points!",
        });

        // TODO: send SMS when birthday phone number is available on loyaltyAccounts
      } catch (err) {
        console.error(`Loyalty birthday cron error for account ${acc.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Loyalty birthday cron error:", err);
  }
});

// ─── Abandoned cart recovery cron — every 30 minutes ─────────────────────────
cron.schedule("*/30 * * * *", async () => {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find carts that: were created >30min ago, not recovered, no recovery sent, created within last 24h
    const carts = await db.select()
      .from(abandonedCarts)
      .where(
        and(
          eq(abandonedCarts.isRecovered, false),
          isNull(abandonedCarts.recoverySentAt),
          lte(abandonedCarts.createdAt, cutoff),
          gte(abandonedCarts.createdAt, oneDayAgo),
        )
      )
      .limit(50);

    for (const cart of carts) {
      try {
        const venueRow = await db.select({ name: venues.name, slug: venues.slug }).from(venues).where(eq(venues.id, cart.venueId)).limit(1);
        const venue = venueRow[0];
        if (!venue) continue;

        let sent = false;

        if (cart.phone) {
          await sendSms(
            cart.phone,
            `Hi ${cart.customerName ?? "there"}! You left items in your cart at ${venue.name}. Come back and complete your order: ${env.appUrl}/v/${venue.slug}`
          );
          sent = true;
        } else if (cart.email) {
          await sendEmail({
            to: cart.email,
            subject: `You left something behind at ${venue.name}!`,
            html: `<h2>Don't forget your order! ☕</h2>
<p>Hi ${cart.customerName ?? "there"},</p>
<p>You left items worth $${cart.totalAmount} in your cart at ${venue.name}.</p>
<p><a href="${env.appUrl}/v/${venue.slug}">Complete your order →</a></p>`,
          });
          sent = true;
        }

        if (sent) {
          await db.update(abandonedCarts).set({ recoverySentAt: new Date() }).where(eq(abandonedCarts.id, cart.id));
        }
      } catch (err) {
        console.error(`Abandoned cart recovery error for cart ${cart.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Abandoned cart cron error:", err);
  }
});
