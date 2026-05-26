import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HttpBindings } from "@hono/node-server";
import { getRequestListener } from "@hono/node-server";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { venues, venueOwners, orders, loyaltyAccounts, loyaltyTransactions, customerAccounts, abandonedCarts, xeroConnections, reservations } from "@db/schema";
import { eq, and, gte, isNull, lte } from "drizzle-orm";
import { sendEmail } from "./lib/email";
import { sendSms } from "./lib/sms";
import cron from "node-cron";

const SQUARE_API_BASE = process.env.SQUARE_ENV === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

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

// Health check
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));

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
    const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2025-04-30.basil" });
    const sig = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(rawBody, sig, env.stripeWebhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      if (session.payment_status === "paid") {
        const meta = session.metadata ?? {};
        const venueId = Number(meta.venueId);
        if (!venueId) { res.writeHead(200); res.end("ok"); return; }

        const db = getDb();
        // Build items from session — we stored them in metadata as a JSON blob
        // The actual items come via the tRPC createOrder call triggered by the
        // success page load. Here we just create the order record if not exists.
        const existing = await db.select({ id: orders.id })
          .from(orders)
          .where(eq(orders.stripeSessionId, session.id))
          .limit(1);

        if (!existing[0]) {
          const orderNumber = `B1-${Date.now().toString(36).toUpperCase()}`;
          const totalCents = session.amount_total ?? 0;
          const tipCents = session.total_details?.amount_discount ? 0 : 0;

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
            status: "pending",
          }).returning({ id: orders.id });

          // Earn loyalty points: 1pt per $1 of order subtotal (excluding tip)
          const subtotal = Math.max(0, (totalCents / 100) - Number(meta.tipAmount ?? 0));
          const pointsEarned = Math.floor(subtotal);
          if (meta.customerPhone && pointsEarned > 0) {
            try {
              let loyaltyAcc = await db.select().from(loyaltyAccounts)
                .where(and(eq(loyaltyAccounts.venueId, venueId), eq(loyaltyAccounts.phone, meta.customerPhone)))
                .limit(1);
              if (!loyaltyAcc[0]) {
                await db.insert(loyaltyAccounts).values({
                  venueId,
                  phone: meta.customerPhone,
                  name: meta.customerName ?? null,
                  pointsBalance: 0,
                  totalLifetimePoints: 0,
                });
                loyaltyAcc = await db.select().from(loyaltyAccounts)
                  .where(and(eq(loyaltyAccounts.venueId, venueId), eq(loyaltyAccounts.phone, meta.customerPhone)))
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
                  orderId: orderResult.id,
                });
              }
            } catch { /* non-blocking */ }
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
