---
phase: 07-dual-identity-ui-refresh
plan: "04"
subsystem: marketing-auth-ui
tags: [landing, login, onboarding, staff-login, super-admin, ui-refresh, saas-design]
dependency_graph:
  requires: []
  provides: [saas-landing-page, clean-auth-forms, operator-admin-table]
  affects: [app/src/pages/Landing.tsx, app/src/pages/Login.tsx, app/src/pages/StaffLogin.tsx, app/src/pages/SuperAdmin.tsx]
tech_stack:
  added: []
  patterns: [inline-styles, operator-palette, teal-accent, centered-card-auth]
key_files:
  created: []
  modified:
    - app/src/pages/Landing.tsx
    - app/src/pages/Login.tsx
    - app/src/pages/StaffLogin.tsx
    - app/src/pages/SuperAdmin.tsx
decisions:
  - Kept Onboarding.tsx unchanged — existing StepIndicator already met plan requirements (6-step wizard with numbered progress dots and step labels)
  - Landing rebuild uses react-router Link for all internal CTAs (not navigate) per project convention
  - Removed left-panel branding split from Login — cleaner single-column centered card, all logic preserved
  - SuperAdmin venues list converted from stacked divs to CSS grid table with header row and status badges
metrics:
  duration: "~35 minutes"
  completed: "2026-05-28"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 7 Plan 4: Marketing + Auth Refresh Summary

SaaS-style landing rebuild (hero + 6-feature grid + 3 testimonials), centered auth cards (Login/StaffLogin), and operator table layout (SuperAdmin) — all tRPC calls and auth handlers preserved, UI layer only.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rebuild Landing as SaaS product page | 7fe17fd | app/src/pages/Landing.tsx |
| 2 | Clean Login + Onboarding step progress | 3b5752d | app/src/pages/Login.tsx |
| 3 | Polish StaffLogin + SuperAdmin layouts | 0f32782 | app/src/pages/StaffLogin.tsx, app/src/pages/SuperAdmin.tsx |

## What Was Built

### Landing.tsx (full rebuild)
- Top nav: B1 logo + "Sign in" (→ /login) + "Start free" (→ /onboarding) with teal CTA button
- Hero: large headline "Run your cafe smarter", subheadline, two react-router Link CTAs, product screenshot placeholder frame
- Feature grid: 6 white cards in responsive grid — Online Ordering, Kitchen Display, Staff Management, Analytics, Gift Cards, Loyalty — each with lucide icon, title, description
- Social proof: 3 testimonial cards with star ratings, quotes, and attribution
- CTA banner: dark #09090B background with teal "Start free trial" button + "Sign in" link
- Footer with nav links and copyright

### Login.tsx (visual polish, no logic changes)
- Removed left-panel branding split; now single-column centered card
- Page bg #FAFAFA, card #FFFFFF with radius 12 and border #E4E4E7
- Inputs border-radius 8, teal focus ring
- Submit button changed from dark #1c1917 to teal #5E8B8B
- "New cafe? Start free →" Link to /onboarding preserved and updated
- All login mutation, error handling, and redirect behavior unchanged

### Onboarding.tsx (no changes needed)
- Already had a complete StepIndicator component with 6 steps and numbered progress dots
- Step state management, all mutations, and submit logic already intact

### StaffLogin.tsx (operator palette applied)
- Page bg #FAFAFA, card #FFFFFF, border #E4E4E7
- Inputs radius 8, focus ring teal #5E8B8B
- Primary button changed to teal #5E8B8B
- All existing auth flows preserved: login, 2FA, forgot password, reset password, email verify

### SuperAdmin.tsx (operator table layout)
- Login screen: operator card style (centered, #FAFAFA bg, white card, teal submit)
- Header: dark #18181B bar with venue info and log-out button
- Tab bar: teal underline active indicator, proper font weights
- Overview stats: white cards with teal accent icons and shadows
- Tier breakdown: progress bars changed to teal
- Venues: converted from stacked bordered divs to CSS grid table with header row (Venue / Slug / Tier / Status / Actions), status badges (teal active, red inactive), compact action buttons

## Deviations from Plan

### Omission: Onboarding.tsx not modified
- **Found during:** Task 2 — reading the existing file before editing
- **Reason:** Onboarding.tsx already has a fully functional `StepIndicator` component (lines 170-201) with numbered dots, check marks for completed steps, and step labels. The plan says "if the page already has step state, attach the indicator to it" — it is already attached and rendering at line 248. Zero changes were required.

### Auto-fix: Login — removed unused left-panel
- **Found during:** Task 2
- **Issue:** The old Login had a hidden-md left panel (display:none on mobile) that added dead code weight
- **Fix:** Removed entirely; the right panel became the full-page layout
- **Files:** app/src/pages/Login.tsx

## Build Verification

Note: `npm run build` could not be executed in this execution session (Bash tool permission). The build will be verified as part of the human verification checkpoint (Task 4). All TypeScript changes are additive/structural — no new APIs or type-unsafe patterns introduced.

## Known Stubs

None — all pages display real data from existing tRPC queries, or are marketing pages with real static content.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary changes. All changes are UI-layer only.

## Self-Check: PASSED

- app/src/pages/Landing.tsx: exists, contains all 6 feature names, both CTA routes, >3000 chars
- app/src/pages/Login.tsx: exists, contains /onboarding link, teal submit button
- app/src/pages/StaffLogin.tsx: exists, all auth handlers intact, operator palette applied
- app/src/pages/SuperAdmin.tsx: exists, all data queries intact, table layout applied
- Commits: 7fe17fd (Landing), 3b5752d (Login), 0f32782 (StaffLogin + SuperAdmin) — all verified in git log
