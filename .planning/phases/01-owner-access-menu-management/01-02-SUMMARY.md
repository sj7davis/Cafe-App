---
phase: 01-owner-access-menu-management
plan: "02"
subsystem: frontend-auth
tags: [login, auth, react, routing]
dependency_graph:
  requires: [useVenueAuth hook, trpc.venue.login mutation (backend)]
  provides: [/login route, owner login page, corrected dashboard redirect]
  affects: [App.tsx routing, OwnerDashboard unauthenticated fallback]
tech_stack:
  added: []
  patterns: [trpc mutation + useVenueAuth hook, react-router Link + useNavigate, inline style tokens from UI-SPEC]
key_files:
  created:
    - app/src/pages/Login.tsx
  modified:
    - app/src/App.tsx
    - app/src/pages/OwnerDashboard.tsx
decisions:
  - "Used react-router Link (not anchor) for /onboarding link to satisfy react-router v7 pattern"
  - "Back-to-home link uses Link to='/' matching owner path-routing convention (not hash routing like StaffLogin)"
  - "Input default border uses rgba(24,24,24,0.15) per UI-SPEC (not #e7e5e4 used in StaffLogin)"
metrics:
  duration_seconds: 131
  completed_date: "2026-05-23"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
requirements_closed: [AUTH-01, AUTH-02, AUTH-03]
---

# Phase 01 Plan 02: Owner Login Page Summary

Owner login page wired to trpc.venue.login mutation with react-router navigation, inline UI-SPEC tokens, and corrected dashboard unauthenticated redirect from /onboarding to /login.

## What Was Built

### Task 1 — app/src/pages/Login.tsx (commit 8e34207)

New owner login page component:

- Email + password form submitting to `trpc.venue.login.useMutation`
- On success: calls `useVenueAuth.login(token)` then `navigate('/dashboard')`
- On UNAUTHORIZED error: shows "Invalid email or password. Please try again." inline
- On network error: shows "Unable to connect. Check your connection and try again."
- Owner palette background `#F3F2EE` (distinct from StaffLogin's `#f5f5f4`)
- Logo block: 64x64px, `#181818` bg, Coffee icon at 32px, `#F3F2EE` color
- Card: white, `border-radius: 16px`, `padding: 32px`, box-shadow per spec
- Submit button loading state: opacity 0.7, Loader2 spinner, "Signing in..." label
- "New venue? Register here" Link to `/onboarding` (react-router Link, 13px `#78716c`)
- "Back to home" Link to `/` with ArrowLeft icon
- `document.title = 'Owner Login — B1 Platform'` via useEffect

### Task 2 — App.tsx + OwnerDashboard.tsx (commit 086fcc3)

**App.tsx:** Added `import Login from './pages/Login'` and `<Route path="/login" element={<Login />} />` between `/onboarding` and `/dashboard` routes.

**OwnerDashboard.tsx:** Changed "Login Required" CTA from `navigate('/onboarding')` to `navigate('/login')`. Button text "GO TO LOGIN" and all styles unchanged.

## Verification

- `npx tsc --noEmit` from app/ exits 0 (zero errors)
- All acceptance criteria checks passed:
  - Login.tsx contains all required strings and patterns
  - No `window.location.reload` or `useStaffAuth` in Login.tsx
  - App.tsx has 1 Login import and 1 `/login` route
  - OwnerDashboard has `navigate('/login')`, no `navigate('/onboarding')`

## Requirements Closed

- AUTH-01: /login page accepts email + password
- AUTH-02: successful login navigates to /dashboard
- AUTH-03: visible "New venue? Register here" link to /onboarding from login page

## Deviations from Plan

None — plan executed exactly as written.
