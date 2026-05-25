import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { venues } from "@db/schema";
import { eq } from "drizzle-orm";

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

// tRPC API
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// Health check
app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));

// 404 for unmatched /api/* routes
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// Serve frontend static files in production
if (env.isProduction) {
  const { serveStaticFiles } = await import("./lib/vite");
  await serveStaticFiles(app);
}

const { serve } = await import("@hono/node-server");
const port = env.port;
serve({ fetch: app.fetch, port }, () => {
  console.log(`B1 Platform API running on http://localhost:${port}/`);
  if (env.isProduction) {
    console.log("Serving frontend from ./dist");
  }
});
