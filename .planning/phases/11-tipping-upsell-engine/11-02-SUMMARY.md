---
phase: 11
plan: "02"
subsystem: frontend
tags: [tipping, upsell, ACCC, cart-drawer, VenuePublic]
requirements: [TIP-01, TIP-02, TIP-03, UPSELL-01, UPSELL-02, UPSELL-03]
key-files:
  modified:
    - app/src/pages/VenuePublic.tsx
decisions:
  - tipOption initial state: null (not 0) — ACCC requires no pre-selection of tip
  - No Tip button added as explicit opt-out, same visual weight as percentage buttons
  - Upsell moved from auto-dismissing floating sheet to persistent in-drawer panel
  - Upsell query enabled conditionally on showCart + cartItemIds.length > 0
  - Dine-in tip hiding: entire tip block wrapped in orderType !== 'dine-in' guard
metrics:
  completed: "2026-05-30"
---

# Phase 11 Plan 02: VenuePublic Tipping + Upsell UI Summary

ACCC-compliant tip selector and in-drawer upsell panel, both resolved before Stripe session creation.

## One-liner

Tip selector starts unselected with explicit No Tip opt-out, hidden for dine-in; upsell panel shows co-purchase suggestions persistently inside cart drawer before checkout.

## What was done

### Tipping (TIP-01, TIP-02, TIP-03)

**TIP-01 — Tip appears before Place Order button:** Tip section is inside the cart drawer form, above the total summary and Place Order button. Upsell panel appears before the tip section, so the order in the drawer is: cart items → checkout form → upsell suggestions → tip → total → Place Order.

**TIP-02 — ACCC compliance (no pre-selection):** Changed `tipOption` state type from `0 | 10 | 15 | 20 | 'custom'` to `null | 10 | 15 | 20 | 'custom'`, initial value `null`. The `tipAmount` calculation treats `null` as 0 for total display. No option is visually highlighted until the customer makes a choice.

**TIP-03 — No Tip button + dine-in hide:** Added a "No Tip" button with identical styling to the percentage buttons (same visual weight, same border treatment). The entire tip block is conditionally rendered with `{orderType !== 'dine-in' && (…)}` — tip is completely hidden for dine-in table orders.

### Upsell (UPSELL-01, UPSELL-02, UPSELL-03)

**UPSELL-01 — Customers also ordered panel:** Replaced the floating auto-dismissing bottom sheet with a persistent panel inside the cart drawer. The panel appears above the tip selector when upsell data is available.

**UPSELL-02 — Max 3, exclude cart items:** Backend now returns max 3 items excluding cart items (handled in 11-01 backend fix). Frontend renders all returned items (already capped at 3).

**UPSELL-03 — Before checkout button:** Upsell panel position in drawer: after cart items list, before tip selector, before Place Order — customers can add upsell items before Stripe session is created.

**Add button:** Calls `addToCart(mi)` using the same function as the main menu.

**Query:** Updated from `{ slugs: cartSlugs }` to `{ cartItemIds: cartItemIdList }`, enabled when `showCart && cartItemIdList.length > 0`.

## Deviations from Plan

**[Rule 3 - Auto-fix] Removed floating upsell bottom sheet**
- The existing floating upsell sheet used the old slugs-based query and conflicted with the new in-drawer design.
- Removed both the floating sheet JSX and the `addToCart` setTimeout trigger that powered it.
- State variables `showUpsell`, `shownUpsell`, `upsellDismissTimer` remain in file but are now unused (harmless dead state).

## Self-Check: PASSED
- VenuePublic.tsx modified and committed (f4ca858)
- TypeScript: no errors (tsc --noEmit clean)
- Pushed to origin/main
