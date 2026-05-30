---
phase: 09-sse-hardening-full-kds-dine-in
plan: "01"
subsystem: api-security
tags: [sse, jwt, trpc, kds, n+1, security]
dependency_graph:
  requires: []
  provides: [authenticated-sse-endpoint, listOrdersWithItems-query]
  affects: [app/api/boot.ts, app/api/venue-router.ts]
tech_stack:
  added: []
  patterns: [jwt-query-param-auth, drizzle-left-join-groupby]
key_files:
  created: []
  modified:
    - app/api/boot.ts
    - app/api/venue-router.ts
decisions:
  - "Reuse UPLOAD_JWT_SECRET in boot.ts rather than declaring a second JWT_SECRET constant — same underlying env.jwtSecret value, avoids duplicate declarations"
  - "Use ?token= query param as fallback in SSE endpoint because native browser EventSource cannot set custom headers"
  - "over-fetch with limit * 20 rows in LEFT JOIN query to account for multiple orderItems per order, then slice in JS to requested limit"
  - "inArray() used for statuses filter in listOrdersWithItems (vs sql ANY) to stay consistent with Drizzle idioms"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-30T02:23:00Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 09 Plan 01: SSE Hardening + KDS N+1 Fix Summary

SSE endpoint secured with JWT token verification (Bearer header or ?token= query param) and venueId ownership check; `venue.listOrdersWithItems` tRPC query added using Drizzle LEFT JOIN to eliminate the KDS N+1 pattern.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Authenticate the SSE endpoint | 23773ba | app/api/boot.ts |
| 2 | Add listOrdersWithItems query (N+1 fix) | 5f5a965 | app/api/venue-router.ts |

## What Was Built

### Task 1 — SSE JWT Authentication (boot.ts)

The `/api/sse/orders/:venueId` endpoint previously streamed all order data (including customer PII) to any caller who knew a venueId (sequential integer — trivially enumerable).

The handler now:
1. Extracts the token from `Authorization: Bearer <token>` header OR `?token=` query param (the fallback exists because native `EventSource` in browsers cannot set custom headers).
2. Calls `jwtVerify(token, UPLOAD_JWT_SECRET, { clockTolerance: 60 })` — reusing the existing constant, not declaring a second one.
3. Returns `401 Unauthorized` if token is absent or fails verification.
4. Compares `payload.venueId` against the `:venueId` URL param — returns `403 Forbidden` on mismatch.
5. Only then proceeds with `res.writeHead(200, ...)`, `addSseClient()`, heartbeat, and close handler.

### Task 2 — listOrdersWithItems tRPC query (venue-router.ts)

The KitchenDisplay component previously fired one `getOrderItems` query per rendered order card (O(n) DB round-trips under kitchen traffic).

The new `venue.listOrdersWithItems` procedure:
- Accepts `{ venueId, statuses?, limit?, locationId?, token }`.
- Verifies the JWT token server-side; enforces `payload.venueId === input.venueId`.
- Executes a single Drizzle `LEFT JOIN` of `orders` + `orderItems`.
- Groups resulting rows into `OrderWithItems[]` using a `Map<number, OrderWithItems>` in JS.
- Returns orders with an embedded `items: { itemName, quantity, note }[]` array.
- Includes `tableNumber` for dine-in KDS display.
- Excludes `staffNote` from the SELECT clause (T-09-03 — internal field must not appear on shared kitchen screens).

## Deviations from Plan

None — plan executed exactly as written. The KitchenDisplay.tsx update mentioned in `<critical_context>` was not listed as a task in the PLAN.md task list and the plan's `files_modified` only references `boot.ts` and `venue-router.ts`, so it was intentionally excluded from this plan's scope.

## Threat Flags

No new threat surface introduced. Both mitigations in the threat register were applied:

| Threat ID | Disposition | Applied |
|-----------|-------------|---------|
| T-09-01 | mitigate | jwtVerify + venueId cross-check before any event-stream bytes written |
| T-09-02 | mitigate | token verified server-side; payload.venueId must match input.venueId |
| T-09-03 | mitigate | staffNote excluded from listOrdersWithItems SELECT clause |
| T-09-SC | accept | No new npm packages installed |

## Known Stubs

None.

## Self-Check: PASSED

- [x] `app/api/boot.ts` — modified, SSE handler now contains `jwtVerify` call
- [x] `app/api/venue-router.ts` — modified, `listOrdersWithItems` procedure added with `leftJoin`
- [x] Commit 23773ba exists: `feat(09-01): authenticate SSE endpoint with JWT token verification`
- [x] Commit 5f5a965 exists: `feat(09-01): add listOrdersWithItems tRPC query to eliminate KDS N+1`
- [x] TypeScript compiles without errors (`app/node_modules/.bin/tsc --noEmit -p app/tsconfig.json`)
