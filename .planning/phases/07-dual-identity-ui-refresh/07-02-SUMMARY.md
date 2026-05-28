---
plan: 07-02
phase: 07-dual-identity-ui-refresh
status: complete
completed_at: "2026-05-28"
commit: afa170a
files_changed: 2
---

# Plan 07-02 Summary: OwnerDashboard AppShell Re-shell

## What Was Built

### Task 1: `getActivityFeed` procedure (venue-router.ts)
- New `publicQuery` procedure added to venueRouter
- Input: `{ token: z.string() }` — JWT verified with clockTolerance: 60
- Returns `{ recentOrders, unreadReviews }`:
  - `recentOrders`: 5 most recent orders (id, orderNumber, status, totalAmount, createdAt) ordered by `createdAt desc`
  - `unreadReviews`: count of reviews created in last 7 days — **reviews table has no read/seen boolean column**, so recency-based definition used (code comment in file)
- No existing procedures modified

### Task 2: OwnerDashboard re-shell (OwnerDashboard.tsx)
- Added imports: `AppShell`, `ThemeProvider`, `SidebarNavGroup` (from 07-01 components), `Bell` (lucide)
- Added `activityOpen` state + `trpc.venue.getActivityFeed.useQuery` (polling every 30s)
- Built `NAV_GROUPS: SidebarNavGroup[]` const (all existing tab groups and ids preserved exactly)
- Replaced the entire inline `<header>` + inline `<nav width:240>` + outer wrapper `<div>` with `<ThemeProvider><AppShell ...>`
- `topBarLeft`: brand logo + venue name + multi-venue switcher + subscription badge
- `topBarRight`: Bell activity button (with teal unread-reviews badge) + activity dropdown panel + View Site + Bookings links + user avatar + logout button
- AppShell children: unchanged tab render block (`<div style={{ padding: '28px 32px'...}>`)
- `topItems` query limit changed from 10 → 5 (top-5 items table)
- Dark mode toggle: provided by AppShell's built-in Sun/Moon button (ThemeContext)

## Key Decisions
- `autonomous: false` — human checkpoint required before SUMMARY
- Reviews table has no `read`/`seen`/`viewed` column → "unread" = reviews.createdAt within 7 days
- Activity dropdown is a floating panel on the bell button (not a sidebar widget) — keeps the sidebar clean
- `rangeDays` not needed as a new state; `selectedDays` already drives all analytics queries (existing 7/30/90d toggle preserved)

## Verification
- `npm run build` passes (vite build, 2497 modules, no new errors)
- TypeScript `tsc --noEmit` passes (app/tsconfig.json)
- All acceptance criteria met:
  - ✅ AppShell + ThemeProvider rendered
  - ✅ Old inline `width: 240` nav block removed
  - ✅ `getActivityFeed` wired + unread-reviews badge rendered
  - ✅ 7d/30d/90d analytics range toggle drives chart + top-5 items table
  - ✅ Build succeeds
