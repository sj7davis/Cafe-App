import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { staffShifts, staffAccounts } from "@db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";
import { sendEmail } from "./lib/email";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const schedulingRouter = createRouter({
  listShifts: publicQuery.input(z.object({
    token: z.string(),
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    // Compute weekEnd (7 days from weekStart)
    const start = new Date(input.weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const weekEnd = end.toISOString().slice(0, 10);

    const shifts = await db
      .select({
        id: staffShifts.id,
        venueId: staffShifts.venueId,
        staffId: staffShifts.staffId,
        shiftDate: staffShifts.shiftDate,
        startTime: staffShifts.startTime,
        endTime: staffShifts.endTime,
        role: staffShifts.role,
        notes: staffShifts.notes,
        createdAt: staffShifts.createdAt,
        staffName: staffAccounts.name,
      })
      .from(staffShifts)
      .innerJoin(staffAccounts, eq(staffShifts.staffId, staffAccounts.id))
      .where(
        and(
          eq(staffShifts.venueId, venueId),
          gte(staffShifts.shiftDate, input.weekStart),
          lte(staffShifts.shiftDate, weekEnd),
        )
      );

    return shifts;
  }),

  addShift: publicQuery.input(z.object({
    token: z.string(),
    staffId: z.number().int().positive(),
    shiftDate: z.string().min(1, 'Shift date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z.string().min(1, 'Start time is required').regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
    endTime: z.string().min(1, 'End time is required').regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
    role: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    // Verify the staff member belongs to this venue
    const staffRows = await db.select({ id: staffAccounts.id })
      .from(staffAccounts)
      .where(and(eq(staffAccounts.id, input.staffId), eq(staffAccounts.venueId, venueId)))
      .limit(1);
    if (!staffRows[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found in this venue" });
    }

    const [row] = await db.insert(staffShifts).values({
      venueId,
      staffId: input.staffId,
      shiftDate: input.shiftDate,
      startTime: input.startTime,
      endTime: input.endTime,
      role: input.role ?? null,
      notes: input.notes ?? null,
    }).returning({ id: staffShifts.id });

    return { success: true, shiftId: row.id };
  }),

  updateShift: publicQuery.input(z.object({
    token: z.string(),
    shiftId: z.number().int().positive(),
    shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    role: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    const existing = await db.select({ id: staffShifts.id, venueId: staffShifts.venueId })
      .from(staffShifts)
      .where(eq(staffShifts.id, input.shiftId))
      .limit(1);
    if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
    if (existing[0].venueId !== venueId) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });

    const updateData: Record<string, unknown> = {};
    if (input.shiftDate !== undefined) updateData.shiftDate = input.shiftDate;
    if (input.startTime !== undefined) updateData.startTime = input.startTime;
    if (input.endTime !== undefined) updateData.endTime = input.endTime;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.notes !== undefined) updateData.notes = input.notes;

    if (Object.keys(updateData).length > 0) {
      await db.update(staffShifts).set(updateData).where(eq(staffShifts.id, input.shiftId));
    }

    return { success: true };
  }),

  deleteShift: publicQuery.input(z.object({
    token: z.string(),
    shiftId: z.number().int().positive(),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    const existing = await db.select({ id: staffShifts.id, venueId: staffShifts.venueId })
      .from(staffShifts)
      .where(eq(staffShifts.id, input.shiftId))
      .limit(1);
    if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
    if (existing[0].venueId !== venueId) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });

    await db.delete(staffShifts).where(eq(staffShifts.id, input.shiftId));
    return { success: true };
  }),

  listStaff: publicQuery.input(z.object({
    token: z.string(),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    const staff = await db.select({
      id: staffAccounts.id,
      name: staffAccounts.name,
      username: staffAccounts.username,
      role: staffAccounts.role,
      isActive: staffAccounts.isActive,
    })
      .from(staffAccounts)
      .where(and(eq(staffAccounts.venueId, venueId), eq(staffAccounts.isActive, true)));

    return staff;
  }),

  getMyShifts: publicQuery.input(z.object({
    token: z.string(),
    weeksAhead: z.number().default(2),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + input.weeksAhead * 7 * 86400000).toISOString().slice(0, 10);
    return db.select().from(staffShifts)
      .where(and(
        eq(staffShifts.staffId, staffId),
        eq(staffShifts.venueId, venueId),
        gte(staffShifts.shiftDate, today),
        lte(staffShifts.shiftDate, future),
      ))
      .orderBy(asc(staffShifts.shiftDate));
  }),

  publishRoster: publicQuery.input(z.object({
    token: z.string(),
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const role = payload.payload.role as string;
    if (role === "staff") throw new TRPCError({ code: "FORBIDDEN", message: "Managers only" });
    const db = getDb();

    const start = new Date(input.weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const weekEnd = end.toISOString().slice(0, 10);

    const shifts = await db.select({
      id: staffShifts.id,
      shiftDate: staffShifts.shiftDate,
      startTime: staffShifts.startTime,
      endTime: staffShifts.endTime,
      role: staffShifts.role,
      staffId: staffShifts.staffId,
      staffName: staffAccounts.name,
      staffEmail: staffAccounts.email,
    }).from(staffShifts)
      .innerJoin(staffAccounts, eq(staffShifts.staffId, staffAccounts.id))
      .where(and(
        eq(staffShifts.venueId, venueId),
        gte(staffShifts.shiftDate, input.weekStart),
        lte(staffShifts.shiftDate, weekEnd),
      ));

    // Group by staff and email each
    const byStaff = new Map<number, typeof shifts>();
    for (const shift of shifts) {
      if (!byStaff.has(shift.staffId)) byStaff.set(shift.staffId, []);
      byStaff.get(shift.staffId)!.push(shift);
    }

    let notified = 0;
    for (const [staffId, staffShiftList] of byStaff) {
      const email = staffShiftList[0]?.staffEmail;
      const name = staffShiftList[0]?.staffName;
      if (!email) continue;
      const rows = staffShiftList.map(s =>
        `<tr><td>${s.shiftDate}</td><td>${s.startTime}–${s.endTime}</td><td>${s.role || "Staff"}</td></tr>`
      ).join("");
      await sendEmail({
        to: email,
        subject: `Your roster — week of ${input.weekStart}`,
        html: `<p>Hi ${name},</p><p>Your shifts for the week of ${input.weekStart}:</p><table border="1" cellpadding="6"><thead><tr><th>Date</th><th>Time</th><th>Role</th></tr></thead><tbody>${rows}</tbody></table><p>Login to view: ${env.appUrl}/staff</p>`,
      }).catch(() => {});
      notified++;
    }

    return { notified, totalShifts: shifts.length };
  }),
});
