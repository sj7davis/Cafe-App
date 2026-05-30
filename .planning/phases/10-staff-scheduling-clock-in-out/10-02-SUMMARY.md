---
phase: 10-staff-scheduling-clock-in-out
plan: "02"
subsystem: staff-clock-in
tags: [clock-in, tablet-ui, pin-auth, tRPC]
dependency_graph:
  requires: [10-01]
  provides: [clock-page, clock-pin-auth, break-tracking]
  affects: [app/src/App.tsx, app/src/pages/StaffDashboard.tsx]
tech_stack:
  added: []
  patterns: [shared-tablet-PIN-flow, tRPC-public-mutation, inline-styles, state-machine-screens]
key_files:
  created:
    - app/src/pages/ClockPage.tsx
  modified:
    - app/src/App.tsx
    - app/src/pages/StaffDashboard.tsx
    - app/api/clock-router.ts
    - app/api/staff-auth-router.ts
    - app/db/schema.ts
decisions:
  - Staff JWT from loginByPin stored in React useState only (never localStorage) — shared tablet safety
  - Auto-submit PIN at exactly 4 digits; longer PINs not supported to match typical Deputy-style kiosk UX
  - Break state derived from last event type: break_start=on_break, break_end/in=clocked_in, out=not_clocked_in
  - 30-second inactivity timer clears token and resets to PIN screen
  - Confirmation screen auto-dismisses after 4 seconds
metrics:
  duration: "18 minutes"
  completed: "2026-05-30"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 6
---

# Phase 10 Plan 02: Clock-In Tablet UI Summary

Tablet-optimised PIN clock-in page at `/clock/:slug` with three-screen state machine (PIN entry, action, confirmation), plus `loginByPin`/`breakStart`/`breakEnd` backend procedures and a Clock-In PIN setup card in the staff ProfileTab.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add loginByPin, breakStart, breakEnd + schema | f3467eb | clock-router.ts, staff-auth-router.ts, schema.ts |
| 2 | Create ClockPage.tsx tablet UI | 2d53f70 | app/src/pages/ClockPage.tsx (new) |
| 3 | Register route + add PIN setup to ProfileTab | 9786e51 | App.tsx, StaffDashboard.tsx |

## What Was Built

**ClockPage.tsx** — a dark-themed (`#0F0F0F`) tablet UI with:
- Screen A: live AEST clock (updates every second), PIN dot display, 3x4 numpad (80x64px buttons), auto-submits on 4th digit via `trpc.clock.loginByPin`
- Screen B: staff name, last-event-derived clock status (not clocked in / clocked in / on break), contextual action buttons (Clock In / Start Break + Clock Out / End Break), 30s inactivity auto-reset
- Screen C: confirmation message with optional penalty-rate badge, auto-dismisses after 4 seconds

**clock-router.ts** additions:
- `loginByPin`: public mutation resolves venue slug, looks up staff by clockPin + isActive, issues 8h JWT
- `breakStart`: inserts `break_start` event type
- `breakEnd`: inserts `break_end` event type

**staff-auth-router.ts** additions (deviation):
- `setClockPin`: sets `clockPin` on the authenticated staff account
- `clearClockPin`: nulls `clockPin`

**schema.ts** additions (deviation):
- `clockPin varchar(8)` column on `staffAccounts`
- `eventType` extended to `varchar(16)` with type union including `break_start`/`break_end`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] clockPin schema column missing**
- **Found during:** Task 1 pre-execution check
- **Issue:** Plan 10-01 (which adds `clockPin` to schema and `setClockPin`/`clearClockPin` to staff-auth-router) had not been committed to this worktree. The `staffAccounts` table had no `clockPin` column, making `loginByPin` and the ProfileTab PIN section non-functional.
- **Fix:** Added `clockPin varchar(8)` to `staffAccounts` in schema.ts; extended `staffClockEvents.eventType` to `varchar(16)` to accommodate `break_start`/`break_end`.
- **Files modified:** app/db/schema.ts
- **Commit:** f3467eb

**2. [Rule 2 - Missing Critical Functionality] setClockPin/clearClockPin mutations missing**
- **Found during:** Task 1 pre-execution check
- **Issue:** `trpc.staffAuth.setClockPin` and `trpc.staffAuth.clearClockPin` referenced in Task 3 (ProfileTab) did not exist in staff-auth-router.ts.
- **Fix:** Added both mutations to staffAuthRouter.
- **Files modified:** app/api/staff-auth-router.ts
- **Commit:** f3467eb

## Known Stubs

None. The ClockPage calls real tRPC procedures; status is derived from live `getMyStatus` query. The `venueName` is populated from the `loginByPin` response (displayed after PIN entry succeeds). Before PIN is entered, the venue name falls back to the URL slug.

## Threat Flags

No new security surface beyond what was specified in the plan's threat model. `loginByPin` is a public mutation (no session required) — consistent with T-10-04 acceptance. The 8h JWT is scoped to `staffId`/`venueId` and does not carry owner-level permissions.

## Self-Check: PASSED

- [x] app/src/pages/ClockPage.tsx exists with `export default function ClockPage`
- [x] app/src/App.tsx contains `/clock/:slug` route
- [x] app/api/clock-router.ts contains `loginByPin`
- [x] app/src/pages/StaffDashboard.tsx contains `setClockPin`
- [x] Commits f3467eb, 2d53f70, 9786e51 exist in git log
- [x] TypeScript compiles without errors (tsc --noEmit exit 0)
