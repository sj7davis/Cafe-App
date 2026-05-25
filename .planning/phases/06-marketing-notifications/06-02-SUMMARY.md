---
phase: 06-marketing-notifications
plan: 02
subsystem: api
tags: [email, resend, trpc, orders, mutations]

# Dependency graph
requires:
  - phase: 06-01
    provides: sendEmail helper from ./lib/email with RESEND_API_KEY guard and non-throwing error handling
provides:
  - createOrder accepts optional customerEmail, stores it in DB, fires EMAIL-01 (customer confirmation) and EMAIL-02 (owner alert)
  - updateOrderStatus fires EMAIL-03 (review request) when status transitions to completed and order has customerEmail
affects: [customer-facing ordering flow, staff dashboard order management]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget sendEmail calls inside mutations; email side-effects after DB writes, before return; guards on optional email fields before calling sendEmail]

key-files:
  created: []
  modified:
    - app/api/venue-router.ts

key-decisions:
  - "sendEmail called without await at call site (fire-and-forget); sendEmail itself is async but never throws so either approach is safe"
  - "ownerRow query executes after all orderItems inserts — emails fire only after full order is committed"
  - "EMAIL-03 query re-fetches order from DB for customerEmail rather than relying on input — source of truth is DB"

patterns-established:
  - "Email side-effect pattern: query data needed, guard on optional fields, call sendEmail without await, return normally"
  - "Non-throwing email contract: sendEmail catches internally; callers never propagate email errors"

requirements-completed: [EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04]

# Metrics
duration: 12min
completed: 2026-05-25
---

# Phase 6 Plan 02: Email Side-Effects on Order Mutations Summary

**createOrder and updateOrderStatus extended with non-throwing email sends using Resend via the sendEmail helper — customer confirmation, owner alert, and review request on completion**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-25T01:45:00Z
- **Completed:** 2026-05-25T01:57:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- `createOrder` now accepts optional `customerEmail` field (z.string().email().optional()), stores it in the orders table
- EMAIL-01 (customer order confirmation with order number, item list, pickup time, total, and tracking link) fires when `customerEmail` is provided
- EMAIL-02 (owner new-order alert with full order details) fires when the venue owner email is found — always attempted
- EMAIL-03 (review request with review link) fires in `updateOrderStatus` when status becomes `completed` and the order has a `customerEmail`
- All email sends are fire-and-forget (no await at call site); `sendEmail` never throws, so no order mutation can fail due to email errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sendEmail import and extend createOrder with customerEmail input + email sends** - `b3ead17` (feat)
2. **Task 2: Extend updateOrderStatus with review request email on completion** - `54fc46b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/api/venue-router.ts` - Added sendEmail import; extended createOrder input schema, db.insert values, and post-insert email block (EMAIL-01 + EMAIL-02); added EMAIL-03 block in updateOrderStatus before return

## Decisions Made
- `sendEmail` called without `await` at the call site (fire-and-forget pattern). The function is async internally but catches all errors without rethrowing, so awaiting is also safe — chose non-awaited form as it matches the plan's stated preference and keeps the happy path latency low.
- EMAIL-03 re-fetches the order from the database (`db.select().from(orders).where(eq(orders.id, input.orderId))`) rather than relying on input data. The input only has `orderId` and `status`; customerEmail must come from the DB row.
- `ownerRow` query placed after all `db.insert(orderItems)` calls so emails only fire once the full order is committed.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - RESEND_API_KEY was configured in Plan 01 (06-01). No additional external service configuration required for this plan.

## Next Phase Readiness
- Email notification pipeline complete: customer confirmation, owner alert, and review request all wired up
- All email sends are guarded — no crashes when RESEND_API_KEY absent or customerEmail not provided
- Ready for any remaining Phase 06 plans or Phase 07

---
*Phase: 06-marketing-notifications*
*Completed: 2026-05-25*
