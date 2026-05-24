---
phase: 02-order-tracking-staff-dashboard
plan: 03
subsystem: ui
tags: [react, trpc, tanstack-query, polling, staff-dashboard]

# Dependency graph
requires:
  - phase: 02-order-tracking-staff-dashboard
    provides: updateOrderStatus mutation with staffNote + JWT auth (plan 02-01)
provides:
  - OrdersTab with 20s auto-polling via refetchInterval
  - Amber row highlight for newly appeared orders (cleared after 8s)
  - Confirm-with-note flow: status change requires explicit Confirm with optional internal note
affects:
  - 02-order-tracking-staff-dashboard (completes STAFF-01, STAFF-02, STAFF-03)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useRef for mutable baseline state with no re-render (knownIds)"
    - "useState Set for derived highlight state driving re-renders (newOrderIds)"
    - "refetchInterval on TanStack Query instead of manual setInterval"
    - "Two-mode row UI (view/confirm) driven by single editingOrderId state"

key-files:
  created: []
  modified:
    - app/src/pages/StaffDashboard.tsx

key-decisions:
  - "knownIds tracked via useRef so baseline updates do not trigger re-renders"
  - "setTimeout per fresh-batch clears only those IDs, preventing concurrent timer cancellation"
  - "staffNote passed as undefined (not empty string) when textarea is blank — avoids null overwrite on backend"
  - "Only one row can be in confirm mode at a time (single editingOrderId state) — intentional UX simplicity"

patterns-established:
  - "Poll-and-diff pattern: useRef baseline + useState derived set for new-item highlighting"
  - "Confirm-gate pattern: select picks value, opens panel, Confirm fires mutation — prevents accidental status changes"

requirements-completed: [STAFF-01, STAFF-02, STAFF-03]

# Metrics
duration: 15min
completed: 2026-05-24
---

# Phase 02 Plan 03: Staff Dashboard Polling and Confirm-Note Flow Summary

**OrdersTab gains 20s TanStack Query polling, amber new-order row highlighting with 8s auto-clear, and a two-step confirm panel with an optional internal staff note textarea**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-24T12:15:00Z
- **Completed:** 2026-05-24T12:30:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `listOrders` query now uses `refetchInterval: 20_000` — staff dashboard auto-refreshes every 20 seconds without manual reload
- New orders detected by diffing incoming IDs against a `useRef` baseline; highlighted amber (`#fffbeb`, `#d97706` left border) for 8 seconds, then auto-cleared without cancelling concurrent highlights
- Status change no longer fires the mutation instantly on `select` change — a confirm panel appears with a `textarea` for an internal note; staffNote is passed as `undefined` when blank to avoid null overwriting on the backend

## Task Commits

1. **Task 1: Add 20s polling + new-order highlight to OrdersTab** - `003f375` (feat)
2. **Task 2: Replace status select with confirm-with-note flow** - `06786c1` (feat)

**Plan metadata:** (docs commit — see final step)

## Files Created/Modified

- `app/src/pages/StaffDashboard.tsx` — Added `useEffect`, `useRef` imports; polling option; `knownIds` + `newOrderIds` detection effect; `editingOrderId`, `pendingStatus`, `staffNoteDraft` state; confirm panel JSX replacing inline select mutation

## New State Hooks Added to OrdersTab

| Hook | Type | Purpose |
|------|------|---------|
| `knownIds` (useRef) | `Set<number>` | Baseline of seen order IDs — no re-render on update |
| `newOrderIds` (useState) | `Set<number>` | IDs to highlight amber — drives re-render |
| `editingOrderId` (useState) | `number \| null` | Which row is in confirm mode |
| `pendingStatus` (useState) | `string` | The new status selected before confirm |
| `staffNoteDraft` (useState) | `string` | Textarea content for internal note |

## Key Line Ranges (after both tasks)

- **Polling effect (useEffect):** lines ~287–310
- **Confirm panel JSX:** lines ~385–455

## Decisions Made

- `knownIds` uses `useRef` so updating the baseline on each poll does not itself trigger a re-render loop
- `setTimeout` per batch of fresh IDs removes only those IDs on expiry — concurrent new-order events each get independent timers
- `staffNote` is `undefined` (not `''`) when textarea is empty — preserves backend's "only update when provided" logic from Plan 02-01
- Single `editingOrderId` state enforces one-row-at-a-time confirm mode by design

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- STAFF-01, STAFF-02, STAFF-03 requirements fully satisfied
- Staff dashboard is self-refreshing and notes are persisted to DB via Plan 02-01 backend
- Ready for Phase 02 verification or next phase work

---
*Phase: 02-order-tracking-staff-dashboard*
*Completed: 2026-05-24*
