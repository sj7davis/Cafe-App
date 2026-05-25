---
phase: 04-monetisation
plan: 01
subsystem: api
tags: [trpc, drizzle, mysql, gift-cards, subscription-passes, jwt, crypto]

# Dependency graph
requires:
  - phase: 03-customer-engagement
    provides: venueRouter pattern, jwtVerify auth pattern, sql template atomic updates
provides:
  - createGiftCard tRPC procedure (JWT-authed, 12-char uppercase code generation)
  - listGiftCards tRPC procedure (JWT-authed, owner list)
  - redeemGiftCard tRPC procedure (public, atomic balance update)
  - upsertPassConfig tRPC procedure (JWT-authed, settingsJson merge)
  - getPassConfig tRPC procedure (public, settingsJson read)
  - purchasePass tRPC procedure (JWT-authed, reads passConfig from venue)
  - getPassByPhone tRPC procedure (public, active pass lookup)
  - usePassCredit tRPC procedure (public, atomic sql decrement)
affects: [04-02-checkout-ui, 04-03-owner-dashboard-ui]

# Tech tracking
tech-stack:
  added: [Node.js built-in crypto (randomBytes)]
  patterns:
    - generateGiftCardCode uses randomBytes(8).toString('base64url').toUpperCase().slice(0,12) for URL-safe 12-char codes
    - redeemGiftCard normalises code to uppercase before DB lookup
    - Number(card.balance) coercion before decimal arithmetic
    - settingsJson passConfig stored as nested JSON in venues.settingsJson with spread-merge pattern
    - usePassCredit uses sql`remaining_credits - 1` for atomic decrement (no JS arithmetic)
    - isActive set to false when newCredits reaches 0

key-files:
  created: []
  modified:
    - app/api/venue-router.ts

key-decisions:
  - "Gift card code generated via randomBytes(8).toString('base64url').toUpperCase().slice(0,12) — 12 chars, URL-safe, uppercase"
  - "redeemGiftCard is fully public (no JWT) — venueId + code is sufficient credential at checkout"
  - "usePassCredit uses sql template for atomic decrement to prevent race conditions when credits are consumed"
  - "passConfig stored in venues.settingsJson as a nested object — no new DB table needed"
  - "isActive set to false when remainingCredits reaches 0 rather than relying on credits check alone"

patterns-established:
  - "Pattern: settingsJson merge — read existing JSON, spread with new passConfig key, write back"
  - "Pattern: Decimal balance arithmetic — always coerce to Number() before operations, convert back to toFixed(2) string for storage"
  - "Pattern: Optional-chain safety on settingsJson — (venue.settingsJson as any)?.passConfig ?? null"

requirements-completed: [GIFT-01, GIFT-02, GIFT-03, GIFT-04, PASS-01, PASS-02, PASS-03, PASS-04]

# Metrics
duration: 15min
completed: 2026-05-25
---

# Phase 4 Plan 01: Monetisation Backend Procedures Summary

**Eight tRPC procedures powering gift cards and subscription passes — JWT-auth mutations, public query endpoints, atomic sql decrement, and settingsJson passConfig pattern**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-25T00:37:14Z
- **Completed:** 2026-05-25T00:52:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added three gift card procedures: createGiftCard (JWT + code gen), listGiftCards (JWT + ordered), redeemGiftCard (public, atomic balance update, uppercase normalisation)
- Added five subscription pass procedures: upsertPassConfig (JWT + settingsJson merge), getPassConfig (public), purchasePass (JWT + passConfig read), getPassByPhone (public, active filter), usePassCredit (public, atomic sql decrement)
- TypeScript compiles clean with no new errors; Vite build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Add gift card procedures (createGiftCard, listGiftCards, redeemGiftCard)** - `0266943` (feat)
2. **Task 2: Add subscription pass procedures (upsertPassConfig, getPassConfig, purchasePass, getPassByPhone, usePassCredit)** - `22cbecb` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `app/api/venue-router.ts` - Added 8 new tRPC procedures, giftCards + subscriptionPasses imports, randomBytes import, generateGiftCardCode helper function

## Decisions Made
- Gift card code generated via `randomBytes(8).toString('base64url').toUpperCase().slice(0,12)` — 12 chars, URL-safe, cryptographically random
- `redeemGiftCard` is fully public (no JWT) — venueId + code is sufficient credential at checkout
- `usePassCredit` uses `sql\`remaining_credits - 1\`` for atomic decrement to prevent race conditions
- `passConfig` stored in `venues.settingsJson` as nested object — no new DB table required (schema already designed this way)
- `isActive` explicitly set to false when `newCredits` reaches 0 during `usePassCredit`

## Deviations from Plan

None — plan executed exactly as written. Implementation matched all interface contracts and acceptance criteria verbatim.

Note: `npm run typecheck` script does not exist in this project; used `npx tsc --noEmit` instead (0 errors). Build succeeded via `npm run build`.

## Issues Encountered
- `npm run typecheck` not defined in package.json scripts — used `npx tsc --noEmit` as equivalent, confirmed 0 errors.
- Project root is at `app/` subdirectory (not repo root) — all npm commands run from `app/`.

## User Setup Required
None — no external service configuration required. All procedures use existing DB tables and JWT secret.

## Next Phase Readiness
- All eight tRPC backend contracts are fixed and typed. Plans 02 (checkout UI) and 03 (owner dashboard UI) can now be implemented in parallel.
- `trpc.venue.createGiftCard`, `trpc.venue.redeemGiftCard`, and `trpc.venue.usePassCredit` are the primary procedures consumers need.
- No blockers.

---
*Phase: 04-monetisation*
*Completed: 2026-05-25*
