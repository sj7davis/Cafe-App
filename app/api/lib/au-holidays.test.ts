import { describe, it, expect } from "vitest";
import { auPublicHolidays, publicHolidayName, localDateTime, timezoneForState, zonedTimeToUtc, startOfLocalDay } from "./au-holidays";

describe("auPublicHolidays", () => {
  it("matches the published 2026 VIC dates", () => {
    const vic = auPublicHolidays(2026, "VIC");
    for (const d of [
      "2026-01-01", "2026-01-26", "2026-03-09", "2026-04-03", "2026-04-04", "2026-04-05",
      "2026-04-06", "2026-04-25", "2026-06-08", "2026-11-03", "2026-12-25", "2026-12-28",
    ]) expect(vic.has(d), d).toBe(true);
  });

  it("keeps working past the old hand-typed list (2027)", () => {
    expect(publicHolidayName("2027-03-26", "NSW")).toBe("Good Friday");
    expect(publicHolidayName("2027-01-26", "NSW")).toBe("Australia Day");
    // Christmas 2027 is a Saturday, Boxing Day a Sunday → Mon 27 + Tue 28
    expect(publicHolidayName("2027-12-27", "VIC")).toMatch(/substitute/);
    expect(publicHolidayName("2027-12-28", "VIC")).toMatch(/substitute/);
  });

  it("applies state rules", () => {
    expect(publicHolidayName("2026-11-03", "NSW")).toBeNull(); // Cup Day is VIC only
    expect(publicHolidayName("2026-10-05", "QLD")).toBe("King's Birthday");
    expect(publicHolidayName("2026-06-08", "QLD")).toBeNull();
    expect(publicHolidayName("2026-03-09", "SA")).toBe("Adelaide Cup Day");
    expect(publicHolidayName("2026-06-01", "ACT")).toBe("Reconciliation Day");
  });

  it("defaults unknown states to VIC", () => {
    expect(publicHolidayName("2026-11-03", undefined)).toBe("Melbourne Cup Day");
  });
});

describe("localDateTime", () => {
  it("uses the venue's timezone, not UTC", () => {
    // 2026-11-16 14:30 UTC is already 01:30 on the 17th in Melbourne (AEDT)
    const t = localDateTime(new Date("2026-11-16T14:30:00Z"), timezoneForState("VIC"));
    expect(t).toEqual({ date: "2026-11-17", minutes: 90 });
  });
});

describe("zonedTimeToUtc", () => {
  it("converts Melbourne wall-clock time (AEDT, UTC+11)", () => {
    expect(zonedTimeToUtc("2026-11-17", "09:00", "Australia/Melbourne").toISOString()).toBe("2026-11-16T22:00:00.000Z");
  });
  it("handles standard time (AEST, UTC+10) and Perth", () => {
    expect(zonedTimeToUtc("2026-07-01", "12:30", "Australia/Melbourne").toISOString()).toBe("2026-07-01T02:30:00.000Z");
    expect(zonedTimeToUtc("2026-07-01", "12:30", "Australia/Perth").toISOString()).toBe("2026-07-01T04:30:00.000Z");
  });
  it("finds local midnight", () => {
    expect(startOfLocalDay(new Date("2026-11-17T03:00:00Z"), "Australia/Melbourne").toISOString()).toBe("2026-11-16T13:00:00.000Z");
  });
});
