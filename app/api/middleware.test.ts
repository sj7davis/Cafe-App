/**
 * Tests for protectedProcedure — the tenant-scope gate. Proves the JWT is
 * verified once and venueId is injected, and that bad/forged/unscoped tokens
 * are rejected before any resolver runs. No DB needed.
 */
import { describe, it, expect, vi } from "vitest";
import { SignJWT } from "jose";
import { z } from "zod";

// This is a unit test of the auth gate only — no database. Stub the tenant-scope
// connection so runWithTenant just runs the resolver (the real one opens a
// Postgres transaction to set app.venue_id, which isn't relevant here and would
// require a live DB in CI).
vi.mock("./queries/connection", () => ({
  runWithTenant: (_venueId: number | null, fn: () => unknown) => fn(),
  getDb: () => {
    throw new Error("getDb is not available in this unit test");
  },
}));

import { createRouter, protectedProcedure, adminProcedure } from "./middleware";
import { env } from "./lib/env";

const SECRET = new TextEncoder().encode(env.jwtSecret);

const testRouter = createRouter({
  whoami: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(({ ctx }) => ctx.auth),
  adminOnly: adminProcedure
    .input(z.object({ token: z.string() }))
    .query(() => "ok" as const),
});

function call() {
  // Minimal context — the middleware only uses getRawInput, not req/res.
  return testRouter.createCaller({ req: {} as never, res: {} as never });
}

function sign(claims: Record<string, unknown>, secret = SECRET) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

describe("protectedProcedure", () => {
  it("injects venueId/role/ownerId from a valid token", async () => {
    const token = await sign({ venueId: 7, role: "owner", ownerId: 3 });
    const auth = await call().whoami({ token });
    expect(auth).toMatchObject({ venueId: 7, role: "owner", ownerId: 3 });
  });

  it("rejects a missing token", async () => {
    await expect(call().whoami({ token: "" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a garbage token", async () => {
    await expect(call().whoami({ token: "not-a-jwt" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a token signed with the wrong secret (forgery)", async () => {
    const forged = await sign({ venueId: 7 }, new TextEncoder().encode("wrong-secret"));
    await expect(call().whoami({ token: forged })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a token with no venueId claim (not tenant-scoped)", async () => {
    const noVenue = await sign({ role: "owner" });
    await expect(call().whoami({ token: noVenue })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows a staff session and a POS tablet session", async () => {
    await expect(call().whoami({ token: await sign({ venueId: 7, staffId: 4, role: "staff" }) })).resolves.toMatchObject({ venueId: 7, staffId: 4 });
    await expect(call().whoami({ token: await sign({ venueId: 7, role: "tablet" }) })).resolves.toMatchObject({ venueId: 7, role: "tablet" });
  });

  // These are all signed with the same JWT_SECRET and carry a venueId, but are
  // not owner/staff sessions — none may reach venue-management procedures.
  it("rejects a customer session (public self-signup)", async () => {
    const token = await sign({ customerId: 9, venueId: 7, email: "c@example.com" });
    await expect(call().whoami({ token })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects the 2FA pending token (password only, code not yet entered)", async () => {
    const token = await sign({ pendingStaffId: 4, venueId: 7, pending2FA: true });
    await expect(call().whoami({ token })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an OAuth state token", async () => {
    const token = await sign({ venueId: 7, provider: "square" });
    await expect(call().whoami({ token })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a venue-scoped token that names no session type", async () => {
    const token = await sign({ venueId: 7, role: "owner" });
    await expect(call().whoami({ token })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("adminProcedure", () => {
  it("allows an admin token", async () => {
    const token = await sign({ venueId: 7, staffId: 1, role: "admin" });
    await expect(call().adminOnly({ token })).resolves.toBe("ok");
  });

  it("forbids a non-admin token", async () => {
    const token = await sign({ venueId: 7, staffId: 2, role: "staff" });
    await expect(call().adminOnly({ token })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
