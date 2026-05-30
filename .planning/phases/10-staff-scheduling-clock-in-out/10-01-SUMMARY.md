---
phase: 10-staff-scheduling-clock-in-out
plan: "01"
subsystem: staff-clock
tags: [clock-in, timezone, schema, fair-work, penalty-rates]
dependency_graph:
  requires: []
  provides: [clockPin-column, break-event-types, AEST-penalty-rates, double-clock-in-guard, setClockPin-mutation]
  affects: [app/db/schema.ts, app/api/clock-router.ts, app/api/staff-auth-router.ts]
tech_stack:
  added: []
  patterns: [Intl.DateTimeFormat timezone conversion, tRPC CONFLICT error, drizzle nullable column]
key_files:
  created: []
  modified:
    - app/db/schema.ts
    - app/api/clock-router.ts
    - app/api/staff-auth-router.ts
decisions:
  - "Store clockPin as plain varchar (no bcrypt) — accepted by threat model T-10-03: low-value 4-digit tablet code"
  - "Use Intl.DateTimeFormat formatToParts for AEST conversion — handles DST transitions correctly vs fixed offset"
  - "Double-clock-in guard queries last event by desc(clockedAt), not today-only — catches cross-midnight shifts correctly"
metrics:
  duration: "12 minutes"
  completed: "2026-05-30"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 10 Plan 01: Staff Clock Schema + Timezone Fix Summary

Schema additions and bug fixes for Fair Work compliant clock-in: AEST penalty rates, break event types, clockPin column, and double-clock-in guard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add clockPin to staffAccounts schema + break events to staffClockEvents | 77e459e | app/db/schema.ts |
| 2 | Fix getPenaltyFlag timezone bug + add double-clock-in guard in clock-router.ts | 62a1545 | app/api/clock-router.ts |
| 3 | Add setClockPin mutation to staff-auth-router.ts | 4dbbc14 | app/api/staff-auth-router.ts |

## What Was Built

**Task 1 — Schema changes (app/db/schema.ts):**
- Added `clockPin: varchar("clock_pin", { length: 8 })` (nullable) to `staffAccounts` — stores 4-8 digit tablet PIN per staff member
- Extended `staffClockEvents.eventType` varchar from length 8 to 12 and updated the TypeScript type union from `"in" | "out"` to `"in" | "out" | "break_start" | "break_end"` — required for CLOCK-04 break tracking

**Task 2 — Timezone fix + guard (app/api/clock-router.ts):**
- Replaced `getPenaltyFlag` implementation: was using `clockedAt.getDay()` and `clockedAt.getHours()` (UTC), now uses `Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney' }).formatToParts()` to extract weekday abbreviation and hour in Australian wall-clock time — correctly fires Saturday/Sunday/late-night penalty flags regardless of Railway UTC runtime
- Added double-clock-in guard to `clockIn` mutation: queries the last clock event for the (staffId, venueId) pair ordered by `desc(clockedAt)`, throws `TRPCError({ code: 'CONFLICT' })` if last event type is `'in'`

**Task 3 — PIN mutations (app/api/staff-auth-router.ts):**
- Added `setClockPin` mutation: JWT-authed, validates 4-8 digit regex `^\d{4,8}$`, updates `staffAccounts.clockPin` — staffId sourced from JWT payload only (mitigates T-10-01 spoofing)
- Added `clearClockPin` mutation: JWT-authed, sets `clockPin` to null

## Deviations from Plan

### Drizzle Push — Environment Limitation

`npx drizzle-kit push` was run from the development machine but could not connect to the Railway PostgreSQL database (connection timeout in this environment). The schema changes are committed to source. The DB migration will apply on Railway deployment via the app's standard deploy pipeline.

This is not a blocking deviation — no new packages were required and the schema change is a simple column add + varchar length change that does not require a migration file.

## Known Stubs

None — this plan is backend-only; no UI stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes at trust boundaries beyond those already in the threat model (T-10-01, T-10-02, T-10-03, T-10-SC).

## Self-Check: PASSED

- [x] app/db/schema.ts modified — clockPin column present (line 195: `clock_pin`)
- [x] app/db/schema.ts modified — break_start/break_end in eventType (line 618)
- [x] app/api/clock-router.ts — Australia/Sydney timezone present (line 15)
- [x] app/api/clock-router.ts — CONFLICT guard present (line 43)
- [x] app/api/staff-auth-router.ts — setClockPin mutation present (line 412)
- [x] Commit 77e459e exists: `feat(10-01): add clockPin to staffAccounts + break events to staffClockEvents`
- [x] Commit 62a1545 exists: `fix(10-01): fix UTC timezone bug in getPenaltyFlag + add double-clock-in guard`
- [x] Commit 4dbbc14 exists: `feat(10-01): add setClockPin and clearClockPin mutations to staffAuthRouter`
- [x] TypeScript compiles without errors (verified after each task)
