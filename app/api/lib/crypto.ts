// ─── Secrets encryption at rest ───────────────────────────────────────────────
//
// Third-party credentials (OAuth access/refresh tokens, POS API keys) are stored
// encrypted with AES-256-GCM (authenticated, so tampering is detected). Use
// seal() before writing a secret to the DB and open() after reading one.
//
// Backward compatible: open() returns any value that isn't in sealed format
// unchanged, so reads keep working before the one-time backfill runs (and even
// if it never does). seal() is idempotent — re-sealing a sealed value is a no-op.
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { env } from "./env";

const PREFIX = "enc:v1:";
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = env.encryptionKey;
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return (cachedKey = buf);
    if (Buffer.byteLength(raw) === 32) return (cachedKey = Buffer.from(raw));
    throw new Error("ENCRYPTION_KEY must be 32 bytes (base64-encoded or raw 32 chars)");
  }
  if (env.isProduction) {
    throw new Error("ENCRYPTION_KEY is required in production to encrypt stored secrets");
  }
  // Dev fallback: a stable key derived from JWT_SECRET so connect/refresh
  // round-trips work across restarts without extra local setup.
  return (cachedKey = createHash("sha256").update(`b1-secret-enc:${env.jwtSecret}`).digest());
}

/** True if a stored value is in sealed (encrypted) format. */
export function isSealed(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/**
 * Encrypt a secret for storage. Pass-through for null/empty (nothing to hide)
 * and idempotent for already-sealed values.
 */
export function seal(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return null;
  if (isSealed(plaintext)) return plaintext;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/**
 * Decrypt a stored secret. A value that isn't in sealed format is assumed to be
 * legacy plaintext and returned as-is (so reads work before the backfill).
 */
export function open(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return null;
  if (!isSealed(stored)) return stored;
  const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
