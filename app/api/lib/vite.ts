import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";

export function serveStaticFiles(app: Hono<{ Bindings: HttpBindings }>) {
  // In production, static files are served by the reverse proxy
  // This is a compatibility no-op
  void app;
}

export function getEnv(key: string): string | undefined {
  try {
    return (import.meta as unknown as { env: Record<string, string> }).env?.[key];
  } catch {
    return undefined;
  }
}
