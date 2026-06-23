import { initTRPC, TRPCError } from "@trpc/server";
import { jwtVerify } from "jose";
import { type TrpcContext } from "./context";
import { env } from "./lib/env";
import { runWithTenant } from "./queries/connection";

const t = initTRPC.context<TrpcContext>().create();

export const createRouter = t.router;

/** Unauthenticated procedure. Use for genuinely public endpoints (public menu,
 *  customer ordering, waitlist join, OAuth-less reads).
 *
 *  Sets the RLS tenant scope from `input.venueId` when the public input carries
 *  one (menu, ordering, loyalty signup — all venue-addressed). Inputs without a
 *  venueId (e.g. resolving a venue by slug) run unscoped, which only reaches the
 *  public, non-RLS `venues` table. */
export const publicQuery = t.procedure.use(async (opts) => {
  const raw = await opts.getRawInput();
  const vid =
    raw && typeof raw === "object" && "venueId" in raw
      ? Number((raw as { venueId?: unknown }).venueId)
      : NaN;
  const venueId = Number.isInteger(vid) && vid > 0 ? vid : null;
  return runWithTenant(venueId, () => opts.next());
});

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

/** Authenticated venue/staff/owner identity, derived once from the JWT. */
export interface AuthContext {
  venueId: number;
  role?: string;
  staffId?: number;
  ownerId?: number;
}

/**
 * Tenant-scoped procedure. Verifies the venue JWT ONCE in middleware and injects
 * `ctx.auth` so resolvers read `ctx.auth.venueId` instead of re-verifying the
 * token and re-reading the claim in every handler (the old, easy-to-forget
 * pattern that is the main cross-tenant-leak risk).
 *
 * Backward-compatible by design: the token is still read from the procedure's
 * `input.token` (the existing frontend convention), so migrating a router to
 * this does not change its input schema or break any client call.
 */
export const protectedProcedure = t.procedure.use(async (opts) => {
  const raw = await opts.getRawInput();
  const token =
    raw && typeof raw === "object" && "token" in raw
      ? (raw as { token?: unknown }).token
      : undefined;

  if (typeof token !== "string" || token.length === 0) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }

  let claims: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    claims = verified.payload;
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired session" });
  }

  const venueId = Number(claims.venueId);
  if (!Number.isInteger(venueId) || venueId <= 0) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session is not venue-scoped" });
  }

  const auth: AuthContext = {
    venueId,
    role: typeof claims.role === "string" ? claims.role : undefined,
    staffId: typeof claims.staffId === "number" ? claims.staffId : undefined,
    ownerId: typeof claims.ownerId === "number" ? claims.ownerId : undefined,
  };

  // Scope every query in this request to the tenant for RLS, derived from the
  // verified token (never from client input).
  return runWithTenant(venueId, () => opts.next({ ctx: { auth } }));
});

/**
 * Admin-only variant. Builds on protectedProcedure, so `ctx.auth` is available
 * and the role is enforced centrally instead of via scattered
 * `role === "admin"` checks. (Used as routers migrate; safe to adopt lazily.)
 */
export const adminProcedure = protectedProcedure.use(async (opts) => {
  if (opts.ctx.auth.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return opts.next();
});
