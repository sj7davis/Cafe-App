---
phase: 08-stripe-payments-checkout
plan: 01
subsystem: payments
tags: [stripe, connect, webhooks, order-persistence, platform-fee]
dependency_graph:
  requires: []
  provides: [stripe-connect-platform-fee, confirmed-order-with-items, webhook-order-persistence]
  affects: [app/api/stripe-checkout-router.ts, app/api/boot.ts, app/api/lib/env.ts]
tech_stack:
  added: []
  patterns: [stripe-connect-application-fee, webhook-idempotency, sse-broadcast-on-webhook]
key_files:
  created: []
  modified:
    - app/api/lib/env.ts
    - app/api/stripe-checkout-router.ts
    - app/api/boot.ts
decisions:
  - "Application fee computed from subtotal+tip before Stripe discount coupon is applied (server-side total not yet known at session create time)"
  - "Unconnected venues create session without application_fee/transfer_data to preserve backwards compatibility"
  - "loyaltyPhone metadata field added as preferred loyalty phone; falls back to customerPhone in webhook"
  - "Stripe API version updated to 2026-04-22.dahlia to match installed stripe@22.1.1 package"
  - "drizzle-kit push skipped — local dev .env has MySQL URL but schema/package use PostgreSQL; schema verified by code inspection (no new tables/columns this phase)"
metrics:
  duration_seconds: 467
  completed_date: "2026-05-29"
  tasks_completed: 3
  files_modified: 3
---

# Phase 08 Plan 01: Stripe Connect Application Fee + Webhook Order Persistence Summary

Wire real Stripe Connect payments so every paid order routes a platform fee to the venue's connected account and lands in the database as a confirmed order with full line items only after the webhook fires.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add stripePlatformFeePercent env binding | ab0adb7 | app/api/lib/env.ts |
| 2 | Add Connect application fee + cart metadata to createCheckoutSession | b300abe | app/api/stripe-checkout-router.ts |
| 3 | Persist confirmed order + items + SSE broadcast in webhook | 564a692 | app/api/boot.ts |

## What Was Built

### Task 1: Platform fee env binding (app/api/lib/env.ts)
Added `stripePlatformFeePercent` key reading `STRIPE_PLATFORM_FEE_PERCENT` with `"3"` fallback. Follows the existing string-or-empty pattern used by other Stripe keys; parsed with `Number()` at call sites.

### Task 2: Connect application fee + cart metadata (app/api/stripe-checkout-router.ts)
- Extended `createCheckoutSession` input schema with `menuItemId` (required for webhook item persistence), `loyaltyPhone`, and `loyaltyPointsRedeemed` fields.
- Queries `franchiseeAccounts` by `venueId` to obtain `stripeConnectAccountId` and `platformFeePercent`.
- Computes `application_fee_amount` in cents from `(subtotal + tip) * feePercent / 100` (before Stripe applies any discount coupon).
- When a connected account exists: sets `payment_intent_data.application_fee_amount` and `payment_intent_data.transfer_data.destination`.
- When no connected account: session is created without these fields (unconnected venues still work).
- Serializes cart as `metadata.itemsJson` (JSON array of `{menuItemId, itemName, quantity, unitPrice}`) for webhook reconstruction.
- Updated Stripe API version to `"2026-04-22.dahlia"` (stripe@22.1.1).
- Fixed `z.record` to two-argument form for Zod v4 compatibility.

### Task 3: Webhook order persistence with items + SSE (app/api/boot.ts)
- Added `broadcastToVenue` to sse-store import; added `orderItems`, `discountCodes`, `sql` to drizzle imports.
- Fixed Stripe API version to `"2026-04-22.dahlia"` in webhook handler.
- Fixed pre-existing missing `sql` import (reservation cron used `sql` but it wasn't imported).
- On `checkout.session.completed` with `payment_status === "paid"`:
  1. Parses `meta.itemsJson` into `CartItem[]` array (defaults to `[]` on parse failure).
  2. Inserts order with `status: "confirmed"` — PAY-01/PAY-02 compliance.
  3. Loops parsed items and inserts each into `orderItems` (`orderId`, `menuItemId`, `itemName`, `quantity`, `unitPrice`).
  4. Broadcasts `order_update` SSE event with `{ orderId, status: "confirmed", orderNumber }`.
  5. Increments `discountCodes.usedCount` when discount code present (non-blocking, matches venue-router pattern).
  6. Loyalty earn block uses `meta.loyaltyPhone ?? meta.customerPhone`.
  7. Existing `stripeSessionId` idempotency guard preserved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe API version mismatch**
- **Found during:** Task 1 TypeScript verification
- **Issue:** All Stripe usages specified `"2025-04-30.basil"` but installed `stripe@22.1.1` requires `"2026-04-22.dahlia"`. TypeScript reported type errors on every Stripe constructor call in files I was modifying.
- **Fix:** Updated `apiVersion` in `stripe-checkout-router.ts` and `boot.ts` to `"2026-04-22.dahlia"`.
- **Files modified:** app/api/stripe-checkout-router.ts, app/api/boot.ts
- **Note:** billing-router.ts and franchisee-router.ts still have this error — out-of-scope for this plan, logged to deferred-items.

**2. [Rule 1 - Bug] Missing `sql` import in boot.ts**
- **Found during:** Task 3 TypeScript verification
- **Issue:** The reservation SMS reminder cron used `sql` template literal (line 771) but `sql` was not imported from `drizzle-orm`. Pre-existing bug; my Task 3 import addition fixed it.
- **Fix:** Added `sql` to the `drizzle-orm` import in boot.ts.
- **Files modified:** app/api/boot.ts

**3. [Rule 1 - Bug] z.record single-argument form broken in Zod v4**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `z.record(z.string())` requires two arguments in Zod v4. The `metadata` field schema in the original checkout router used the deprecated single-arg form.
- **Fix:** Changed to `z.record(z.string(), z.string())`.
- **Files modified:** app/api/stripe-checkout-router.ts

**4. Schema push skipped — DB environment mismatch**
- The plan required `npx drizzle-kit push` to confirm schema sync. The local `.env` has `DATABASE_URL=mysql://...` but the project schema uses `drizzle-orm/pg-core` and `pg` driver. Schema sync confirmed by code inspection: all tables used in this plan (`orders`, `orderItems`, `franchiseeAccounts`, `discountCodes`, `loyaltyAccounts`, `loyaltyTransactions`) pre-exist in `app/db/schema.ts`. No new columns or tables added.

## Known Stubs

None. All data flows are wired to real DB tables.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: price-trust | app/api/stripe-checkout-router.ts | Client-supplied `unitPrice` values are used as Stripe line-item amounts (T-08-01). Authoritative total taken from `session.amount_total` in webhook. Documented per plan threat model. |

## Self-Check

- [x] app/api/lib/env.ts — modified, `stripePlatformFeePercent` present
- [x] app/api/stripe-checkout-router.ts — modified, Connect fee logic present
- [x] app/api/boot.ts — modified, confirmed status + orderItems insert present
- [x] Commits ab0adb7, b300abe, 564a692 verified in git log
- [x] TypeScript: 0 errors in the three plan files; 11 pre-existing errors in out-of-scope files

## Self-Check: PASSED
