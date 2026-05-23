---
phase: 01-owner-access-menu-management
plan: "03"
subsystem: ui
tags: [react, trpc, menu-crud, image-url, owner-dashboard]

# Dependency graph
requires:
  - phase: 01-01
    provides: updateMenuItem and deleteMenuItem tRPC mutations with FK-conflict guard
provides:
  - MenuTab component in OwnerDashboard with full CRUD (list/create/edit/delete)
  - Conditional 16:9 image render in VenuePublic MenuCard with onError collapse
  - Image URL field wired through createMenuItem and updateMenuItem
affects:
  - phases referencing OwnerDashboard tab extension pattern
  - phases adding more dashboard tabs

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline form pattern: create/edit form rendered below list (no modal), mode state drives which heading/buttons show"
    - "slugify helper: name → lowercase-hyphenated, strip [^a-z0-9-], 64 char max — applied only on create, not update"
    - "onError image collapse: e.currentTarget.style.display = 'none' for broken image URLs"
    - "FK-conflict display: onError on deleteMutation sets deleteError string, rendered in #B85450 banner with AlertCircle"

key-files:
  created: []
  modified:
    - app/src/pages/OwnerDashboard.tsx
    - app/src/pages/VenuePublic.tsx

key-decisions:
  - "Menu tab inserted between Overview and Settings in tab strip (logical ordering)"
  - "Form mode uses union type: 'list' | 'create' | { type: 'edit'; id: number } — avoids boolean flag proliferation"
  - "Image onError collapses slot via display:none rather than state (simpler, no re-render required)"

patterns-established:
  - "Tab extension: add union member to activeTab useState type + entry in tabs array + route guard in content area"
  - "Inline CRUD form: no modal, mode state, same form fields for create and edit, heading changes"

requirements-completed:
  - MENU-01
  - MENU-02
  - MENU-03

# Metrics
duration: 7min
completed: 2026-05-23
---

# Phase 01 Plan 03: Menu Tab + Public Image Render Summary

**Full menu CRUD tab in OwnerDashboard (list/create/edit/delete with FK-conflict display) and conditional 16:9 image rendering in VenuePublic MenuCard closing MENU-01, MENU-02, MENU-03.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-23T11:57:43Z
- **Completed:** 2026-05-23T12:05:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- MenuTab component added to OwnerDashboard with list, create, edit, and delete flows — all inline, no modal
- FK-conflict error on delete surfaces the exact UI-SPEC copy string in an #B85450 dismissible banner
- Image URL field in both create and update forms; slug auto-generated from name on create only
- VenuePublic MenuCard renders a 16:9 cover image when item.image is set; collapses cleanly on broken URL via onError; no image slot when absent

## Task Commits

Each task was committed atomically:

1. **Task 1: Add MenuTab component with full CRUD in OwnerDashboard.tsx** - `8ed2f8d` (feat)
2. **Task 2: Add conditional image render to VenuePublic MenuCard** - `34e2e8e` (feat)

## Files Created/Modified
- `app/src/pages/OwnerDashboard.tsx` - Added MenuTab function, extended activeTab union, inserted Menu tab in strip and content router, added Plus/Edit2/Trash2/X/AlertCircle imports
- `app/src/pages/VenuePublic.tsx` - Reworked MenuCard return to flexDirection:column, added conditional image with 16:9 aspect ratio and onError collapse

## Decisions Made
- Tab ordering: Overview → Menu → Settings → Billing → Integrations (Menu second, logically after dashboard overview)
- Mode state union type (`'list' | 'create' | { type: 'edit'; id: number }`) avoids multiple boolean flags and makes the edit item ID co-located with the mode
- Image onError handled via direct DOM style mutation (`e.currentTarget.style.display = 'none'`) — avoids a React state update and re-render for a purely visual collapse

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three MENU requirements satisfied — Phase 01 is complete
- Phase 02 can proceed knowing: MenuTab pattern (inline form, mode union, utils.venue.listMenu.invalidate) is established for any future tab additions
- Public menu image display is live; S3/R2 upload deferred to v1.2+ as planned

---
*Phase: 01-owner-access-menu-management*
*Completed: 2026-05-23*
