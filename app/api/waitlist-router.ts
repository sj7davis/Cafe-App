import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, protectedProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { waitlistEntries, venues } from "@db/schema";
import { eq, and, inArray, max } from "drizzle-orm";
import { sendSms } from "./lib/sms";

export const waitlistRouter = createRouter({
  // Staff: get current queue (waiting + notified)
  getQueue: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx }) => {
      const venueId = ctx.auth.venueId;
      const db = getDb();
      return db
        .select()
        .from(waitlistEntries)
        .where(
          and(
            eq(waitlistEntries.venueId, venueId),
            inArray(waitlistEntries.status, ["waiting", "notified"])
          )
        )
        .orderBy(waitlistEntries.position);
    }),

  // Public: join the waitlist
  join: publicQuery
    .input(
      z.object({
        venueId: z.number().int().positive(),
        name: z.string().min(1).max(255),
        phone: z.string().min(1).max(32),
        partySize: z.number().int().positive().default(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Determine next position
      const maxResult = await db
        .select({ maxPos: max(waitlistEntries.position) })
        .from(waitlistEntries)
        .where(
          and(
            eq(waitlistEntries.venueId, input.venueId),
            inArray(waitlistEntries.status, ["waiting", "notified"])
          )
        );
      const nextPosition = (maxResult[0]?.maxPos ?? 0) + 1;

      const [entry] = await db
        .insert(waitlistEntries)
        .values({
          venueId: input.venueId,
          name: input.name,
          phone: input.phone,
          partySize: input.partySize,
          position: nextPosition,
          status: "waiting",
        })
        .returning();

      return { id: entry.id, position: entry.position };
    }),

  // Staff: notify customer their table is ready
  notify: protectedProcedure
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const venueId = ctx.auth.venueId;
      const db = getDb();

      const entryResults = await db
        .select()
        .from(waitlistEntries)
        .where(and(eq(waitlistEntries.id, input.id), eq(waitlistEntries.venueId, venueId)))
        .limit(1);
      const entry = entryResults[0];
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found" });

      // Fetch venue name
      const venueResults = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
      const venueName = venueResults[0]?.name ?? "the cafe";

      // Send SMS
      await sendSms(
        entry.phone,
        `Hi ${entry.name}! Your table is ready at ${venueName}. Please come in now 🎉`
      );

      const [updated] = await db
        .update(waitlistEntries)
        .set({ status: "notified", notifiedAt: new Date() })
        .where(eq(waitlistEntries.id, input.id))
        .returning();

      return updated;
    }),

  // Staff: mark customer as seated
  seat: protectedProcedure
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const venueId = ctx.auth.venueId;
      const db = getDb();
      const [updated] = await db
        .update(waitlistEntries)
        .set({ status: "seated" })
        .where(and(eq(waitlistEntries.id, input.id), eq(waitlistEntries.venueId, venueId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      return updated;
    }),

  // Staff: cancel a waitlist entry
  cancel: protectedProcedure
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const venueId = ctx.auth.venueId;
      const db = getDb();
      const [updated] = await db
        .update(waitlistEntries)
        .set({ status: "left" })
        .where(and(eq(waitlistEntries.id, input.id), eq(waitlistEntries.venueId, venueId)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      return updated;
    }),

  // Public: customer self-removal
  removeFromQueue: publicQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [updated] = await db
        .update(waitlistEntries)
        .set({ status: "left" })
        .where(eq(waitlistEntries.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      return updated;
    }),
});
