---
phase: 08-stripe-payments-checkout
plan: 04
subsystem: payments
tags: [stripe, connect, payout-balance, platform-fees, integrations, superadmin]
dependency_graph:
  requires: [08-01]
  provides: [stripe-connect-onboarding-ui, payout-balance-display, platform-fee-admin-visibility]
  affects:
    - app/api/franchisee-router.ts
    - app/api/platform-admin-router.ts
    - app/src/pages/OwnerDashboard.tsx
    - app/src/pages/SuperAdmin.tsx
tech_stack:
  added: []
  patterns: [stripe-balance-api, stripe-payouts-list, trpc-platformAdmin-jwt, connected-account-scoping]
key_files:
  created: []
  modified:
    - app/api/franchisee-router.ts
    - app/api/platform-admin-router.ts
    - app/src/pages/OwnerDashboard.tsx
    - app/src/pages/SuperAdmin.tsx
decisions:
  - "getPayoutBalance wraps Stripe calls in try/catch returning connected:false on error — owners never see a throw from a balance lookup failure"
  - "handleStripeConnect auto-creates franchisee config with defaults if NOT_FOUND, then retries createConnectAccountLink — PAY-05 onboarding starts from Integrations tab without a prior Franchisee tab setup step"
  - "platformFees fetches all venues in one query to build a name map — avoids N+1 queries and doesn't require inArray import"
  - "Stripe apiVersion in franchisee-router.ts updated to 2026-04-22.dahlia via STRIPE_API_VERSION constant — fixes pre-existing TS type errors"
metrics:
  duration_seconds: 1380
  completed_date: "2026-05-29"
  tasks_completed: 3
  files_modified: 4
---

# Phase 08 Plan 04: Stripe Connect Onboarding, Payout Balance & Platform Fee Visibility Summary

Wire the missing owner-facing Stripe Connect onboarding and payout balance card into the Integrations tab, and surface platform fee totals per venue in the SuperAdmin overview panel.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add getPayoutBalance + platformFees queries | 18db04d | app/api/franchisee-router.ts, app/api/platform-admin-router.ts |
| 2 | Stripe Connect onboarding + payout balance in Integrations tab | ecd951b | app/src/pages/OwnerDashboard.tsx |
| 3 | Platform fee visibility in SuperAdmin overview | 82e0a78 | app/src/pages/SuperAdmin.tsx |

## What Was Built

### Task 1: Backend queries (franchisee-router.ts + platform-admin-router.ts)

**getPayoutBalance (franchisee-router.ts):**
- Input: `{ token }` — verified via owner JWT (venueId scoped).
- If no `stripeConnectAccountId` or no `env.stripeSecretKey`: returns `{ connected: false, available: 0, pending: 0, currency: "aud", lastPayoutDate: null }` — never throws.
- Otherwise: calls `stripe.balance.retrieve()` and `stripe.payouts.list({ limit: 1 })` with `stripeAccount` header scoped to the caller's connected account.
- Returns `{ connected, available, pending, currency, lastPayoutDate }`.
- Stripe calls wrapped in try/catch: any error returns `connected: false`.

**platformFees (platform-admin-router.ts):**
- Input: `{ token }` — verified via platform admin JWT (`env.platformAdminSecret`). An owner token signed with a different secret fails jwtVerify.
- Aggregates `sum(franchiseePayouts.platformFee)` for total and per-venueId groupBy.
- Fetches all venues in one query to build a `venueId → name` map.
- Returns `{ totalPlatformFee: number, byVenue: [{ venueId, venueName, platformFee, payoutCount }] }`.

### Task 2: Integrations tab — Stripe Connect card (OwnerDashboard.tsx)

Added a "Payments" section to `IntegrationsTab` containing a Stripe Connect card:
- **Status pill**: `getConnectStatus` → `pillConnected` when `ready`, `pillNotConnected` with message when account exists but onboarding incomplete, "Not connected" when no account.
- **Connect/Continue button**: calls `handleStripeConnect` which calls `createConnectAccountLink.mutateAsync({ token })`. If the franchisee config row doesn't exist yet (NOT_FOUND error), auto-calls `franchisee.setup` with defaults then retries — enabling onboarding to start directly from Integrations without visiting the Franchisee tab first.
- **Payout balance card** (shown when `ready`): displays available balance ($ + currency), pending balance (when > 0), and last payout date formatted with `toLocaleDateString('en-AU')`.
- **Onboarding return**: `useEffect` on mount checks `?connected=stripe` or `?reauth=1` and refetches `getConnectStatus` + `getPayoutBalance`.

### Task 3: SuperAdmin overview — Platform Fees panel (SuperAdmin.tsx)

Added `feesData` query (`trpc.platformAdmin.platformFees`) to the dashboard, rendered in the overview tab:
- **Headline**: "Platform Fees Collected" with total `$X.XX AUD` as the right-aligned figure.
- **Per-venue table**: columns Venue / Platform Fee / Payouts, one row per franchiseePayouts group.
- **Empty state**: descriptive message when no payout records exist yet.
- Styled consistently with the existing Tier Breakdown card (border-radius 12, box-shadow, `#09090B` text, `#71717A` labels).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe apiVersion mismatch in franchisee-router.ts**
- **Found during:** Task 1 TypeScript verification
- **Issue:** franchisee-router.ts used `"2025-04-30.basil"` on three Stripe constructor calls, but installed stripe@22.1.1 only accepts `"2026-04-22.dahlia"`. Pre-existing type errors.
- **Fix:** Added `const STRIPE_API_VERSION = "2026-04-22.dahlia" as const` and replaced all three occurrences.
- **Files modified:** app/api/franchisee-router.ts
- **Commit:** 18db04d

**2. [Environment] Worktree lacks node_modules**
- **Found during:** Task 2 build verification
- **Issue:** Git worktree has no node_modules; `npm run build` in the worktree app directory fails.
- **Fix:** Created a Windows directory junction from the worktree's `app/node_modules` to the main app's `node_modules`. Build and tsc checks pass against worktree source files.
- **Impact:** No code changes; build environment setup only.

### Pre-existing Out-of-Scope Issues (logged, not fixed)

- `app/api/boot.ts(771)`: `sql` not imported — pre-existing on this branch; fixed in 08-01 commits on main branch but not yet merged into this worktree branch.
- `app/api/billing-router.ts`: same apiVersion mismatch (3 occurrences) — out of scope for this plan.

## Known Stubs

None. All data flows are wired to real Stripe API calls and real DB queries. Empty-state UI is intentional (shows correct message when no payouts exist yet, not a stub).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: jwt-scope | app/api/franchisee-router.ts | getPayoutBalance scopes Stripe calls to caller's own stripeConnectAccountId via owner JWT venueId — T-08-10 mitigated |
| threat_flag: admin-jwt | app/api/platform-admin-router.ts | platformFees verifies platform admin secret JWT (env.platformAdminSecret) — T-08-09 mitigated; owner tokens use a different secret and will fail jwtVerify |

## Self-Check

- [x] app/api/franchisee-router.ts — modified, `getPayoutBalance` present (commit 18db04d)
- [x] app/api/platform-admin-router.ts — modified, `platformFees` present (commit 18db04d)
- [x] app/src/pages/OwnerDashboard.tsx — modified, `createConnectAccountLink` and Stripe Connect card present (commit ecd951b)
- [x] app/src/pages/SuperAdmin.tsx — modified, `platformFees` query and fee panel present (commit 82e0a78)
- [x] TypeScript: no errors in franchisee-router.ts or platform-admin-router.ts (tsc --noEmit passes for these files)
- [x] Build: `npm run build` succeeds (vite build in worktree app directory)
- [x] Commits 18db04d, ecd951b, 82e0a78 verified in git log

## Self-Check: PASSED
