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

/** Failure-only throttle for PIN-style logins: check before the attempt and
 *  record only wrong guesses, so staff at a busy venue never hit the cap. */
export function tooManyFailures(key: string, limit: number): boolean {
  const entry = store.get(key);
  return !!entry && Date.now() <= entry.resetAt && entry.count >= limit;
}

export function recordFailure(key: string, windowMs: number = 15 * 60 * 1000): void {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) store.set(key, { count: 1, resetAt: now + windowMs });
  else entry.count++;
}

/**
 * Best-effort client IP for rate-limiting purposes only — never for auth
 * decisions, since X-Forwarded-For is trivially spoofable by the client
 * unless a trusted proxy strips/overwrites it. Railway (and most PaaS
 * proxies) set this correctly; falls back to the raw socket address.
 */
export function getClientIp(req: IncomingMessage): string {
  // Railway's edge sets X-Real-IP to the connecting client and overwrites any
  // client-supplied value; X-Forwarded-For's leftmost entry is client-controlled.
  const realIp = req.headers["x-real-ip"];
  const real = Array.isArray(realIp) ? realIp[0] : realIp;
  if (real) return real.trim();
  const forwarded = req.headers["x-forwarded-for"];
  const header = Array.isArray(forwarded) ? forwarded.join(",") : forwarded;
  // No X-Real-IP (not behind Railway): take the last hop, the one our nearest
  // proxy appended, rather than the client-chosen first entry.
  const last = header?.split(",").map(s => s.trim()).filter(Boolean).pop();
  if (last) return last;
  return req.socket.remoteAddress || "unknown";
}
