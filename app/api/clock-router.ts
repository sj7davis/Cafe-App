import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { staffClockEvents, staffAccounts, venues } from "@db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

// AU penalty rate thresholds — all day/hour calculations in Australia/Sydney wall-clock time
function getPenaltyFlag(clockedAt: Date): string | null {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(clockedAt);
  const dayAbbr = parts.find(p => p.type === 'weekday')?.value; // 'Sun', 'Sat', etc.
  const hourStr = parts.find(p => p.type === 'hour')?.value;
  const hour = parseInt(hourStr ?? '0', 10);
  if (dayAbbr === 'Sun') return "Sunday penalty (200%)";
  if (dayAbbr === 'Sat') return "Saturday penalty (125%)";
  if (hour >= 21 || hour < 6) return "Late night / early morning (125%)";
  return null;
}

export const clockRouter = createRouter({
  clockIn: publicQuery.input(z.object({ token: z.string(), note: z.string().optional() })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const venueId = payload.payload.venueId as number;
    if (!staffId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = getDb();
    // Double-clock-in guard: reject if the last event for this staff+venue is already "in"
    const last = await db.select({ eventType: staffClockEvents.eventType })
      .from(staffClockEvents)
      .where(and(eq(staffClockEvents.staffId, staffId), eq(staffClockEvents.venueId, venueId)))
      .orderBy(desc(staffClockEvents.clockedAt))
      .limit(1);
    if (last[0]?.eventType === 'in') {
      throw new TRPCError({ code: 'CONFLICT', message: 'Already clocked in. Clock out first.' });
    }
    const now = new Date();
    await db.insert(staffClockEvents).values({ venueId, staffId, eventType: "in", clockedAt: now, note: input.note });
    return { ok: true, clockedAt: now.toISOString(), penaltyFlag: getPenaltyFlag(now) };
  }),

  clockOut: publicQuery.input(z.object({ token: z.string(), note: z.string().optional() })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const venueId = payload.payload.venueId as number;
    if (!staffId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = getDb();
    const now = new Date();
    await db.insert(staffClockEvents).values({ venueId, staffId, eventType: "out", clockedAt: now, note: input.note });
    return { ok: true, clockedAt: now.toISOString() };
  }),

  getMyStatus: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const venueId = payload.payload.venueId as number;
    if (!staffId) return { isClockedIn: false, lastEvent: null };
    const db = getDb();
    const last = await db.select().from(staffClockEvents)
      .where(and(eq(staffClockEvents.staffId, staffId), eq(staffClockEvents.venueId, venueId)))
      .orderBy(desc(staffClockEvents.clockedAt)).limit(1);
    const isClockedIn = last[0]?.eventType === "in";
    return { isClockedIn, lastEvent: last[0] ?? null };
  }),

  getShiftHistory: publicQuery.input(z.object({ token: z.string(), days: z.number().default(14) })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const since = new Date(Date.now() - input.days * 86400000);
    const events = await db.select({
      id: staffClockEvents.id,
      staffId: staffClockEvents.staffId,
      staffName: staffAccounts.name,
      eventType: staffClockEvents.eventType,
      clockedAt: staffClockEvents.clockedAt,
      note: staffClockEvents.note,
    })
      .from(staffClockEvents)
      .innerJoin(staffAccounts, eq(staffClockEvents.staffId, staffAccounts.id))
      .where(and(eq(staffClockEvents.venueId, venueId), gte(staffClockEvents.clockedAt, since)))
      .orderBy(desc(staffClockEvents.clockedAt));
    return events;
  }),

  getHoursSummary: publicQuery.input(z.object({ token: z.string(), days: z.number().default(14) })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();
    const since = new Date(Date.now() - input.days * 86400000);
    const events = await db.select({
      staffId: staffClockEvents.staffId,
      staffName: staffAccounts.name,
      eventType: staffClockEvents.eventType,
      clockedAt: staffClockEvents.clockedAt,
    })
      .from(staffClockEvents)
      .innerJoin(staffAccounts, eq(staffClockEvents.staffId, staffAccounts.id))
      .where(and(eq(staffClockEvents.venueId, venueId), gte(staffClockEvents.clockedAt, since)))
      .orderBy(staffClockEvents.staffId, staffClockEvents.clockedAt);

    // Pair in/out events per staff member
    const staffMap: Record<number, { name: string; totalMinutes: number; shifts: number; penaltyFlags: string[] }> = {};
    const inEvents: Record<number, Date> = {};
    for (const e of events) {
      if (!staffMap[e.staffId]) staffMap[e.staffId] = { name: e.staffName ?? "Unknown", totalMinutes: 0, shifts: 0, penaltyFlags: [] };
      if (e.eventType === "in") {
        inEvents[e.staffId] = e.clockedAt;
        const flag = getPenaltyFlag(e.clockedAt);
        if (flag && !staffMap[e.staffId].penaltyFlags.includes(flag)) staffMap[e.staffId].penaltyFlags.push(flag);
      } else if (e.eventType === "out" && inEvents[e.staffId]) {
        const mins = Math.round((e.clockedAt.getTime() - inEvents[e.staffId].getTime()) / 60000);
        staffMap[e.staffId].totalMinutes += mins;
        staffMap[e.staffId].shifts++;
        delete inEvents[e.staffId];
      }
    }
    return Object.entries(staffMap).map(([id, data]) => ({
      staffId: Number(id),
      ...data,
      totalHours: (data.totalMinutes / 60).toFixed(1),
    }));
  }),

  // ─── PIN login for shared tablet ───
  loginByPin: publicQuery.input(z.object({
    slug: z.string(),
    pin: z.string().regex(/^\d{4,8}$/),
  })).mutation(async ({ input }) => {
    const db = getDb();
    const venueRows = await db.select({ id: venues.id, name: venues.name })
      .from(venues).where(eq(venues.slug, input.slug)).limit(1);
    if (!venueRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
    const venue = venueRows[0];

    const staffRows = await db.select({ id: staffAccounts.id, name: staffAccounts.name, role: staffAccounts.role })
      .from(staffAccounts)
      .where(and(
        eq(staffAccounts.venueId, venue.id),
        eq(staffAccounts.clockPin, input.pin),
        eq(staffAccounts.isActive, true),
      )).limit(1);
    if (!staffRows[0]) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid PIN" });
    const staff = staffRows[0];

    const token = await new SignJWT({ staffId: staff.id, venueId: venue.id, role: staff.role, name: staff.name })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(JWT_SECRET);

    return { token, staffName: staff.name, venueName: venue.name };
  }),

  // ─── Break start ───
  breakStart: publicQuery.input(z.object({ token: z.string(), note: z.string().optional() })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const venueId = payload.payload.venueId as number;
    if (!staffId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = getDb();
    const now = new Date();
    await db.insert(staffClockEvents).values({ venueId, staffId, eventType: "break_start", clockedAt: now, note: input.note });
    return { ok: true, clockedAt: now.toISOString() };
  }),

  // ─── Break end ───
  breakEnd: publicQuery.input(z.object({ token: z.string(), note: z.string().optional() })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const staffId = payload.payload.staffId as number;
    const venueId = payload.payload.venueId as number;
    if (!staffId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = getDb();
    const now = new Date();
    await db.insert(staffClockEvents).values({ venueId, staffId, eventType: "break_end", clockedAt: now, note: input.note });
    return { ok: true, clockedAt: now.toISOString() };
  }),
});
