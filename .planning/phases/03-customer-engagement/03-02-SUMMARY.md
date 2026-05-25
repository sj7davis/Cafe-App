---
phase: 03-customer-engagement
plan: 02
subsystem: ui
tags: [react, trpc, customer-preferences, dropdowns, cart-drawer]

# Dependency graph
requires:
  - phase: 03-customer-engagement
    plan: 01
    provides: getCustomerPreferences and upsertCustomerPreferences tRPC procedures
  - phase: 02-order-tracking-staff-dashboard
    provides: createOrder mutation with customerName, customerPhone, pickupTime fields
provides:
  - Checkout form in VenuePublic cart drawer (name, phone, pickup time, milk, sugar)
  - Phone-blur-triggered preference lookup that pre-fills milk/sugar dropdowns
  - Post-order preference upsert (fires only in createOrder.onSuccess when phone && preference set)
  - Form reset on confirmation dismiss
affects:
  - 03-03-reviews-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Lazy tRPC query with enabled:false + manual refetch on blur (avoids keystroke-triggered requests)
    - Post-mutation side-effect pattern: upsert runs inside createOrder.onSuccess, never before
    - Confirmation-dismiss resets all form state (prevents stale values on next open)

key-files:
  created: []
  modified:
    - app/src/pages/VenuePublic.tsx

key-decisions:
  - "prefQuery uses enabled:false + refetch() in handlePhoneBlur — not reactive enabled flag — to prevent lookup on every keystroke"
  - "upsertPreferences fires ONLY in createOrder.onSuccess when phone is set AND at least one preference chosen — never before order"
  - "Empty phone allowed — handlePlaceOrder falls back to '0000000000', upsert skipped silently"
  - "Milk/sugar stored as exact string values: 'full cream', 'skim', 'oat', 'almond', 'soy', 'none' for milk; '0', '0.5', '1', '2', '3' for sugar"

patterns-established:
  - "Lazy query pattern: useQuery with enabled:false + manual refetch() in event handler"
  - "Checkout form placed between cart items list and total/Place Order block in cart drawer JSX"

requirements-completed: [PREF-01, PREF-02, PREF-03]

# Metrics
duration: 15min
completed: 2026-05-25
---

# Phase 03 Plan 02: Customer Preferences UI Summary

**Checkout form in VenuePublic cart drawer with phone-keyed preference lookup (blur-triggered lazy refetch) and post-order upsert replacing hardcoded Guest Customer values**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-24T23:35:00Z
- **Completed:** 2026-05-24T23:49:46Z
- **Tasks:** 2 auto + 1 checkpoint (auto-approved)
- **Files modified:** 1

## Accomplishments
- Replaced hardcoded `'Guest Customer'`/`'0400000000'` with real form state (checkoutName, checkoutPhone, checkoutPickupTime, checkoutMilk, checkoutSugar)
- Added lazy `prefQuery` with `enabled: false` — preference lookup fires only on phone-blur with >=8 chars, never on keystroke
- Inserted full checkout form JSX in cart drawer between cart items and Place Order button: Name input, Phone tel input, Pickup time input, Milk select dropdown (6 options), Sugar select dropdown (6 options)
- `upsertPreferences.mutate` called inside `createOrder.onSuccess` only when `phone && (milk || sugar)` — post-order, never pre-order
- Dismiss handler resets all 5 form fields (checkoutName, checkoutPhone, checkoutPickupTime, checkoutMilk, checkoutSugar)
- TypeScript: 0 errors. Build: success (1802 modules transformed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add checkout form state, phone-blur preference lookup, and post-order upsert** - `9d15106` (feat)
2. **Task 2: Render checkout form JSX in cart drawer with milk/sugar dropdowns** - `8fa6a76` (feat)
3. **Task 3: Human verify preferences end-to-end flow** - Auto-approved (automated pipeline mode)

**Plan metadata:** *(to be created as final commit)*

## Files Created/Modified
- `app/src/pages/VenuePublic.tsx` - Added 96 lines: 5 useState hooks, prefQuery (enabled:false), upsertPreferences mutation, handlePhoneBlur, updated handlePlaceOrder, extended createOrder.onSuccess, updated dismiss handler, inserted checkout form JSX with all 5 inputs/selects

## Dropdown Option Values Committed

**Milk select values (exact DB-stored strings):**
- `""` — Milk preference (optional)
- `"full cream"` — Full Cream
- `"skim"` — Skim
- `"oat"` — Oat
- `"almond"` — Almond
- `"soy"` — Soy
- `"none"` — No milk

**Sugar select values (stored as strings):**
- `""` — Sugar (optional)
- `"0"` — No sugar
- `"0.5"` — 1/2 sugar
- `"1"` — 1 sugar
- `"2"` — 2 sugars
- `"3"` — 3 sugars

No deviations from plan's specified values.

## Form Insertion Location

Form inserted at line ~236 (post-edit), between:
- After: closing `</div>` of the cart items `map()` list
- Before: the `marginTop: 24` div containing Subtotal, Total, and Place Order button

The form is wrapped in `{/* Checkout form — rendered only when not in confirmation mode */}` and lives inside the `cart.length > 0` branch (the `<>` fragment), which is already gated on `!placedOrderNumber` by the outer ternary.

## Styling

Matches existing VenuePublic.tsx inline-style patterns exactly as specified:
- Wrapper: `{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderTop: '1px solid rgba(24,24,24,0.06)' }`
- Each input/select: `{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff', color: '#181818' }`
- Header: `<h3 style={{ fontSize: 14, fontWeight: 600, color: '#181818', margin: 0 }}>Your details</h3>`

No styling deviations from plan.

## Decisions Made
- Tasks 1 and 2 committed separately (Task 1 = logic/hooks, Task 2 = JSX rendering) for clean separation of concerns
- `handlePlaceOrder` guard changed from `!venue.id` to `!venue?.id` for consistency with new optional-chaining used throughout (venue is guaranteed non-null at this point in the component, but matches style)
- Task 3 checkpoint auto-approved per automated pipeline mode directive

## Deviations from Plan

None - plan executed exactly as written. All hook signatures, JSX structure, dropdown values, and styling match the plan specification.

## Issues Encountered

- `npm run build` must be run from the `app/` subdirectory (no root-level package.json). This is consistent with the project structure established in prior phases.
- `npx tsc` is not available; used `app/node_modules/.bin/tsc --noEmit` instead (same pattern as Plan 01).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PREF-01/02/03 fully implemented: customers can save preferences, returning customers get pre-fill, updates overwrite existing
- `trpc.venue.submitReview` and `trpc.venue.listReviews` are ready (implemented in Plan 01) for Plan 03 (reviews UI)
- No blockers or concerns

---
*Phase: 03-customer-engagement*
*Completed: 2026-05-25*
