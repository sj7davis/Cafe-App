---
phase: 09-sse-hardening-full-kds-dine-in
plan: "02"
subsystem: frontend
tags: [sse, kds, real-time, staff-dashboard, kitchen-display, dine-in]
dependency_graph:
  requires: ["09-01"]
  provides: ["useVenueSSE hook", "full KDS with swimlanes", "SSE-driven StaffDashboard"]
  affects: ["app/src/hooks/useVenueSSE.ts", "app/src/pages/KitchenDisplay.tsx", "app/src/pages/StaffDashboard.tsx"]
tech_stack:
  added: []
  patterns: ["EventSource SSE with JWT query param", "tRPC invalidation on SSE events", "useRef callback pattern to avoid EventSource recreation"]
key_files:
  created:
    - app/src/hooks/useVenueSSE.ts
  modified:
    - app/src/pages/KitchenDisplay.tsx
    - app/src/pages/StaffDashboard.tsx
decisions:
  - "useVenueSSE stores onEvent in a ref to prevent unnecessary EventSource recreation when only the callback reference changes"
  - "KitchenDisplay completed-order auto-clear uses 30s setTimeout + invalidate rather than local state removal, keeping the card visible briefly for kitchen confirmation"
  - "DINE-01 confirmed already implemented in VenuePublic.tsx (lines 220-233): reads ?table= param, sets tableNumber + orderType on mount"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-30"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 09 Plan 02: SSE Frontend Wiring + Full KDS Summary

One-liner: Shared useVenueSSE hook wired to KitchenDisplay (swimlane KDS with embedded items, table badge, age colouring) and StaffDashboard (20s polling replaced by SSE invalidation).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create useVenueSSE hook | 5528604 | app/src/hooks/useVenueSSE.ts (created) |
| 2 | Upgrade KitchenDisplay — N+1 fix, swimlanes, table badge, age colour, auto-clear | a5fec97 | app/src/pages/KitchenDisplay.tsx |
| 3 | Wire StaffDashboard OrdersTab to SSE (replace 20s polling) | acf00d0 | app/src/pages/StaffDashboard.tsx |

## What Was Built

### Task 1 — useVenueSSE hook (`app/src/hooks/useVenueSSE.ts`)

New shared hook with:
- EventSource created at `/api/sse/orders/:venueId?token=<encoded-JWT>`
- Accepts `events: string[]` — registers an `addEventListener` for each
- `onEvent` stored in a `useRef` to avoid re-creating the EventSource when only the callback reference changes
- Returns `{ connected: boolean }` tracking open/error state
- Effect re-runs only when `venueId` or `token` changes; cleans up (`es.close()`) on unmount

### Task 2 — KitchenDisplay.tsx upgrade

- Replaced `trpc.venue.listOrders` + per-card `getOrderItemsByOrderId` with single `trpc.venue.listOrdersWithItems` query — eliminates N+1 tRPC calls
- Removed the manual `useEffect` SSE block; replaced with `useVenueSSE` hook
- Column labels updated: NEW | CONFIRMED | READY (was: NEW ORDERS | IN PROGRESS | READY FOR PICKUP)
- `OrderCard` now receives `items` and `tableNumber` as props from the parent `Column`
- Table badge: purple (`#7c3aed`) "Table N" pill shown when `tableNumber` is non-null
- Age display: always in minutes (`< 1m`, `Nm`) via updated `timeSince()`
- Urgency thresholds: warn > 7 min, urgent (red `#EF4444` border) > 10 min
- Auto-clear for completed orders: `setTimeout(invalidate, 30000)` triggered after `advance()` → completed
- KDS dark theme tokens applied: `#0F0F0F` bg, `#1C1C1E` card bg, amber/blue/green left borders
- Defensive filter: only `['pending', 'confirmed', 'ready']` statuses shown

### Task 3 — StaffDashboard OrdersTab SSE wiring

- Added `import { useVenueSSE } from '@/hooks/useVenueSSE'` at top of file
- `refetchInterval: 20_000` changed to `refetchInterval: false` on `listOrders` query in `OrdersTab`
- `useVenueSSE` called inside `OrdersTab` with `events: ['order_update', 'order_new']`; on event: `utils.venue.listOrders.invalidate()`
- `venueId` and `token` already available in `OrdersTab` via props (passed from parent `StaffDashboard`)
- `utils` already declared at line 542 — not re-declared
- Existing `knownIds` / `newOrderIds` new-order highlight logic unchanged; fires as before on data changes triggered by SSE-driven invalidation

### DINE-01 Confirmation

VenuePublic.tsx already implements `?table=` reading (lines 220-233):
```typescript
const tableParam = searchParams.get('table');
const [tableNumber, setTableNumber] = useState<string | null>(null);
const [orderType, setOrderType] = useState<'pickup' | 'dine-in'>('pickup');
useEffect(() => {
  if (tableParam) {
    setTableNumber(tableParam);
    setOrderType('dine-in');
  }
}, [tableParam]);
```
No code changes needed. DINE-01 is confirmed implemented.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `grep -c "getOrderItemsByOrderId" app/src/pages/KitchenDisplay.tsx` → 0 (confirmed)
- `grep -c "refetchInterval.*20" app/src/pages/StaffDashboard.tsx` → 0 (confirmed)
- TypeScript: zero errors (`app/node_modules/.bin/tsc --noEmit` clean)
- DINE-01: confirmed already implemented in VenuePublic.tsx

## Self-Check

Files created/modified:

- [x] `app/src/hooks/useVenueSSE.ts` — exists
- [x] `app/src/pages/KitchenDisplay.tsx` — modified
- [x] `app/src/pages/StaffDashboard.tsx` — modified

Commits:

- [x] 5528604 feat(09-02): create useVenueSSE hook
- [x] a5fec97 feat(09-02): upgrade KitchenDisplay
- [x] acf00d0 feat(09-02): replace StaffDashboard polling with SSE

## Self-Check: PASSED
