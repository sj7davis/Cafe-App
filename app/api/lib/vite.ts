import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { readFileSync } from "fs";
import { resolve } from "path";

export async function serveStaticFiles(app: Hono<{ Bindings: HttpBindings }>) {
  const { serveStatic } = await import("@hono/node-server/serve-static");

  // Serve built frontend assets (JS, CSS, images, etc.)
  app.use("/*", serveStatic({ root: "./dist" }));

  // SPA fallback — for any non-file route, return index.html so React Router
  // can handle client-side navigation (e.g. /v/:slug, /book/:slug, /dashboard)
  const indexHtml = readFileSync(resolve("./dist/index.html"), "utf-8");
  app.get("*", (c) => c.html(indexHtml));
}
