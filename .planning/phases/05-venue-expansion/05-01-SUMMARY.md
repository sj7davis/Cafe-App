---
phase: 05-venue-expansion
plan: "01"
subsystem: venue-router
tags: [backend, trpc, locations, catering, orders]
dependency_graph:
  requires: []
  provides: [addLocation, updateLocation, deleteLocation, submitCateringRequest, listCateringRequests, updateCateringStatus, createOrder-locationId, listOrders-locationId]
  affects: [app/api/venue-router.ts]
tech_stack:
  added: []
  patterns: [JWT ownership check, FK guard in application code, partial update pattern]
key_files:
  created: []
  modified:
    - app/api/venue-router.ts
decisions:
  - "deleteLocation guards against orders with existing locationId references via application-level SELECT (no DB FK constraint)"
  - "submitCateringRequest is public (no JWT) — customer-facing form submission"
  - "cateringRequests import added in Task 1 to avoid editing import line twice"
  - "locationId in createOrder/listOrders is optional to preserve backwards compatibility"
metrics:
  duration_minutes: 8
  completed_date: "2026-05-25"
  tasks_completed: 3
  files_modified: 1
---

# Phase 05 Plan 01: Venue Router — Location & Catering Procedures Summary

**One-liner:** Six new tRPC procedures for location management and catering requests, plus optional locationId on createOrder/listOrders — full backend API for Phase 5 UI plans.

## What Was Built

### Import Update

`cateringRequests` added to the `@db/schema` named import on line 5 of `venue-router.ts`:
```typescript
import { ..., cateringRequests } from "@db/schema";
```

### Task 1: Location Mutation Procedures

Three procedures added after the existing `listLocations` procedure in the `// ─── Locations ───` section:

**`addLocation`** — Owner-authed via JWT. Inserts a row into `locations` with `venueId` derived from JWT payload. Returns `{ locationId: number }`.

**`updateLocation`** — Owner-authed. Ownership check: `loc[0].venueId !== venueId` throws `NOT_FOUND`. Partial update via dynamic `updates` object — only provided fields are written. Returns `{ success: true }`.

**`deleteLocation`** — Owner-authed. Ownership check then FK guard: SELECT from `orders` WHERE `locationId = input.locationId` LIMIT 1 — throws `CONFLICT` if any order references the location. Deletes if safe. Returns `{ success: true }`.

### Task 2: Extended createOrder and listOrders

**`createOrder`** — Added optional `locationId: z.number().int().positive().optional()` to input schema. Added `locationId: input.locationId` to `db.insert(orders).values(...)` — Drizzle omits the column when undefined, MySQL uses NULL.

**`listOrders`** — Added optional `locationId: z.number().int().positive().optional()` to input schema. Added conditional push to conditions array: `if (input.locationId) { conditions.push(eq(orders.locationId, input.locationId)); }`.

### Task 3: Catering Request Procedures

Three procedures added at the bottom of the router in a new `// ─── Catering Requests ───` section:

**`submitCateringRequest`** — Public (no JWT). Inserts into `cateringRequests` table. Returns `{ requestId: number }`.

**`listCateringRequests`** — Owner-authed via JWT. Filters by `venueId` from JWT + optional `status`. Orders by `createdAt DESC`. Limit 1–100 (default 50). Returns array of catering request rows.

**`updateCateringStatus`** — Owner-authed via JWT. Fetches request, checks `req[0].venueId !== venueId` (throws `NOT_FOUND` if mismatch). Updates `status` field. Returns `{ success: true }`.

## Verification

- `npm run typecheck` (tsc --noEmit -p tsconfig.server.json): 0 errors
- `npm run build`: succeeded (3.56s, no errors)
- All 6 new procedures present via grep
- `cateringRequests` in import line
- `locationId` in both `createOrder` and `listOrders`
- `CONFLICT` guard in `deleteLocation`
- Ownership check `loc[0].venueId !== venueId` in updateLocation and deleteLocation

## Commits

- `ded0c47` — feat(05-01): add location mutation procedures and cateringRequests import
- `2e3a7ca` — feat(05-01): extend createOrder and listOrders with optional locationId
- `84d50f6` — feat(05-01): add catering request procedures to venueRouter

## Deviations from Plan

None — plan executed exactly as written.

The import line in the existing file already contained `giftCards, subscriptionPasses` (added by Phase 04). The plan's interface spec showed the line without those, but the actual file had them. The edit simply appended `cateringRequests` to what was already there — no functional deviation.

## Self-Check

Files modified:
- app/api/venue-router.ts — FOUND (verified via grep results)

Commits:
- ded0c47 — FOUND
- 2e3a7ca — FOUND
- 84d50f6 — FOUND

## Self-Check: PASSED
