---
phase: 01-owner-access-menu-management
plan: "01"
subsystem: api
tags: [trpc, drizzle, jwt, mysql, jose]

# Dependency graph
requires: []
provides:
  - "trpc.venue.updateMenuItem mutation with JWT auth and venue ownership check"
  - "trpc.venue.deleteMenuItem mutation with FK conflict guard against order_items"
affects:
  - 01-owner-access-menu-management
  - Menu Tab UI (plan 03)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth pattern: jwtVerify + venueId ownership check before any mutation"
    - "FK guard pattern: select from child table before delete to return CONFLICT not raw FK error"
    - "Price coercion: number.toFixed(2) to satisfy decimal(10,2) column type"

key-files:
  created: []
  modified:
    - app/api/venue-router.ts

key-decisions:
  - "deleteMenuItem returns CONFLICT TRPCError (not raw MySQL FK crash) — UI-SPEC copywriting contract requires exact message string"
  - "updateMenuItem uses Record<string,unknown> spread for dynamic partial updates via Drizzle set()"
  - "Both mutations re-use existing JWT_SECRET and jwtVerify pattern from venue.update — no new imports needed"

patterns-established:
  - "Authed mutation pattern: getDb() → jwtVerify() → ownership check → business logic → return success"
  - "FK conflict guard: db.select().from(childTable).where(eq(childTable.fkCol, id)).limit(1) before delete"

requirements-completed:
  - MENU-03

# Metrics
duration: 8min
completed: 2026-05-23
---

# Phase 01 Plan 01: updateMenuItem and deleteMenuItem Mutations Summary

**Two JWT-authed tRPC mutations added to venueRouter: updateMenuItem (partial field update with venue ownership check) and deleteMenuItem (FK-safe removal returning CONFLICT when order_items exist)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-23T12:00:00Z
- **Completed:** 2026-05-23T12:08:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- `updateMenuItem` mutation added: validates JWT, checks venueId ownership, coerces price to string, performs partial drizzle update
- `deleteMenuItem` mutation added: validates JWT, checks venueId ownership, guards against FK violation by querying orderItems first, deletes only if safe
- TypeScript compiles cleanly with zero errors after both insertions
- Both mutations placed immediately after `createMenuItem` and before `// ─── Inventory ───` section as specified

## Task Commits

Both tasks were executed and verified in a single atomic commit (the code was inserted together and TypeScript verified before committing):

1. **Task 1: Add updateMenuItem mutation** - `c924c76` (feat)
2. **Task 2: Add deleteMenuItem mutation with FK conflict guard** - `c924c76` (feat)

## Files Created/Modified
- `app/api/venue-router.ts` - Added 56 lines: `updateMenuItem` and `deleteMenuItem` mutations in the Menu Management section

## Decisions Made
- Both mutations implemented together in one edit since they are co-located in the file and independently verifiable via grep — no deviation from plan, just efficient execution.
- Used `db.delete(menuItems).where(...)` (Drizzle MySQL syntax without `.from()` chaining) as specified in plan notes.
- FK conflict message string matches UI-SPEC copywriting contract exactly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compiled cleanly on first attempt, all existing imports were sufficient.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend mutations for menu editing and deletion are complete
- `trpc.venue.updateMenuItem` and `trpc.venue.deleteMenuItem` are now inferred in the tRPC client types
- Plan 02 (Menu Tab UI) can now wire up edit/delete functionality against these endpoints
- No blockers

---
*Phase: 01-owner-access-menu-management*
*Completed: 2026-05-23*
