---
phase: 07
plan: 07-04
subsystem: marketing-auth-ui
tags: [ui-refresh, landing-page, saas-marketing, auth-forms, operator-shell]
key-files:
  modified:
    - app/src/pages/Landing.tsx
    - app/src/pages/Login.tsx
    - app/src/pages/StaffLogin.tsx
    - app/src/pages/SuperAdmin.tsx
  unchanged:
    - app/src/pages/Onboarding.tsx
metrics:
  tasks_completed: 3
  tasks_skipped: 1
  commits: 3
---

# Plan 07-04 Summary: Marketing + Auth Pages

## What Was Built

Rebuilt the marketing and auth surface in a modern SaaS style:

1. **Landing.tsx** — Full SaaS product page:
   - Nav bar with B1 logo, "Sign in" link (→ /login), teal "Start free" CTA (→ /onboarding)
   - Hero: large headline "Run your cafe smarter", subheadline, two CTA buttons, product screenshot placeholder
   - Feature grid: 6 white cards with icons — Online Ordering, Kitchen Display, Staff Management, Analytics, Gift Cards, Loyalty Points
   - Social proof: 3 testimonial cards with star ratings and attribution
   - CTA banner section + footer with nav links
   - Warm off-white `#F8F6F2` bg, teal `#5E8B8B` accents

2. **Login.tsx** — Centered card layout:
   - Page bg `#FAFAFA`, white card (max-width 400px, radius 12px)
   - Teal `#5E8B8B` submit button and focus rings
   - "New cafe? Start free →" link to /onboarding preserved
   - All login mutation/handler/redirect behavior unchanged

3. **StaffLogin.tsx** — Operator palette applied:
   - Page bg `#FAFAFA`, card `#FFFFFF`, border `#E4E4E7`, teal submit button
   - All auth flows (login, 2FA, forgot password, reset, email verify) unchanged

4. **SuperAdmin.tsx** — Operator table layout:
   - Dark `#18181B` header with teal tab indicator
   - White stat cards with teal icons
   - Venues: table layout with header row, status badges, compact action buttons

## Deviations

- **Onboarding.tsx skipped**: Already had a complete multi-step `StepIndicator` component with numbered progress dots and checkmarks. No changes needed — success criterion already satisfied.

## Commits

| Hash | Message | Files |
|------|---------|-------|
| 7fe17fd | feat(07-04): rebuild Landing as SaaS product page | Landing.tsx |
| 3b5752d | feat(07-04): clean up Login to centered card with teal accent | Login.tsx |
| 0f32782 | feat(07-04): polish StaffLogin + SuperAdmin with operator palette | StaffLogin.tsx, SuperAdmin.tsx |

## Self-Check: PASSED

- ✓ Landing has hero + 6-card feature grid + social proof
- ✓ Login is centered card with teal button
- ✓ StaffLogin uses operator design tokens
- ✓ SuperAdmin has table layout with dark header
- ✓ All tRPC calls and form handlers preserved
- ✓ Onboarding already had multi-step progress — no regression
