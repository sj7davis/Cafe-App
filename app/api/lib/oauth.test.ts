/**
 * Tests for the shared OAuth module — specifically the signed `state` token,
 * which is the security-critical piece (it replaces a forgeable base64 blob and
 * is what stops one tenant from binding a third-party account to another).
 * No network or DB needed.
 */
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { signState, verifyState, buildAuthUrl, OAuthError } from "./oauth";
import { env } from "./env";

const SECRET = new TextEncoder().encode(env.jwtSecret);

describe("OAuth signed state", () => {
  it("round-trips the venueId for the matching provider", async () => {
    const state = await signState(42, "square");
    await expect(verifyState(state, "square")).resolves.toBe(42);
  });

  it("rejects state minted for a different provider (no cross-provider replay)", async () => {
    const state = await signState(42, "square");
    await expect(verifyState(state, "xero")).rejects.toBeInstanceOf(OAuthError);
  });

  it("rejects a tampered state token", async () => {
    const state = await signState(42, "square");
    const tampered = state.slice(0, -3) + (state.endsWith("aaa") ? "bbb" : "aaa");
    await expect(verifyState(tampered, "square")).rejects.toBeInstanceOf(OAuthError);
  });

  it("rejects an expired state token", async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({ venueId: 42, provider: "square" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(nowSec - 3600)
      .setExpirationTime(nowSec - 60)
      .sign(SECRET);
    await expect(verifyState(expired, "square")).rejects.toBeInstanceOf(OAuthError);
  });

  it("rejects a token signed with the wrong secret (forgery)", async () => {
    const forged = await new SignJWT({ venueId: 42, provider: "square" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(new TextEncoder().encode("not-the-real-secret"));
    await expect(verifyState(forged, "square")).rejects.toBeInstanceOf(OAuthError);
  });
});

describe("OAuth authorize URL", () => {
  it("returns null when the provider has no configured credentials", async () => {
    // Square creds are empty in the test environment.
    await expect(buildAuthUrl("square", 1)).resolves.toBeNull();
  });

  it("builds a consent URL whose state verifies back to the venue", async () => {
    // env is a plain mutable object; inject creds just for this assertion.
    env.googleClientId = "test-google-client";
    env.googleClientSecret = "test-google-secret";

    const url = await buildAuthUrl("gmb", 7);
    expect(url).toBeTruthy();

    const parsed = new URL(url as string);
    expect(parsed.searchParams.get("client_id")).toBe("test-google-client");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("access_type")).toBe("offline");

    const state = parsed.searchParams.get("state");
    expect(state).toBeTruthy();
    await expect(verifyState(state as string, "gmb")).resolves.toBe(7);
  });
});
