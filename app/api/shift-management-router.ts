import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, protectedProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { staffAvailability, timeOffRequests, shiftSwapRequests, staffAccounts, staffShifts } from "@db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { sendEmail } from "./lib/email";

export const shiftManagementRouter = createRouter({
  // ─── AVAILABILITY ───
  setAvailability: protectedProcedure.input(z.object({
    token: z.string(),
    dayOfWeek: z.number().min(0).max(6),
    available: z.boolean(),
    preferredStartTime: z.string().optional(),
    preferredEndTime: z.string().optional(),
    note: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const staffId = ctx.auth.staffId as number;
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const existing = await db.select().from(staffAvailability)
      .where(and(eq(staffAvailability.staffId, staffId), eq(staffAvailability.dayOfWeek, input.dayOfWeek)))
      .limit(1);
    if (existing[0]) {
      await db.update(staffAvailability).set({
        available: input.available,
        preferredStartTime: input.preferredStartTime,
        preferredEndTime: input.preferredEndTime,
        note: input.note,
      }).where(eq(staffAvailability.id, existing[0].id));
    } else {
      await db.insert(staffAvailability).values({
        staffId, venueId, dayOfWeek: input.dayOfWeek,
        available: input.available,
        preferredStartTime: input.preferredStartTime,
        preferredEndTime: input.preferredEndTime,
        note: input.note,
      });
    }
    return { ok: true };
  }),

  getMyAvailability: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const staffId = ctx.auth.staffId as number;
    const db = getDb();
    const rows = await db.select().from(staffAvailability)
      .where(eq(staffAvailability.staffId, staffId))
      .orderBy(asc(staffAvailability.dayOfWeek));
    // Return all 7 days, filling defaults for missing
    return Array.from({ length: 7 }, (_, i) => {
      const row = rows.find(r => r.dayOfWeek === i);
      return row ?? { dayOfWeek: i, available: true, preferredStartTime: null, preferredEndTime: null, note: null };
    });
  }),

  getTeamAvailability: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const venueId = ctx.auth.venueId;
    const role = ctx.auth.role;
    if (role === "staff") throw new TRPCError({ code: "FORBIDDEN", message: "Managers only" });
    const db = getDb();
    const staff = await db.select({ id: staffAccounts.id, name: staffAccounts.name, role: staffAccounts.role })
      .from(staffAccounts).where(and(eq(staffAccounts.venueId, venueId), eq(staffAccounts.isActive, true)));
    const avail = await db.select().from(staffAvailability).where(eq(staffAvailability.venueId, venueId));
    return staff.map(s => ({
      ...s,
      availability: Array.from({ length: 7 }, (_, i) => {
        const row = avail.find(a => a.staffId === s.id && a.dayOfWeek === i);
        return row ?? { dayOfWeek: i, available: true, preferredStartTime: null, preferredEndTime: null };
      }),
    }));
  }),

  // ─── TIME OFF REQUESTS ───
  requestTimeOff: protectedProcedure.input(z.object({
    token: z.string(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    leaveType: z.enum(["annual", "sick", "unpaid", "other"]).default("annual"),
    reason: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const staffId = ctx.auth.staffId as number;
    const venueId = ctx.auth.venueId;
    const db = getDb();
    const [req] = await db.insert(timeOffRequests).values({
      staffId, venueId, startDate: input.startDate, endDate: input.endDate,
      leaveType: input.leaveType as any, reason: input.reason,
    }).returning({ id: timeOffRequests.id });
    return { id: req.id };
  }),

  getMyTimeOffRequests: protectedProcedure.input(z.object({ token: z.string() })).query(async ({ ctx }) => {
    const staffId = ctx.auth.staffId as number;
    const db = getDb();
    return db.select().from(timeOffRequests).where(eq(timeOffRequests.staffId, staffId))
      .orderBy(desc(timeOffRequests.createdAt));
  }),

  listTimeOffRequests: protectedProcedure.input(z.object({
    token: z.string(),
    status: z.enum(["pending", "approved", "denied", "all"]).default("pending"),
  })).query(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const role = ctx.auth.role;
    if (role === "staff") throw new TRPCError({ code: "FORBIDDEN", message: "Managers only" });
    const db = getDb();
    const conditions: any[] = [eq(timeOffRequests.venueId, venueId)];
    if (input.status !== "all") conditions.push(eq(timeOffRequests.status, input.status));
    const requests = await db.select({
      id: timeOffRequests.id,
      staffId: timeOffRequests.staffId,
      startDate: timeOffRequests.startDate,
      endDate: timeOffRequests.endDate,
      leaveType: timeOffRequests.leaveType,
      reason: timeOffRequests.reason,
      status: timeOffRequests.status,
      reviewedAt: timeOffRequests.reviewedAt,
      createdAt: timeOffRequests.createdAt,
      staffName: staffAccounts.name,
    }).from(timeOffRequests)
      .innerJoin(staffAccounts, eq(timeOffRequests.staffId, staffAccounts.id))
      .where(and(...conditions))
      .orderBy(desc(timeOffRequests.createdAt));
    return requests;
  }),

  reviewTimeOff: protectedProcedure.input(z.object({
    token: z.string(),
    requestId: z.number(),
    status: z.enum(["approved", "denied"]),
    notes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const reviewerId = ctx.auth.staffId as number;
    const role = ctx.auth.role;
    if (role === "staff") throw new TRPCError({ code: "FORBIDDEN", message: "Managers only" });
    const db = getDb();
    await db.update(timeOffRequests).set({
      status: input.status as any, reviewedBy: reviewerId, reviewedAt: new Date(), notes: input.notes,
    }).where(and(eq(timeOffRequests.id, input.requestId), eq(timeOffRequests.venueId, venueId)));

    // Notify staff
    const [req] = await db.select({ staffId: timeOffRequests.staffId, startDate: timeOffRequests.startDate, endDate: timeOffRequests.endDate })
      .from(timeOffRequests).where(eq(timeOffRequests.id, input.requestId)).limit(1);
    if (req) {
      const [staffRow] = await db.select({ email: staffAccounts.email, name: staffAccounts.name })
        .from(staffAccounts).where(eq(staffAccounts.id, req.staffId)).limit(1);
      if (staffRow?.email) {
        await sendEmail({
          to: staffRow.email,
          subject: `Time off request ${input.status}`,
          html: `<p>Hi ${staffRow.name},</p><p>Your time off request (${req.startDate} – ${req.endDate}) has been <strong>${input.status}</strong>.</p>${input.notes ? `<p>Note: ${input.notes}</p>` : ""}`,
        }).catch(() => {});
      }
    }
    return { ok: true };
  }),

  // ─── SHIFT SWAP REQUESTS ───
  requestShiftSwap: protectedProcedure.input(z.object({
    token: z.string(),
    fromShiftId: z.number(),
    targetStaffId: z.number().optional(),
    targetShiftId: z.number().optional(),
    reason: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const staffId = ctx.auth.staffId as number;
    const venueId = ctx.auth.venueId;
    const db = getDb();
    // Verify from shift belongs to requestor
    const [shift] = await db.select().from(staffShifts)
      .where(and(eq(staffShifts.id, input.fromShiftId), eq(staffShifts.staffId, staffId))).limit(1);
    if (!shift) throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found or not yours" });

    const [req] = await db.insert(shiftSwapRequests).values({
      venueId, requestingStaffId: staffId, fromShiftId: input.fromShiftId,
      targetStaffId: input.targetStaffId, targetShiftId: input.targetShiftId,
      reason: input.reason,
    }).returning({ id: shiftSwapRequests.id });
    return { id: req.id };
  }),

  listShiftSwapRequests: protectedProcedure.input(z.object({
    token: z.string(),
    status: z.enum(["pending", "approved", "denied", "all"]).default("pending"),
  })).query(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const role = ctx.auth.role;
    if (role === "staff") throw new TRPCError({ code: "FORBIDDEN", message: "Managers only" });
    const db = getDb();
    const conditions: any[] = [eq(shiftSwapRequests.venueId, venueId)];
    if (input.status !== "all") conditions.push(eq(shiftSwapRequests.status, input.status));
    return db.select().from(shiftSwapRequests).where(and(...conditions)).orderBy(desc(shiftSwapRequests.createdAt));
  }),

  respondShiftSwap: protectedProcedure.input(z.object({
    token: z.string(),
    requestId: z.number(),
    status: z.enum(["approved", "denied"]),
  })).mutation(async ({ input, ctx }) => {
    const venueId = ctx.auth.venueId;
    const reviewerId = ctx.auth.staffId as number;
    const role = ctx.auth.role;
    if (role === "staff") throw new TRPCError({ code: "FORBIDDEN", message: "Managers only" });
    const db = getDb();
    await db.update(shiftSwapRequests).set({
      status: input.status as any, reviewedBy: reviewerId, reviewedAt: new Date(),
    }).where(and(eq(shiftSwapRequests.id, input.requestId), eq(shiftSwapRequests.venueId, venueId)));
    return { ok: true };
  }),
});
