import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { staffAccounts, venues } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { compare } from "bcrypt-ts";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const staffAuthRouter = createRouter({
  // Staff login with venue context
  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
        venueId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Verify venue exists
      const venueResults = await db
        .select()
        .from(venues)
        .where(eq(venues.id, input.venueId))
        .limit(1);
      const venue = venueResults[0];
      if (!venue || !venue.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
      }

      // Find staff account
      const staffResults = await db
        .select()
        .from(staffAccounts)
        .where(
          and(
            eq(staffAccounts.username, input.username),
            eq(staffAccounts.venueId, input.venueId)
          )
        )
        .limit(1);
      const staff = staffResults[0];
      if (!staff || !staff.isActive) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      const valid = await compare(input.password, staff.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      const token = await new SignJWT({
        staffId: staff.id,
        venueId: staff.venueId,
        role: staff.role,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      await db
        .update(staffAccounts)
        .set({ lastLoginAt: new Date() })
        .where(eq(staffAccounts.id, staff.id));

      return {
        token,
        staff: {
          id: staff.id,
          name: staff.name,
          username: staff.username,
          role: staff.role,
        },
        venue: {
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
        },
      };
    }),

  // Get current staff from token
  me: publicQuery
    .input(z.object({ token: z.string() }).optional())
    .query(async ({ input }) => {
      if (!input?.token) return null;
      try {
        const payload = await jwtVerify(input.token, JWT_SECRET, {
          clockTolerance: 60,
        });
        const db = getDb();
        const staffResults = await db
          .select()
          .from(staffAccounts)
          .where(eq(staffAccounts.id, payload.payload.staffId as number))
          .limit(1);
        const staff = staffResults[0];
        if (!staff || !staff.isActive) return null;

        const venueResults = await db
          .select()
          .from(venues)
          .where(eq(venues.id, staff.venueId))
          .limit(1);
        const venue = venueResults[0];

        return {
          staff: {
            id: staff.id,
            name: staff.name,
            username: staff.username,
            role: staff.role,
          },
          venue: venue
            ? { id: venue.id, name: venue.name, slug: venue.slug }
            : null,
        };
      } catch {
        return null;
      }
    }),

  // List staff for a venue (admin/manager only)
  list: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      try {
        const payload = await jwtVerify(input.token, JWT_SECRET, {
          clockTolerance: 60,
        });
        const db = getDb();
        const venueId = payload.payload.venueId as number;

        // Verify caller is admin or manager
        const callerResults = await db
          .select()
          .from(staffAccounts)
          .where(eq(staffAccounts.id, payload.payload.staffId as number))
          .limit(1);
        const caller = callerResults[0];
        if (!caller || caller.role === "staff") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        const allStaff = await db
          .select()
          .from(staffAccounts)
          .where(eq(staffAccounts.venueId, venueId));
        return allStaff.map((s) => ({
          id: s.id,
          name: s.name,
          username: s.username,
          role: s.role,
          isActive: s.isActive,
          lastLoginAt: s.lastLoginAt,
          createdAt: s.createdAt,
        }));
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
      }
    }),

  // Create staff account (admin only)
  create: publicQuery
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1),
        username: z.string().min(1),
        password: z.string().min(4),
        role: z.enum(["admin", "manager", "staff"]),
      })
    )
    .mutation(async ({ input }) => {
      const { hash } = await import("bcrypt-ts");
      const payload = await jwtVerify(input.token, JWT_SECRET, {
        clockTolerance: 60,
      });
      const db = getDb();
      const venueId = payload.payload.venueId as number;

      // Verify caller is admin
      const callerResults = await db
        .select()
        .from(staffAccounts)
        .where(eq(staffAccounts.id, payload.payload.staffId as number))
        .limit(1);
      const caller = callerResults[0];
      if (!caller || caller.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }

      // Check username uniqueness within venue
      const existing = await db
        .select()
        .from(staffAccounts)
        .where(
          and(
            eq(staffAccounts.username, input.username),
            eq(staffAccounts.venueId, venueId)
          )
        )
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Username already taken" });
      }

      const passwordHash = await hash(input.password, 10);
      await db.insert(staffAccounts).values({
        venueId,
        name: input.name,
        username: input.username,
        passwordHash,
        role: input.role,
      });

      return { success: true };
    }),

  // Update staff (admin only)
  update: publicQuery
    .input(
      z.object({
        token: z.string(),
        staffId: z.number().int().positive(),
        name: z.string().optional(),
        role: z.enum(["admin", "manager", "staff"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, {
        clockTolerance: 60,
      });
      const db = getDb();

      // Verify caller is admin
      const callerResults = await db
        .select()
        .from(staffAccounts)
        .where(eq(staffAccounts.id, payload.payload.staffId as number))
        .limit(1);
      const caller = callerResults[0];
      if (!caller || caller.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }

      await db
        .update(staffAccounts)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.role !== undefined && { role: input.role }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        })
        .where(eq(staffAccounts.id, input.staffId));

      return { success: true };
    }),

  // Reset password (admin only)
  resetPassword: publicQuery
    .input(
      z.object({
        token: z.string(),
        staffId: z.number().int().positive(),
        newPassword: z.string().min(4),
      })
    )
    .mutation(async ({ input }) => {
      const { hash } = await import("bcrypt-ts");
      const payload = await jwtVerify(input.token, JWT_SECRET, {
        clockTolerance: 60,
      });
      const db = getDb();

      // Verify caller is admin
      const callerResults = await db
        .select()
        .from(staffAccounts)
        .where(eq(staffAccounts.id, payload.payload.staffId as number))
        .limit(1);
      const caller = callerResults[0];
      if (!caller || caller.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }

      const passwordHash = await hash(input.newPassword, 10);
      await db
        .update(staffAccounts)
        .set({ passwordHash })
        .where(eq(staffAccounts.id, input.staffId));

      return { success: true };
    }),
});
