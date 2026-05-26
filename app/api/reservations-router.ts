import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { reservations, venues } from "@db/schema";
import { eq, and, ne, inArray, sql } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";
import { sendSms } from "./lib/sms";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const reservationsRouter = createRouter({
  // Public: customers create a reservation
  create: publicQuery
    .input(
      z.object({
        venueId: z.number().int().positive(),
        customerName: z.string().min(1).max(255),
        customerPhone: z.string().min(1).max(32),
        customerEmail: z.string().email().max(320).optional(),
        partySize: z.number().int().positive().default(2),
        reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reservationTime: z.string().regex(/^\d{2}:\d{2}$/),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get venue name for SMS
      const venueResults = await db
        .select({ name: venues.name })
        .from(venues)
        .where(eq(venues.id, input.venueId))
        .limit(1);
      const venueName = venueResults[0]?.name ?? "the cafe";

      const [row] = await db
        .insert(reservations)
        .values({
          venueId: input.venueId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          partySize: input.partySize,
          reservationDate: input.reservationDate,
          reservationTime: input.reservationTime,
          notes: input.notes,
          status: "pending",
        })
        .returning();

      try {
        await sendSms(
          input.customerPhone,
          `Your reservation at ${venueName} for ${input.partySize} on ${input.reservationDate} at ${input.reservationTime} is confirmed! Reply CANCEL to cancel.`
        );
      } catch {
        // Non-fatal — reservation is still created
      }

      return { id: row.id, status: row.status };
    }),

  // Staff: list reservations, optionally filtered by date and/or status
  list: publicQuery
    .input(
      z.object({
        token: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;

      const conditions = [eq(reservations.venueId, venueId)];
      if (input.date) conditions.push(eq(reservations.reservationDate, input.date));
      if (input.status) conditions.push(eq(reservations.status, input.status as "pending" | "confirmed" | "seated" | "cancelled" | "no_show"));

      const rows = await db
        .select()
        .from(reservations)
        .where(and(...conditions))
        .orderBy(reservations.reservationDate, reservations.reservationTime);

      return rows;
    }),

  // Staff: update reservation status
  updateStatus: publicQuery
    .input(
      z.object({
        token: z.string(),
        id: z.number().int().positive(),
        status: z.enum(["confirmed", "seated", "cancelled", "no_show"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;

      const existing = await db
        .select()
        .from(reservations)
        .where(and(eq(reservations.id, input.id), eq(reservations.venueId, venueId)))
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found" });
      }

      const [updated] = await db
        .update(reservations)
        .set({ status: input.status })
        .where(eq(reservations.id, input.id))
        .returning();

      if (input.status === "confirmed") {
        try {
          await sendSms(
            updated.customerPhone,
            `Your reservation is confirmed! See you on ${updated.reservationDate} at ${updated.reservationTime}.`
          );
        } catch {
          // Non-fatal
        }
      }

      return { ok: true };
    }),

  // Public: get slot availability for a given date
  getAvailability: publicQuery
    .input(
      z.object({
        venueId: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      const rows = await db
        .select({
          time: reservations.reservationTime,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.venueId, input.venueId),
            eq(reservations.reservationDate, input.date),
            sql`${reservations.status} NOT IN ('cancelled', 'no_show')`
          )
        )
        .groupBy(reservations.reservationTime)
        .orderBy(reservations.reservationTime);

      return rows;
    }),
});
