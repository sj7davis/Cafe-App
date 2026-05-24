---
phase: 02-order-tracking-staff-dashboard
plan: 01
subsystem: api
tags: [trpc, jwt, drizzle, orders, staff, security]

# Dependency graph
requires:
  - phase: 01-owner-access-menu-management
    provides: venue-router.ts patterns, jwtVerify authed-mutation pattern, orders/orderItems schema
provides:
  - getOrderByNumber public tRPC query (returns order + venue + items, strips staffNote)
  - updateOrderStatus mutation secured with JWT verification and optional staffNote persistence
affects:
  - 02-02 (customer order-status page — consumes getOrderByNumber)
  - 02-03 (staff dashboard — consumes updateOrderStatus with staffNote)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public order lookup by orderNumber: orderNumber IS the access credential, no token needed"
    - "staffNote stripped via destructuring before public response: { staffNote: _omit, ...publicOrder }"
    - "JWT verify-before-write: jwtVerify called first, UNAUTHORIZED thrown on failure, db.update never reached"

key-files:
  created: []
  modified:
    - app/api/venue-router.ts

key-decisions:
  - "getOrderByNumber is fully public — orderNumber serves as the access credential (no token param)"
  - "staffNote stripped from public getOrderByNumber response via destructuring to prevent data leakage"
  - "updateOrderStatus now requires valid staff JWT before any db write (security fix from unverified state)"
  - "staffNote on updateOrderStatus is optional and only added to updateData when explicitly provided — avoids null overwrite"

patterns-established:
  - "Strip private fields from public responses via destructuring: const { privateField: _omit, ...publicObj } = row"
  - "JWT-guard pattern for mutations: try { await jwtVerify(...) } catch { throw UNAUTHORIZED } — placed before all db ops"

requirements-completed: [ORD-01, ORD-04, STAFF-03]

# Metrics
duration: 6min
completed: 2026-05-24
---

# Phase 02 Plan 01: Backend Order Queries — getOrderByNumber + Secured updateOrderStatus Summary

**Public getOrderByNumber query and JWT-secured updateOrderStatus with staffNote added to venue-router.ts, fixing an unverified mutation security hole**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-24T00:04:22Z
- **Completed:** 2026-05-24T00:10:30Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added `venue.getOrderByNumber` public tRPC query — customers can look up order status by orderNumber without auth
- Response shape strips `staffNote` via destructuring before returning to caller (privacy protection)
- Fixed security hole in `venue.updateOrderStatus`: now requires and verifies a staff JWT before any database write
- Extended `updateOrderStatus` input schema with optional `staffNote`, persisted only when explicitly provided

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getOrderByNumber public query** - `830efd3` (feat)
2. **Task 2: Extend updateOrderStatus with staffNote and JWT verify** - `8733337` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/api/venue-router.ts` — Added `getOrderByNumber` at lines 177-208; replaced `updateOrderStatus` at lines 210-231

## getOrderByNumber Response Shape

```typescript
// Input
{ orderNumber: string }  // min length 1, no token

// Output
{
  order: Omit<Order, "staffNote">,  // full order row minus staffNote
  venue: { id: number; name: string; slug: string } | null,
  items: OrderItem[]
}

// Throws TRPCError NOT_FOUND if orderNumber has no match
```

### Key line ranges in venue-router.ts (post-edit)
- `getOrderByNumber`: lines 177–208
- `updateOrderStatus`: lines 210–231

## updateOrderStatus New Input Schema

```typescript
// Input (additions bolded)
{
  token: string,
  orderId: number,
  status: "pending" | "confirmed" | "ready" | "completed" | "cancelled",
  staffNote?: string,   // NEW — optional, only written when provided
}

// JWT verified BEFORE db write; throws UNAUTHORIZED on invalid/missing token
// staffNote only added to updateData when input.staffNote !== undefined
```

## Decisions Made
- `getOrderByNumber` is fully public (no token param) — the orderNumber itself is the access credential; customers receive it in their confirmation
- `staffNote` is omitted from the public response via destructuring pattern (`const { staffNote: _omit, ...publicOrder } = orderRow`) — explicit and type-safe
- `staffNote` update is conditional (`if (input.staffNote !== undefined)`) so omitting it from a status-only call never clears existing notes
- Used `Record<string, unknown>` for `updateData` to avoid Drizzle type narrowing issues on dynamic field sets (same pattern used in `updateMenuItem`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 2 frontend plans (02-02 and 02-03) are now unblocked
- 02-02 (customer order status page) can call `venue.getOrderByNumber({ orderNumber })` and render the returned `{ order, venue, items }` shape
- 02-03 (staff dashboard) can call `venue.updateOrderStatus({ token, orderId, status, staffNote? })` and must supply a valid staff JWT

---
*Phase: 02-order-tracking-staff-dashboard*
*Completed: 2026-05-24*
