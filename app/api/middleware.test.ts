/**
 * Tests for protectedProcedure — the tenant-scope gate. Proves the JWT is
 * verified once and venueId is injected, and that bad/forged/unscoped tokens
 * are rejected before any resolver runs. No DB needed.
 */
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { z } from "zod";
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
});

describe("adminProcedure", () => {
  it("allows an admin token", async () => {
    const token = await sign({ venueId: 7, role: "admin" });
    await expect(call().adminOnly({ token })).resolves.toBe("ok");
  });

  it("forbids a non-admin token", async () => {
    const token = await sign({ venueId: 7, role: "staff" });
    await expect(call().adminOnly({ token })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
