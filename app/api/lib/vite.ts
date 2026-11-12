import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { readFileSync } from "fs";
import { resolve } from "path";

// A client holding an index.html from a previous deploy requests JS hashes that
// no longer exist. Answering with the SPA fallback (HTML, 200) makes the browser
// reject the "script" and show a blank page forever. Answer with this instead:
// drop the stale service worker + caches and reload once to pick up fresh HTML.
// The sessionStorage guard stops a reload loop if a *current* asset were ever
// genuinely missing.
const STALE_CLIENT_HEALER = `(async () => {
  try {
    if (sessionStorage.getItem("b1-stale-heal")) return;
    sessionStorage.setItem("b1-stale-heal", "1");
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {}
  location.reload();
})();`;

const SW_ENTRYPOINTS = new Set(["/sw.js", "/registerSW.js", "/manifest.webmanifest", "/sw-push.js"]);

export async function serveStaticFiles(app: Hono<{ Bindings: HttpBindings }>) {
  const { serveStatic } = await import("@hono/node-server/serve-static");

  // Content-hashed bundles never change; the service worker and its entry
  // points must always revalidate or clients never see a new deploy.
  app.use("/*", async (c, next) => {
    await next();
    if (c.res.status !== 200) return;
    const p = c.req.path;
    if (p.startsWith("/assets/")) {
      // Don't clobber an explicit header (e.g. the stale-client healer's no-store).
      if (!c.res.headers.has("Cache-Control")) {
        c.res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      }
    } else if (SW_ENTRYPOINTS.has(p) || p.startsWith("/workbox-")) {
      c.res.headers.set("Cache-Control", "no-cache");
    }
  });

  // Serve built frontend assets (JS, CSS, images, etc.)
  app.use("/*", serveStatic({ root: "./dist" }));

  // Anything under /assets/ that serveStatic didn't find is a stale reference.
  app.get("/assets/*", (c) => {
    if (c.req.path.endsWith(".js")) {
      return c.body(STALE_CLIENT_HEALER, 200, {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-store",
      });
    }
    return c.text("Not found", 404);
  });

  // SPA fallback — for any non-file route, return index.html so React Router
  // can handle client-side navigation (e.g. /v/:slug, /book/:slug, /dashboard).
  // Paths that look like files (have an extension) are real misses, not routes.
  const indexHtml = readFileSync(resolve("./dist/index.html"), "utf-8");
  app.get("*", (c) => {
    if (/\.[a-zA-Z0-9]+$/.test(c.req.path)) return c.text("Not found", 404);
    return c.html(indexHtml, 200, { "Cache-Control": "no-cache" });
  });
}
