---
phase: 09-sse-hardening-full-kds-dine-in
plan: "03"
subsystem: frontend
tags:
  - sse
  - real-time
  - activity-feed
  - qr-codes
  - dine-in
dependency_graph:
  requires:
    - 09-01  # SSE endpoint with JWT auth
    - 09-02  # useVenueSSE hook
  provides:
    - RT-03  # SSE-driven activity feed in OwnerDashboard
    - DINE-03  # per-table QR codes (confirmed already implemented)
  affects:
    - app/src/pages/OwnerDashboard.tsx
tech_stack:
  added: []
  patterns:
    - SSE invalidation via trpc.useUtils()
key_files:
  modified:
    - app/src/pages/OwnerDashboard.tsx
decisions:
  - "Used feedUtils (locally scoped trpc.useUtils()) to avoid conflicting with existing utils declarations in sub-components"
  - "DINE-03 required no code change — generateTableQRs already encodes /v/:slug?table=${tableNum}"
metrics:
  duration: "5 minutes"
  completed: "2026-05-30T02:32:33Z"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 09 Plan 03: SSE Activity Feed + DINE-03 Confirmation Summary

**One-liner:** Owner activity feed now updates live via SSE `order_new`/`order_update` events, replacing 30-second polling — and per-table QR code generation confirmed already implemented.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire OwnerDashboard activity feed to SSE (RT-03) | 0737e23 | app/src/pages/OwnerDashboard.tsx |

## What Was Built

### Task 1 — SSE-driven activity feed (RT-03)

Two targeted changes inside `OwnerDashboard`:

1. **Removed 30-second polling** from `getActivityFeed` query: `refetchInterval: 30000` → `refetchInterval: false`.

2. **Added `useVenueSSE` call** immediately after the activityFeed query declaration:
   - Subscribes to `order_new` and `order_update` events
   - On any event, calls `feedUtils.venue.getActivityFeed.invalidate()` to trigger an immediate re-fetch
   - Uses `venue?.id ?? null` and `token || null` — both safe for null/empty-string inputs

3. **DINE-03 confirmed (no code change):** `QRCodesTab.generateTableQRs` at line 5816 already encodes:
   ```typescript
   const url = `${origin}/v/${slug}?table=${tableNum}`;
   ```
   This satisfies the DINE-03 requirement — per-table QR codes with the correct dine-in URL format.

## Verification

```
grep -n "refetchInterval.*30000" app/src/pages/OwnerDashboard.tsx
# → no match (polling removed)

grep -n "useVenueSSE" app/src/pages/OwnerDashboard.tsx
# → line 4 (import), line 163 (call)

grep -n "table=\${tableNum}" app/src/pages/OwnerDashboard.tsx
# → line 5816 (DINE-03 confirmed)

npx tsc --noEmit
# → no errors
```

## Deviations from Plan

**None.** Plan executed exactly as written. The only minor implementation detail: used `feedUtils` as the variable name for `trpc.useUtils()` (instead of `utils`) to avoid shadow conflicts with the many `const utils = trpc.useUtils()` declarations in sub-components later in the file. This is semantically identical.

## Known Stubs

None. The activity feed was already fully wired — this plan only changed the data-refresh mechanism from polling to SSE-driven invalidation.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The owner JWT is passed to `useVenueSSE` which forwards it to `/api/sse/orders/:venueId?token=...` — this threat surface was documented and accepted in the plan's threat model (T-09-07, T-09-08).

## Self-Check: PASSED

- [x] `app/src/pages/OwnerDashboard.tsx` modified with both changes
- [x] Commit `0737e23` exists
- [x] `refetchInterval: 30000` removed from activityFeed query
- [x] `useVenueSSE` imported and called with correct params
- [x] `generateTableQRs` encodes `?table=${tableNum}` (DINE-03 confirmed)
- [x] TypeScript compiles without errors
