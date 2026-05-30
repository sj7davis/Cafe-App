---
phase: 12
plan: "01"
subsystem: backend
tags: [trpc, orders, phone-normalisation, history]
requires: []
provides: [getOrderHistory]
affects: [venue-router.ts]
tech-stack:
  added: []
  patterns: [E.164 normalisation, inArray multi-phone lookup, single-query items join]
key-files:
  modified:
    - app/api/venue-router.ts
decisions:
  - Tried both raw + E.164-normalised phone formats via inArray to handle legacy stored formats
  - Filtered to completed orders only (no pending/cancelled noise in history)
  - Fetched all order items in a single query then grouped in JS (no N+1)
metrics:
  duration: ~10m
  completed: "2026-05-30"
---

# Phase 12 Plan 01: Backend getOrderHistory + Phone Normalisation Summary

**One-liner:** tRPC getOrderHistory query with Australian E.164 normalisation returning last 10 completed orders with items embedded in a single JOIN query.

## What Was Built

Added `getOrderHistory` to `venueRouter` in `app/api/venue-router.ts`. The query:

1. Normalises the input phone number using an inline `normalisePhone()` function that handles three Australian formats: `+61XXXXXXXXX`, `0XXXXXXXXX`, and 9-digit format.
2. De-duplicates and queries `orders` table using `inArray(orders.customerPhone, phones)` to match both stored formats.
3. Filters to `status = 'completed'` orders only.
4. Fetches all `orderItems` for the returned order IDs in a single `inArray` query (no N+1).
5. Groups items by `orderId` in JavaScript and returns a structured array: `[{ id, orderNumber, createdAt, totalAmount, status, items: [{itemName, quantity, menuItemId}] }]`.

The existing `getOrdersByPhone` query was left untouched for backward compatibility.

## Commits

- `74bd08f`: feat(12-01): add getOrderHistory tRPC query + E.164 phone normalisation

## Deviations from Plan

None — plan executed exactly as written. The `inArray` import was already present in the file's drizzle-orm imports.

## Self-Check: PASSED

- `app/api/venue-router.ts` modified with `getOrderHistory` query
- Commit `74bd08f` exists in git log
- TypeScript compiles clean (0 errors)
