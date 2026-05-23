import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

// Allow cross-origin in dev; in prod the frontend is co-located
if (!env.isProduction) {
  app.use(cors({ origin: "http://localhost:3000", credentials: true }));
}

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

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
