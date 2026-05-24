---
phase: 02-order-tracking-staff-dashboard
plan: "02"
subsystem: customer-order-tracking
tags: [react, trpc, public-route, order-status, checkout-flow]
dependency_graph:
  requires: [02-01]
  provides: [public-order-status-page, post-checkout-confirmation]
  affects: [VenuePublic, App, OrderStatus]
tech_stack:
  added: []
  patterns: [trpc-useQuery-polling, react-router-Link, conditional-drawer-panel]
key_files:
  created:
    - app/src/pages/OrderStatus.tsx
  modified:
    - app/src/App.tsx
    - app/src/pages/VenuePublic.tsx
decisions:
  - Public order tracking via orderNumber in URL — no auth token needed; orderNumber IS the credential
  - pickupTime rendered as plain string (not parsed by Date) to support free-form values like 'ASAP'
  - Post-checkout drawer stays open (setShowCart(true)) so confirmation panel is immediately visible
  - placedOrderNumber cleared only by explicit user action (Dismiss button) — no auto-dismiss timer
metrics:
  duration_minutes: 15
  completed_date: "2026-05-24"
  tasks_completed: 3
  files_changed: 3
---

# Phase 02 Plan 02: Customer-Facing Order Status Page Summary

**One-liner:** Public `/order/:orderNumber` page with 4-step stepper polling every 30s, replacing a 5-second vanishing toast with a persistent post-checkout confirmation panel.

## What Was Built

### New File: app/src/pages/OrderStatus.tsx (129 lines)

A fully public React page that:
- Fetches `trpc.venue.getOrderByNumber.useQuery` with `refetchInterval: 30_000` for live updates
- Renders a 4-step progress stepper (`pending → confirmed → ready → completed`) with the current step highlighted via color and border
- Renders a distinct cancelled UI (`XCircle` icon + message) when `order.status === 'cancelled'`
- Displays `order.pickupTime` as plain text (no `Date` parsing — supports "ASAP" and free-form strings)
- Lists all ordered items with quantity, unit price subtotal, and order total
- Shows a friendly "Order Not Found" message if the orderNumber doesn't exist (handles NOT_FOUND without crashing)
- All three `data-testid` attributes present: `status-stepper`, `pickup-time`, `order-items`

### Route Added: app/src/App.tsx

```tsx
<Route path="/order/:orderNumber" element={<OrderStatus />} />
```

Added at line 24, before the wildcard `<Route path="*">` at line 25. No auth wrapper.

### VenuePublic.tsx Changes

1. Added `Link` to the `react-router` import: `import { useParams, Link } from 'react-router';`
2. Replaced `const [orderSuccess, setOrderSuccess] = useState(false)` with `const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null)`
3. Rewrote `createOrder.onSuccess` to capture `data.orderNumber`, keep the cart drawer open, and NOT use `setTimeout`
4. Removed the 5-second green toast JSX (lines 108-117 in original)
5. Added a persistent `post-checkout-panel` at the top of the cart drawer content, rendered when `placedOrderNumber` is set:
   - Shows `CheckCircle` icon and "Order Confirmed" heading
   - Displays the order number in large bold text
   - "Track Your Order" `<Link to={`/order/${placedOrderNumber}`}>` with `data-testid="order-status-link"`
   - "Dismiss" button clears `placedOrderNumber` and closes the drawer

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `a4c121e` | feat(02-02): create public OrderStatus page with 4-step stepper |
| Task 2 | `41b9256` | feat(02-02): register public /order/:orderNumber route in App.tsx |
| Task 3 | `d214a7e` | feat(02-02): replace 5-second toast with persistent post-checkout confirmation panel |

## Requirements Satisfied

- ORD-01: `/order/:orderNumber` is a fully public route (no login required)
- ORD-02: 4-step stepper renders with current step highlighted
- ORD-03: Post-checkout panel has a persistent `<Link>` to the status page (no auto-dismiss)
- ORD-04: Pickup time and item list visible on the status page

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `app/src/pages/OrderStatus.tsx` exists (129 lines, above 80-line minimum)
- `app/src/App.tsx` contains `/order/:orderNumber` route before wildcard
- `app/src/pages/VenuePublic.tsx` contains `placedOrderNumber` (5 occurrences), `post-checkout-panel`, `order-status-link`, `Link` import from react-router; `setOrderSuccess` and `setTimeout` are absent
- All three task commits confirmed in git log: a4c121e, 41b9256, d214a7e
- TypeScript reported TYPECHECK_OK for all three modified files
