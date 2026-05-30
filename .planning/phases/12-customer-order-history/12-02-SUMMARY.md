---
phase: 12
plan: "02"
subsystem: frontend
tags: [react, trpc, order-history, reorder, cart]
requires: [getOrderHistory]
provides: [order-history-panel, one-tap-reorder]
affects: [VenuePublic.tsx]
tech-stack:
  added: [History icon, ChevronDown icon (lucide-react)]
  patterns: [collapsible panel, auto-query on phone length, reorder-by-menuItemId-or-name]
key-files:
  modified:
    - app/src/pages/VenuePublic.tsx
decisions:
  - Panel auto-queries when checkoutPhone.length >= 8 (same threshold as loyalty query)
  - Panel stays collapsed by default; user taps header to expand
  - Reorder matches items by menuItemId first, falls back to name (handles renamed items gracefully)
  - Iterates quantity times for proper addToCart behaviour (preserves existing cart logic)
  - Truncates items display to first 3 + "and N more" to keep cards compact
metrics:
  duration: ~15m
  completed: "2026-05-30"
---

# Phase 12 Plan 02: VenuePublic Order History Panel + One-Tap Reorder Summary

**One-liner:** Collapsible "Your recent orders" panel in the cart drawer that auto-loads completed order history by phone and provides one-tap reorder into the live cart.

## What Was Built

In `app/src/pages/VenuePublic.tsx`:

1. Added `History` and `ChevronDown` to the lucide-react import line.
2. Added `showOrderHistory` state (boolean, collapsed by default).
3. Added `orderHistoryPanelQuery` using `trpc.venue.getOrderHistory.useQuery` — enabled when `checkoutPhone.length >= 8`.
4. Added `HistoryOrder` type definition and `handleReorder()` function that iterates order items, finds matching menu items by `menuItemId` or `name`, and calls `addToCart()` `quantity` times each.
5. Inserted a history panel block between the phone input closing tag and the push-notification checkbox in the cart drawer checkout form. The panel:
   - Only renders when `checkoutPhone.length >= 8` AND `historyOrders.length > 0`.
   - Shows a collapsible header: "Your recent orders (N)" with a rotating chevron.
   - When expanded, renders each completed order as a card with: date, order number (right-aligned total), truncated items (3 max + "and N more"), and a "Reorder" button.
   - Warm aesthetic: `#F8F6F2` background, teal accent border, 12px border-radius.

## Commits

- `f9a91d6`: feat(12-02): customer order history panel + one-tap reorder in VenuePublic

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — data is fully wired to the `getOrderHistory` tRPC endpoint.

## Self-Check: PASSED

- `app/src/pages/VenuePublic.tsx` modified with history panel
- Commit `f9a91d6` exists in git log
- TypeScript compiles clean (0 errors)
- Both commits pushed to `origin/main`
