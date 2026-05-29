---
phase: 08-stripe-payments-checkout
plan: "03"
subsystem: payments
tags: [stripe, checkout, loyalty, gift-cards, passes, customer-ui]
dependency_graph:
  requires:
    - phase: 08-01
      provides: stripe-connect-platform-fee, webhook-order-persistence
    - phase: 08-02
      provides: gift-card-webhook-fulfilment, pass-webhook-fulfilment, loyalty-redemption-decrement
  provides:
    - stripe-checkout-redirect-from-venuePublic
    - post-return-order-confirmation-banner
    - loyalty-points-redemption-ui
    - customer-gift-card-purchase-panel
    - customer-pass-purchase-panel
  affects:
    - app/src/pages/VenuePublic.tsx
    - app/api/stripe-checkout-router.ts
tech_stack:
  added: []
  patterns:
    - window.location.href-stripe-redirect
    - verifySession-useQuery-on-url-param
    - loyalty-clamp-redemption-to-subtotal
key_files:
  created: []
  modified:
    - app/src/pages/VenuePublic.tsx
    - app/api/stripe-checkout-router.ts
decisions:
  - "handlePlaceOrder is now async and calls createCheckoutSession.mutateAsync; the direct createOrder.mutate path is removed for the online flow"
  - "success_url corrected from /<slug>/order-status to /v/<slug>?order=success&session={id} so VenuePublic can verify on return"
  - "loyaltyDiscount is clamped to Math.min(redeemPoints/10, remainingSubtotalAfterOtherDiscounts) to prevent negative totals"
  - "Redemption checkbox auto-computes max redeemable points (floored to 10s); user cannot enter arbitrary values"
  - "Gift card and pass purchase panels are collapsed by default (toggle buttons) to keep page clean"
  - "checkoutName/checkoutPhone are shared between order checkout and pass purchase — entering once pre-fills both"
metrics:
  duration_seconds: 1200
  completed_date: "2026-05-29"
  tasks_completed: 3
  files_modified: 2
---

# Phase 08 Plan 03: VenuePublic Stripe Checkout Wiring Summary

Replace direct order creation in VenuePublic with a Stripe-hosted Checkout redirect, add loyalty-point redemption alongside the discount-code field, and add customer-facing gift card and coffee pass purchase panels — all styled with the warm Landing/Login design tokens.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Redirect Place Order through Stripe Checkout + post-return verification | 454ffbf | app/src/pages/VenuePublic.tsx, app/api/stripe-checkout-router.ts |
| 2 | Add loyalty-points redemption control wired into charged total | b4420ba | app/src/pages/VenuePublic.tsx |
| 3 | Add customer gift card and coffee pass purchase via Stripe | 3681a6e | app/src/pages/VenuePublic.tsx |

## What Was Built

### Task 1: Stripe Checkout redirect + return verification (app/src/pages/VenuePublic.tsx, app/api/stripe-checkout-router.ts)

- **Fixed success_url** in `stripe-checkout-router.ts`: was `/${venue.slug}/order-status?session=...`, corrected to `/v/${venue.slug}?order=success&session={CHECKOUT_SESSION_ID}` (the only customer venue route in App.tsx is `/v/:slug`).
- **`createCheckoutSession` mutation**: `trpc.stripeCheckout.createCheckoutSession.useMutation()` added.
- **`handlePlaceOrder` rewritten** to `async`: builds `stripeItems` array from cart (maps each line to `{ menuItemId, name, itemName, quantity, unitPrice }`), calls `createCheckoutSession.mutateAsync(...)`, then `window.location.href = result.url`. No longer calls `createOrder.mutate`.
- **`verifySession` query**: enabled when `?order=success&session=<id>` present in URL. Clears cart when `paid === true`.
- **Confirmation banner**: rendered when `verifySessionQuery.data?.paid`; shows order number in teal, link to `/order/<orderNumber>`, warm teal card styling (`rgba(94,139,139,0.08)` background).
- **Gift card success banner** (`?giftcard=success`) and **pass success banner** (`?pass=success`): rendered immediately from URL params with same card styling.
- **Toast effects**: `stripeGiftcardParam === 'success'` and `stripePassParam === 'success'` also show `showToast`.
- **Place Order button**: now shows "Pay with Stripe", uses `createCheckoutSession.isPending`, teal accent colour.
- **mutations pre-added** for gift card and pass checkout (used in Task 3).
- **`redeemPoints` state** (default 0) and `loyaltyDiscount` derivation pre-added (used in Task 2).

### Task 2: Loyalty points redemption (app/src/pages/VenuePublic.tsx)

- `redeemPoints` (number, default 0); `loyaltyDiscount = Math.min(redeemPoints / 10, remainingSubtotal)`.
- Redemption control appears **only when `loyaltyBalance >= 100`** (server minimum is 100 pts).
- Checkbox auto-computes max redeemable points: `Math.min(floorTo10(loyaltyBalance), floorTo10(cartSubtotal * 10)) pts`.
- Clamping ensures `loyaltyDiscount` never exceeds the discounted subtotal — no negative totals possible.
- When balance is 1–99 pts, a hint shows: "Earn N more points to unlock redemption".
- `loyaltyDiscount` included in `discountAmount` sent to `createCheckoutSession`.
- `loyaltyPhone` (= `checkoutPhone`) and `loyaltyPointsRedeemed` forwarded to `createCheckoutSession`; actual decrement handled by the webhook (08-02).
- Loyalty discount line added to order total summary display in the cart panel.
- `totalAfterDiscounts` recomputed: `cartSubtotal - effectivePromo - appliedGiftDiscount - loyaltyDiscount`.

### Task 3: Gift card and pass purchase panels (app/src/pages/VenuePublic.tsx)

- **Gift card panel**: toggleable section below the menu. Amount buttons ($20/$50/$100) plus free-form input. Optional recipient name, email, and personal message. On click: `createGiftCardCheckout.mutateAsync({ venueId, amount, recipientName, recipientEmail, message, senderName })` → `window.location.href = url`.
- **Pass purchase panel**: rendered only when `passConfigQuery.data` is non-null (i.e. venue has a pass configured). Shows pass name + price + total credits. Reuses `checkoutName`/`checkoutPhone` from the order checkout fields. On click: `createPassCheckout.mutateAsync({ venueId, phone, name })` → `window.location.href = url`.
- `passConfigQuery = trpc.venue.getPassConfig.useQuery({ venueId }, { enabled: !!venue?.id })` — hides panel entirely when `null`.
- Both panels styled with warm card tokens (white bg, `#E4E4E7` border, `borderRadius: 12`, Inter font, teal accent buttons, `opacity: 0.5` disabled state).
- Neither panel creates gift card or pass DB rows directly — creation fully delegated to the signature-verified webhook (08-02).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] success_url pointed to non-existent /order-status route**
- **Found during:** Task 1 — plan context explicitly flagged this as a known issue to fix
- **Issue:** `stripe-checkout-router.ts` line 156 had `successUrl = ${env.appUrl}/${venue.slug}/order-status?session=...`. The only customer venue route in App.tsx is `/v/:slug`; there is no `/order-status` route.
- **Fix:** Changed to `${env.appUrl}/v/${venue.slug}?order=success&session={CHECKOUT_SESSION_ID}`.
- **Files modified:** app/api/stripe-checkout-router.ts
- **Commit:** 454ffbf

## Known Stubs

None. All data flows are wired to real Stripe sessions and DB operations.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: client-total-trust | app/src/pages/VenuePublic.tsx | Displayed total is client-computed (T-08-07). Stripe charges the server-built line items. Documented per plan threat model — server re-validates discount/loyalty in webhook before decrement. |

## Self-Check

- [x] app/src/pages/VenuePublic.tsx modified — createCheckoutSession, verifySession, loyalty control, gift card panel, pass panel all present
- [x] app/api/stripe-checkout-router.ts modified — success_url corrected to /v/<slug>
- [x] Commits 454ffbf (Task 1), b4420ba (Task 2), 3681a6e (Task 3) in git log
- [x] `npm run build` passed: 2497 modules, 0 errors (pre-existing chunk size warning only, unchanged from prior waves)

## Self-Check: PASSED
