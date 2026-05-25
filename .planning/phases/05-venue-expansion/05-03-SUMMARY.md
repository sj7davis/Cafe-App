---
phase: 05-venue-expansion
plan: 03
subsystem: ui
tags: [react, trpc, location-selector, catering-form, staff-dashboard]

# Dependency graph
requires:
  - phase: 05-venue-expansion-01
    provides: listLocations, submitCateringRequest, listOrders with locationId backend procedures
  - phase: 05-venue-expansion-02
    provides: LocationsTab and CateringTab in OwnerDashboard
provides:
  - Location selector in VenuePublic checkout drawer (conditional on 2+ locations)
  - Auto-select for single-location venues via useEffect
  - Per-location hours grid on VenuePublic public page, with venue-level fallback
  - Catering enquiry form on VenuePublic public page with success confirmation
  - Location filter row in StaffDashboard OrdersTab (conditional on 2+ locations)
affects: [future-venue-expansion, staff-dashboard-enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Location selector only rendered for multi-location venues (locationsList.length > 1 guard)
    - Single-location auto-select via useEffect on locationsList
    - locationId optional in createOrder/listOrders (backwards compatible)
    - parseInt(x, 10) for guestCount (not Number())
    - Empty optional fields passed as undefined not empty string
    - Success state persists until user action (no auto-dismiss timer)

key-files:
  created: []
  modified:
    - app/src/pages/VenuePublic.tsx
    - app/src/pages/StaffDashboard.tsx

key-decisions:
  - "Location selector only shown for multi-location venues — single location auto-selected silently via useEffect"
  - "locationId passed as locationFilter ?? undefined to listOrders — never null or 0"
  - "Catering guestCount uses parseInt(x, 10) per Phase 03 established pattern"
  - "Per-location hours replace venue-level hours section when locations exist; venue-level block preserved as fallback"
  - "cateringSubmitted stays visible until user clicks Submit another enquiry — no timer auto-dismiss"

patterns-established:
  - "Multi-location guard: locationsList && locationsList.length > 1 before rendering location-specific UI"
  - "Optional fields: pass || undefined to prevent empty strings reaching mutations"

requirements-completed: [LOC-02, LOC-03, LOC-04, CAT-01]

# Metrics
duration: 15min
completed: 2026-05-25
---

# Phase 05 Plan 03: Venue Expansion Public UI Summary

**Location selector in checkout, per-location hours grid, catering enquiry form, and staff location filter completing all Phase 5 public-facing features**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-25T01:22:34Z
- **Completed:** 2026-05-25T01:37:00Z
- **Tasks:** 4
- **Files modified:** 2

## Accomplishments
- VenuePublic checkout drawer shows location selector dropdown for multi-location venues; single-location venues auto-select silently
- VenuePublic hours section conditionally shows per-location grid (name, address, phone, hours) when locations exist, falls back to venue-level Opening Hours when none
- VenuePublic catering enquiry form with name/phone/email/date/guestCount/details; success confirmation panel replaces form on submit
- StaffDashboard OrdersTab location filter row with All Locations + per-location buttons filters listOrders query; only renders when 2+ locations exist; 20s polling preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: Add location selector in VenuePublic checkout** - `abb476e` (feat)
2. **Task 2: Replace venue-level hours with per-location hours** - `2831ab9` (feat)
3. **Task 3: Add catering enquiry form to VenuePublic** - `d9a9336` (feat)
4. **Task 4: Add location filter to StaffDashboard OrdersTab** - `6615d9c` (feat)

## Files Created/Modified
- `app/src/pages/VenuePublic.tsx` - Location selector, per-location hours, catering enquiry form
- `app/src/pages/StaffDashboard.tsx` - Location filter in OrdersTab

## Decisions Made
- Task 1 was already implemented in the working tree (from prior session work), committed atomically before proceeding
- Location selector not gated on selection for Place Order button — location is nice-to-have for routing, not a hard requirement per plan spec
- Per-location hours block renders "Our Locations" heading with location cards in a 2-column grid
- Catering form resets on success via setCateringForm back to empty strings; cateringSubmitted controls which panel is shown

## Deviations from Plan

None - plan executed exactly as written. Task 1 was found pre-implemented and committed cleanly.

## Issues Encountered
- `npm run typecheck` script not present in the app package; used `npx tsc --noEmit` directly — no TypeScript errors in either file
- Build succeeds with only a pre-existing chunk size warning (not new, not related to these changes)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 Phase 5 requirements satisfied across Plans 01-03 (LOC-01 through LOC-04, CAT-01 through CAT-03)
- Phase 05 venue-expansion is complete
- Ready for Phase 06

---
*Phase: 05-venue-expansion*
*Completed: 2026-05-25*
