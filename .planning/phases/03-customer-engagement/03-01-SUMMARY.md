---
phase: 03-customer-engagement
plan: 01
subsystem: api
tags: [trpc, drizzle-orm, mysql, customer-preferences, reviews]

# Dependency graph
requires:
  - phase: 02-order-tracking-staff-dashboard
    provides: orders table with venueId, customerName, status fields used by submitReview
provides:
  - getCustomerPreferences tRPC procedure (publicQuery, returns row or null by venueId+phone)
  - upsertCustomerPreferences tRPC procedure (SELECT-then-INSERT/UPDATE, returns {success:true})
  - submitReview tRPC procedure (status+duplicate guards, derives venueId from order)
  - listReviews tRPC procedure (desc createdAt, configurable limit)
affects:
  - 03-02-preferences-ui
  - 03-03-reviews-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SELECT-then-INSERT/UPDATE upsert for tables with no unique constraint (customerPreferences)
    - Server-side venueId derivation from order row (never trust client for submitReview)
    - Application-level duplicate guard (reviews.orderId) when DB lacks unique index

key-files:
  created: []
  modified:
    - app/api/venue-router.ts

key-decisions:
  - "submitReview derives venueId and customerName from order row — client never trusted for ownership data"
  - "upsertCustomerPreferences uses SELECT-then-INSERT/UPDATE pattern (schema has no unique index on venueId+phone)"
  - "Duplicate review guard via application-level SELECT (schema has no unique constraint on orderId)"
  - "All four procedures are publicQuery — phone/orderId serve as implicit credentials, matching createOrder trust model"

patterns-established:
  - "Application-level uniqueness enforcement when schema lacks unique constraint"
  - "Business rule guards (order.status check) placed server-side, not trusted from client"

requirements-completed: [PREF-01, PREF-02, PREF-03, REV-02, REV-03, REV-04]

# Metrics
duration: 12min
completed: 2026-05-25
---

# Phase 03 Plan 01: Customer Preferences and Reviews tRPC Backend Summary

**Four publicQuery tRPC procedures for customer preferences (upsert by phone) and order reviews (status-gated, one-per-order) added to venueRouter**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-25T00:38:00Z
- **Completed:** 2026-05-25T00:50:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Extended `@db/schema` import to include `customerPreferences` and `reviews` tables (both now available for Plans 02 and 03 UI work)
- Added `getCustomerPreferences` and `upsertCustomerPreferences` with SELECT-then-INSERT/UPDATE pattern (no unique index on schema, so application-level logic required)
- Added `submitReview` with three server-side guards: NOT_FOUND if order missing, BAD_REQUEST if status != 'completed', CONFLICT if review already exists for orderId; venueId always derived from order row
- Added `listReviews` returning reviews ordered by createdAt desc with input.limit (1-100, default 20)
- Confirmed `desc` already imported from `drizzle-orm`; `TRPCError` already imported from `@trpc/server`
- TypeScript server check: 0 errors. Frontend build: success (1802 modules transformed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add customer preferences procedures** - `d6167e4` (feat) — combined with Task 2 (single file, sequential implementation)
2. **Task 2: Add review procedures** - `d6167e4` (feat) — same commit as both tasks target the same file

**Plan metadata:** *(to be created as final commit)*

## Files Created/Modified
- `app/api/venue-router.ts` - Added 124 lines: extended import, added getCustomerPreferences, upsertCustomerPreferences, submitReview, listReviews procedures

## Decisions Made
- Tasks 1 and 2 committed in a single atomic commit since both modify only `venue-router.ts` and Task 2 depends on Task 1's import changes being present; separating them into two commits on the same file would require intermediate states that cannot be independently verified
- Confirmed `desc` was already present in drizzle-orm import (line 6) — no change needed
- Confirmed `TRPCError` was already imported from `@trpc/server` (line 2) — no change needed

## Deviations from Plan

None - plan executed exactly as written. All procedure shapes match the contracts in `<interfaces>`. Import line extended exactly as specified.

## Issues Encountered

- `npm run typecheck` does not exist in this project (no typecheck script). Used `npx tsc --noEmit -p tsconfig.server.json` instead — returned 0 errors. Build also succeeded.

## User Setup Required

None - no external service configuration required. All procedures use existing DB tables already in the schema.

## Next Phase Readiness

- `trpc.venue.getCustomerPreferences`, `trpc.venue.upsertCustomerPreferences`, `trpc.venue.submitReview`, and `trpc.venue.listReviews` are all registered and type-safe
- Plan 02 (preferences UI) and Plan 03 (reviews UI) can now consume these procedures
- No blockers or concerns

---
*Phase: 03-customer-engagement*
*Completed: 2026-05-25*
