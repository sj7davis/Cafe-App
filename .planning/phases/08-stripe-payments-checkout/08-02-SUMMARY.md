---
phase: 08-stripe-payments-checkout
plan: 02
subsystem: payments
tags: [stripe, gift-cards, subscription-passes, loyalty, webhook, checkout]
dependency_graph:
  requires:
    - phase: 08-01
      provides: stripe-connect-platform-fee, webhook-order-persistence, getStripe helper
  provides:
    - stripe-gift-card-checkout-session
    - stripe-pass-checkout-session
    - gift-card-webhook-fulfilment
    - pass-webhook-fulfilment
    - loyalty-redemption-decrement
  affects:
    - app/api/stripe-checkout-router.ts
    - app/api/boot.ts
tech-stack:
  added: []
  patterns:
    - buildPaymentIntentData-helper-for-connect-fee-reuse
    - meta.kind-webhook-dispatch-pattern
    - in-memory-set-idempotency-for-no-session-id-tables
key-files:
  created: []
  modified:
    - app/api/stripe-checkout-router.ts
    - app/api/boot.ts
key-decisions:
  - "Pass price read from venues.settingsJson.passConfig server-side — client price input ignored (T-08-04 mitigated)"
  - "Gift card and pass rows created ONLY in signature-verified webhook on payment_status=paid (T-08-05 mitigated)"
  - "In-memory Set (processedGiftPassSessions) guards against duplicate gift_card/pass webhook events; full DB-level idempotency deferred (T-08-06 accept — no stripeSessionId column on those tables)"
  - "Loyalty redemption decrement wrapped in try/catch — loyalty failure must not abort order confirmation"
  - "buildPaymentIntentData() helper factors out Connect application-fee + transfer logic shared by both new mutations and reduces duplication with existing createCheckoutSession"
  - "meta.kind defaults to 'order' when absent, preserving backwards compat with existing 08-01 sessions"
patterns-established:
  - "meta.kind dispatch: add 'kind' field to Stripe session metadata to route webhook to correct fulfilment branch"
  - "Public checkout mutations never create DB rows — creation deferred to signature-verified webhook"
requirements-completed: [PAY-03, PAY-04, CHK-02]
duration: 8min
completed: "2026-05-29"
---

# Phase 08 Plan 02: Gift Card + Pass Checkout + Loyalty Redemption Summary

**Two Stripe Checkout sessions (gift_card + pass) and three webhook fulfilment branches: gift card row + email on payment, pass row on payment, and loyalty balance decrement for redeemed points.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-29T00:03:00Z
- **Completed:** 2026-05-29T00:11:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `createGiftCardCheckoutSession` and `createPassCheckoutSession` public mutations added to stripeCheckoutRouter — no owner JWT required, both include Connect application-fee + transfer when venue has stripeConnectAccountId
- Webhook now dispatches on `meta.kind`: `gift_card` creates a giftCards row + sends recipient email, `pass` creates a subscriptionPasses row with remainingCredits=totalCredits, `order` (default) runs existing 08-01 logic
- Loyalty redemption block added to the `order` path: when `meta.loyaltyPointsRedeemed > 0`, decrements `loyaltyAccounts.pointsBalance` and inserts a `loyaltyTransactions` row with type `redeem` — wrapped in try/catch so loyalty failure cannot abort order confirmation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add createGiftCardCheckoutSession and createPassCheckoutSession mutations** - `b0c12aa` (feat)
2. **Task 2: Fulfil gift card, pass, and loyalty redemption in webhook** - `9db3016` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified
- `app/api/stripe-checkout-router.ts` - Added `generateGiftCardCode()`, `buildPaymentIntentData()` helper, `createGiftCardCheckoutSession` mutation, `createPassCheckoutSession` mutation; imported giftCards, subscriptionPasses, sendEmail, randomBytes
- `app/api/boot.ts` - Added giftCards + subscriptionPasses imports; added `processedGiftPassSessions` Set; refactored checkout.session.completed to branch on `meta.kind`; added gift_card, pass, and loyalty redemption fulfilment blocks

## Decisions Made
- Pass price is sourced from `venues.settingsJson.passConfig.price` server-side; client-supplied price is never used (T-08-04 threat mitigated)
- Gift card and pass DB rows are created only inside the signature-verified webhook, after `payment_status === "paid"` (T-08-05 threat mitigated)
- Idempotency for gift_card/pass sessions uses an in-memory `Set<string>` (processedGiftPassSessions). This is explicitly documented as a limitation: the Set is cleared on process restart and does not survive horizontal scaling. Full DB-level idempotency requires a `stripeSessionId` column on the `giftCards`/`subscriptionPasses` tables — deferred to a future phase (T-08-06 accept per plan threat model)
- Loyalty redemption is wrapped in a non-blocking try/catch block, matching the pattern established for loyalty earning in 08-01

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All data flows are wired to real DB tables and Stripe Checkout sessions.

## Threat Flags

None. All surfaces introduced in this plan were covered by the plan's threat model (T-08-04, T-08-05, T-08-06).

## Issues Encountered

**Worktree missing node_modules**: The git worktree did not have node_modules installed (worktrees share source files but not `node_modules`). Installed with `npm install --prefer-offline` in the worktree's `app/` directory. TypeScript checks then passed with 0 errors in the two modified files (pre-existing errors in billing-router, franchisee-router, audit-router, venue-router unchanged from 08-01).

**Worktree behind main**: This worktree was created at commit `f769c71` (Phase 07 tip) rather than the expected base `64dc906` (Phase 08 wave-1 tip). A fast-forward `git merge 64dc906a` was performed to bring in the 08-01 changes before implementing 08-02. No conflicts.

## Next Phase Readiness
- PAY-03 (gift card via Stripe), PAY-04 (pass via Stripe), CHK-02 (loyalty redemption) complete
- Next: 08-03 (discount code checkout UI) and 08-04 (public VenuePublic checkout flow wiring)
- Idempotency for gift_card/pass sessions (stripeSessionId column) is a known deferred item for a future phase

## Self-Check

- [x] app/api/stripe-checkout-router.ts — modified, createGiftCardCheckoutSession + createPassCheckoutSession present
- [x] app/api/boot.ts — modified, kind dispatch + gift_card/pass/loyalty redemption branches present
- [x] Commits b0c12aa (Task 1) and 9db3016 (Task 2) verified in git log
- [x] TypeScript: 0 errors in the two plan files; pre-existing errors in out-of-scope files unchanged
- [x] `npm run build` succeeded (2497 modules transformed, built in 8.29s)

## Self-Check: PASSED

---
*Phase: 08-stripe-payments-checkout*
*Completed: 2026-05-29*
