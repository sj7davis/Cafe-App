---
phase: 11
plan: "01"
subsystem: backend
tags: [upsell, recommendations, co-purchase]
requirements: [UPSELL-01, UPSELL-02, UPSELL-03]
key-files:
  modified:
    - app/api/venue-router.ts
decisions:
  - Switch input from slugs[] to cartItemIds[] — direct ID lookup, no slug→ID translation needed
  - Minimum co-occurrence threshold of 3 (HAVING clause) filters noise
  - Unavailability check via LEFT JOIN on inventory rows with isAvailable=false
  - Return up to 3 suggestions sorted by co-occurrence rank
metrics:
  completed: "2026-05-30"
---

# Phase 11 Plan 01: Backend Upsell Fix Summary

Rewrote `getUpsellSuggestions` in venue-router.ts to be production-quality.

## One-liner

Co-purchase upsell endpoint: cartItemIds input, min-3 co-occurrence threshold, inventory availability filter, max-3 results.

## What was done

**Task 1 — Input schema change:** Replaced `slugs: z.array(z.string())` with `cartItemIds: z.array(z.number().int().positive())`. The frontend now passes menuItemId values directly, eliminating the slug→ID translation query.

**Task 2 — Minimum co-occurrence threshold:** Added `.having(gte(count(orderItems.menuItemId), 3))` to the GROUP BY query. Items appearing alongside cart items in fewer than 3 orders are not surfaced as suggestions.

**Task 3 — Availability filter:** After fetching candidate items, queries inventory rows with `isAvailable = false` and removes those IDs from results. Sold-out items are never shown as upsell suggestions.

**Task 4 — Return shape:** Selects specific columns (id, name, price, category, description, image, slug, venueId, dietary) to avoid returning internal fields. Returns max 3, sorted by co-occurrence rank.

## Deviations from Plan

None — plan executed exactly as described.

## Self-Check: PASSED
- venue-router.ts modified and committed (595a0d4)
- TypeScript: no errors
