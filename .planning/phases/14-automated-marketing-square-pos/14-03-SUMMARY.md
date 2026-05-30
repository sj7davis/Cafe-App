---
phase: 14
plan: "03"
subsystem: square-pos-sync
tags: [square, catalog-sync, menu-items, pos, oauth]
requirements: [SQ-01, SQ-02, SQ-03]
key-files:
  modified: []
  created: []
decisions:
  - Square catalog sync was already fully implemented in a prior phase
  - No new backend work required for Plan 14-03
metrics:
  completed: "2026-05-30"
---

# Phase 14 Plan 03: Square Catalog Sync Backend Summary

Square POS integration was already fully implemented in `app/api/square-router.ts` prior to Phase 14. All SQ-01/SQ-02/SQ-03 requirements are satisfied by existing code:

**SQ-01 — Square OAuth connect/disconnect**
- `square.getOAuthUrl` — builds OAuth URL with ITEMS_READ/ORDERS_READ/INVENTORY_READ scopes
- OAuth callback in `boot.ts` exchanges code for tokens, stores `squareAccessToken`, `squareRefreshToken`, `squareMerchantId`, `squareEnabled` on the venue row
- `square.disconnect` — clears all Square fields

**SQ-02 — Square catalog sync (menu items)**
- `square.syncMenu` — calls `GET /v2/catalog/list?types=ITEM`, upserts each item into `menuItems` table matched by `squareCatalogId`, auto-categorises coffee/pastries/bread, returns `{ imported, total }`
- `square.syncInventory` — batch-retrieves inventory counts from Square, updates `inventory` table `isAvailable` per item

**SQ-03 — Square status + UI**
- `square.status` — returns `{ connected, merchantId, locationId, tokenExpiresAt }`
- IntegrationsTab already shows "Sync Menu" / "Sync Inventory" / "Disconnect" buttons when connected, with success feedback and last-sync counts
- "Connect with Square" OAuth button shown when not yet connected

No new files created or modified for this plan — existing implementation is complete and passing TypeScript compilation.
