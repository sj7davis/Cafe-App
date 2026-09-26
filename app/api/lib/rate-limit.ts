import type { IncomingMessage } from "http";

const store = new Map<string, { count: number; resetAt: number }>();

// This store is per-process, in-memory (fine for a single Railway instance;
// resets on deploy/restart and doesn't share state across multiple instances).
// High-cardinality keys (per-IP, below) would otherwise leak memory over a
// long-lived process, so sweep expired entries periodically. unref() so this
// timer never keeps the process alive on its own.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

/** Returns true if request is allowed, false if rate limited */
export function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/**
 * Best-effort client IP for rate-limiting purposes only — never for auth
 * decisions, since X-Forwarded-For is trivially spoofable by the client
 * unless a trusted proxy strips/overwrites it. Railway (and most PaaS
 * proxies) set this correctly; falls back to the raw socket address.
 */
export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (first) return first.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}
