// ─── Shared OAuth2 plumbing for all third-party integrations ───────────────────
//
// Multi-tenant model: ONE platform-registered app per provider (creds in env),
// and each cafe (tenant) grants access to THEIR OWN account via OAuth. This
// module owns the parts that must be identical and correct across providers:
//
//   • signed, expiring `state` (CSRF / wrong-tenant protection)
//   • building the consent URL
//   • exchanging the auth code for tokens
//   • refreshing an expired access token
//
// It is deliberately persistence-free (no DB/schema imports): token storage
// differs per provider (venues columns, xeroConnections, posIntegrations,
// settingsJson), so each callback/router persists in its own shape using these
// primitives. Keeping this module DB-free also lets oauth.test.ts run with no
// database.
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { env } from "./env";

export type OAuthProvider = "square" | "xero" | "lightspeed" | "gmb";

const STATE_SECRET = new TextEncoder().encode(env.jwtSecret);
const STATE_TTL = "10m";

/** Square's API host depends on the configured environment. */
export const squareApiBase =
  env.squareEnv === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  /** Lifetime of the access token in seconds, if the provider returned one. */
  expiresInSec: number | null;
  /** Full token response, for provider-specific fields (Square merchant_id /
   *  expires_at, Xero id_token, etc.). */
  raw: Record<string, unknown>;
}

export class OAuthError extends Error {}

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  /** Space-separated scope string. */
  scopes: string;
  /** Path the provider redirects back to; combined with env.appUrl. */
  redirectPath: string;
  /** How client credentials are presented to the token endpoint. */
  tokenAuth: "basic" | "body";
  /** Body encoding the token endpoint expects. */
  tokenFormat: "form" | "json";
  /** Extra query params on the authorize URL (e.g. Google offline access). */
  extraAuthParams?: Record<string, string>;
};

function registry(): Record<OAuthProvider, ProviderConfig> {
  return {
    square: {
      authorizeUrl: `${squareApiBase}/oauth2/authorize`,
      tokenUrl: `${squareApiBase}/oauth2/token`,
      clientId: env.squareAppId,
      clientSecret: env.squareAppSecret,
      scopes: "ITEMS_READ ORDERS_READ INVENTORY_READ PAYMENTS_READ ORDERS_WRITE",
      redirectPath: "/api/square/callback",
      tokenAuth: "body",
      tokenFormat: "json",
    },
    xero: {
      authorizeUrl: "https://login.xero.com/identity/connect/authorize",
      tokenUrl: "https://identity.xero.com/connect/token",
      clientId: env.xeroClientId,
      clientSecret: env.xeroClientSecret,
      scopes: "openid profile email accounting.transactions accounting.settings offline_access",
      redirectPath: "/api/xero/callback",
      tokenAuth: "basic",
      tokenFormat: "form",
    },
    lightspeed: {
      authorizeUrl: "https://my.kounta.com/authorize",
      tokenUrl: "https://my.kounta.com/token",
      clientId: env.lightspeedClientId,
      clientSecret: env.lightspeedClientSecret,
      scopes: "read:catalog read:sales read:stock",
      redirectPath: "/api/lightspeed/callback",
      tokenAuth: "body",
      tokenFormat: "form",
    },
    gmb: {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      scopes: "https://www.googleapis.com/auth/business.manage",
      redirectPath: "/api/gmb/callback",
      tokenAuth: "body",
      tokenFormat: "form",
      // offline + consent so Google returns a refresh token every time.
      extraAuthParams: { access_type: "offline", prompt: "consent" },
    },
  };
}

/** True when the platform has client credentials configured for this provider. */
export function isConfigured(provider: OAuthProvider): boolean {
  const cfg = registry()[provider];
  return !!cfg.clientId && !!cfg.clientSecret;
}

function redirectUri(cfg: ProviderConfig): string {
  return `${env.appUrl}${cfg.redirectPath}`;
}

// ─── Signed state (replaces the old unsigned base64(JSON{venueId})) ───────────

/**
 * Sign a short-lived, provider-bound state token. Because it is signed with the
 * platform secret, a caller cannot forge a state that binds a third-party
 * account to a venueId they don't control.
 */
export async function signState(venueId: number, provider: OAuthProvider): Promise<string> {
  return new SignJWT({ venueId, provider })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(STATE_TTL)
    .sign(STATE_SECRET);
}

/**
 * Verify a state token returned to a provider's callback. Throws OAuthError on a
 * bad signature, expiry, or if the state was minted for a different provider
 * (defends against cross-provider replay). Returns the venueId.
 */
export async function verifyState(raw: string, expectedProvider: OAuthProvider): Promise<number> {
  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(raw, STATE_SECRET));
  } catch {
    throw new OAuthError("Invalid or expired OAuth state");
  }
  if (payload.provider !== expectedProvider) {
    throw new OAuthError("OAuth state provider mismatch");
  }
  const venueId = Number(payload.venueId);
  if (!Number.isInteger(venueId) || venueId <= 0) {
    throw new OAuthError("OAuth state missing a valid venueId");
  }
  return venueId;
}

// ─── Authorize URL ────────────────────────────────────────────────────────────

/**
 * Build the provider consent URL for a venue, or null if the platform has no
 * credentials configured for this provider.
 */
export async function buildAuthUrl(provider: OAuthProvider, venueId: number): Promise<string | null> {
  const cfg = registry()[provider];
  if (!cfg.clientId || !cfg.clientSecret) return null;
  const state = await signState(venueId, provider);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(cfg),
    response_type: "code",
    scope: cfg.scopes,
    state,
    ...(cfg.extraAuthParams ?? {}),
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

// ─── Token endpoint (code exchange + refresh share one request path) ──────────

async function tokenRequest(provider: OAuthProvider, grantParams: Record<string, string>): Promise<OAuthTokens> {
  const cfg = registry()[provider];
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new OAuthError(`${provider} OAuth credentials are not configured on the server`);
  }

  const headers: Record<string, string> = {};
  const fields: Record<string, string> = { ...grantParams };

  if (cfg.tokenAuth === "basic") {
    headers.Authorization = "Basic " + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  } else {
    fields.client_id = cfg.clientId;
    fields.client_secret = cfg.clientSecret;
  }

  let body: string;
  if (cfg.tokenFormat === "json") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(fields);
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(fields).toString();
  }

  const res = await fetch(cfg.tokenUrl, { method: "POST", headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new OAuthError(`${provider} token request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new OAuthError(`${provider} token response had no access_token`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresInSec: data.expires_in ?? null,
    raw: data as Record<string, unknown>,
  };
}

/** Exchange an authorization code (from the callback) for tokens. */
export function exchangeCode(provider: OAuthProvider, code: string): Promise<OAuthTokens> {
  const cfg = registry()[provider];
  return tokenRequest(provider, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(cfg),
  });
}

/** Exchange a refresh token for a fresh access token. */
export function refreshAccessToken(provider: OAuthProvider, refreshToken: string): Promise<OAuthTokens> {
  return tokenRequest(provider, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

/** Convert an expires_in (seconds) into an absolute Date, or null. */
export function expiryDate(expiresInSec: number | null): Date | null {
  return expiresInSec ? new Date(Date.now() + expiresInSec * 1000) : null;
}

/** True when a stored token is missing or within 5 minutes of expiring. */
export function needsRefresh(tokenExpiresAt: Date | null | undefined): boolean {
  if (!tokenExpiresAt) return true;
  return tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;
}
