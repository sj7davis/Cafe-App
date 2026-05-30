import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { staffClockEvents, staffAccounts } from "@db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
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
});
