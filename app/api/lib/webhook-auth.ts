import { createHmac, timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Uber Eats signs the raw request body with HMAC-SHA256, keyed with the app's
 * client secret, and sends the digest as a lowercase hex string in
 * X-Uber-Signature (no "sha256=" prefix). `rawBody` must be the exact bytes
 * received — re-serialized JSON will not match.
 */
export function verifyUberEatsSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(signature.trim().toLowerCase(), expected);
}

/**
 * DoorDash doesn't sign the payload — its Drive API webhooks instead attach a
 * static Authorization header (Basic Auth credentials, or an OAuth bearer
 * token) that you configure once in the DoorDash Developer Portal. Verification
 * is a direct comparison against that configured value, not a digest.
 */
export function verifyDoorDashAuth(authHeader: string | undefined, expected: string): boolean {
  if (!expected || !authHeader) return false;
  return safeCompare(authHeader, expected);
}

/**
 * Menulog (Just Eat Takeaway) doesn't publish a self-serve webhook-signing
 * scheme the way Uber Eats/DoorDash do — access is normally brokered through a
 * POS/aggregator partner integration (e.g. JET Connect), and the exact
 * authentication mechanism depends on that specific partner arrangement. This
 * checks a shared secret passed back as a header, which is the common fallback
 * most aggregator middleware supports. Confirm the real mechanism against your
 * actual Menulog/JET partner agreement before relying on this for live traffic.
 */
export function verifyMenulogSecret(provided: string | undefined, expected: string): boolean {
  if (!expected || !provided) return false;
  return safeCompare(provided, expected);
}
