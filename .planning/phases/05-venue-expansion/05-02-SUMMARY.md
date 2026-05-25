---
phase: 05-venue-expansion
plan: "02"
subsystem: owner-dashboard
tags: [locations, catering, crud, confirm-gate, union-mode]
dependency_graph:
  requires: [05-01-PLAN.md]
  provides: [LocationsTab, CateringTab]
  affects: [app/src/pages/OwnerDashboard.tsx]
tech_stack:
  added: []
  patterns: [union-mode-crud, confirm-gate, cache-invalidation]
key_files:
  created: []
  modified:
    - app/src/pages/OwnerDashboard.tsx
decisions:
  - "Locations and Catering tabs appended after Passes in the tab strip (no reorder)"
  - "LocationsTab uses union mode state matching MenuTab pattern from Phase 01-03"
  - "CateringTab confirm-gate matches Phase 02-03 StaffDashboard pattern"
  - "CATERING_STATUS_NEXT map enforces forward-only progression in UI"
metrics:
  duration_seconds: 363
  completed_date: "2026-05-25"
  tasks_completed: 3
  files_modified: 1
---

# Phase 05 Plan 02: Locations and Catering Dashboard Tabs Summary

**One-liner:** Added LocationsTab (full CRUD with union-mode state) and CateringTab (confirm-gate status workflow) to OwnerDashboard, wiring the Plan 01 backend procedures to the owner UI.

## What Was Built

### Tab Strip Extension

The `activeTab` union type was extended with `'locations' | 'catering'`. Two new tab entries (`MapPin` + `Briefcase` icons) were appended after the Passes tab. Two content area conditionals route to the new components.

### LocationsTab

Full CRUD component using the established union-mode pattern (`'list' | 'create' | { type: 'edit'; id: number }`):

- **List view:** Renders all venue locations with name, address, phone, and hours. Empty state includes a MapPin icon prompt.
- **Create/Edit form:** 6 fields (name*, address*, phone, hoursWeekday, hoursSaturday, hoursSunday). Name and address are required; submit button disabled until both are filled.
- **Delete:** Fires `deleteLocation` mutation; `onError` captures CONFLICT message (FK guard) and displays it inline as a dismissible red banner.
- **Cache:** All three mutations (`addLocation`, `updateLocation`, `deleteLocation`) call `utils.venue.listLocations.invalidate()` in `onSuccess`.

### CateringTab

Status workflow component using the confirm-gate pattern:

- **Status filter:** Row of filter buttons (All / New / Quoted / Confirmed / Completed) that pass `status` to `listCateringRequests.useQuery`.
- **Request cards:** Display name, phone/email, event date, guest count, details, and a color-coded status badge.
- **Confirm-gate:** A `<select>` showing valid next statuses (from `CATERING_STATUS_NEXT`). Selecting a value sets `editingId` + `pendingStatus` state. A confirm panel appears asking "Move to X?" with CONFIRM/CANCEL buttons. Only CONFIRM fires `updateCateringStatus.mutate`.
- **Forward-only:** `CATERING_STATUS_NEXT` map prevents regression (e.g., completed has no next states).
- **Cache:** `updateCateringStatus` `onSuccess` calls `utils.venue.listCateringRequests.invalidate()`.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm run typecheck` passes with 0 errors related to OwnerDashboard.tsx
- `npm run build` succeeds (828 kB bundle, no errors)
- All acceptance criteria confirmed via grep checks

## Self-Check: PASSED

- `app/src/pages/OwnerDashboard.tsx` — modified and committed
- Commits: c354928 (Task 1), 82eb638 (Task 2), f1851c3 (Task 3)
