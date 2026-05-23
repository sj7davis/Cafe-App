import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";

export async function serveStaticFiles(app: Hono<{ Bindings: HttpBindings }>) {
  const { serveStatic } = await import("@hono/node-server/serve-static");

  // Serve built frontend assets
  app.use("/*", serveStatic({ root: "./dist" }));

  // SPA fallback — serve index.html for all non-API routes
  app.use("/*", serveStatic({ path: "./dist/index.html" }));
}
