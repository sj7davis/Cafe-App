---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Operations Suite
status: ready_to_plan
last_updated: 2026-05-30T02:33:42.364Z
last_activity: 2026-05-30 -- Phase 9 execution started
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 3
  completed_plans: 29
  percent: 0
stopped_at: Phase 9 complete (3/3) — ready to discuss Phase 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Every cafe gets a branded online ordering site, real-time Square POS sync, staff management, and loyalty programs — all from one deployable app.
**Current focus:** Phase 10 — staff scheduling + clock in/out

## Current Position

Phase: 10
Plan: Not started
Status: Ready to plan
Last activity: 2026-05-30

## Performance Metrics

**Velocity:**

- Total plans completed: 18
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 3 | - | - |
| 03 | 3 | - | - |
| 04 | 3 | - | - |
| 05 | 3 | - | - |
| 06 | 3 | - | - |
| 9 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: n/a
- Trend: n/a

*Updated after each plan completion*
| Phase 01-owner-access-menu-management P01 | 8 | 2 tasks | 1 files |
| Phase 01 P02 | 131 | 2 tasks | 3 files |
| Phase 01 P03 | 7 | 2 tasks | 2 files |
| Phase 02-order-tracking-staff-dashboard P01 | 6 | 2 tasks | 1 files |
| Phase 02-order-tracking-staff-dashboard P02 | 15 | 3 tasks | 3 files |
| Phase 02-order-tracking-staff-dashboard P03 | 15 | 2 tasks | 1 files |
| Phase 03-customer-engagement P01 | 12 | 2 tasks | 1 files |
| Phase 03-customer-engagement P02 | 15 | 2 tasks | 1 files |
| Phase 03-customer-engagement P03 | 481 | 5 tasks | 5 files |
| Phase 04-monetisation P01 | 15 | 2 tasks | 1 files |
| Phase 05-venue-expansion P01 | 8 | 3 tasks | 1 files |
| Phase 05-venue-expansion P02 | 363 | 3 tasks | 1 files |
| Phase 05-venue-expansion P03 | 15 | 4 tasks | 2 files |
| Phase 06-marketing-notifications P01 | 12 | 4 tasks | 8 files |
| Phase 06-marketing-notifications P02 | 12 | 2 tasks | 1 files |
| Phase 06-marketing-notifications P03 | 8 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.0 complete: app is standalone, deployable to Railway
- v1.1: email via Resend (RESEND_API_KEY), QR codes via `qrcode` npm package
- Staff order polling every 20s (WebSocket deferred — overkill for MVP)
- Menu images via URL input first; S3/Cloudflare R2 deferred to v1.2+
- DB schema already has tables for all v1.1 features — no new migrations expected for schema shape, only logic
- [Phase 01-owner-access-menu-management]: deleteMenuItem returns CONFLICT TRPCError instead of raw MySQL FK crash; FK guard queries orderItems before delete
- [Phase 01-owner-access-menu-management]: Authed mutation pattern established: jwtVerify + venueId ownership check + business logic
- [Phase 01]: Used react-router Link for /onboarding link in Login.tsx (not anchor) per react-router v7 pattern
- [Phase 01]: OwnerDashboard Login Required CTA changed from navigate('/onboarding') to navigate('/login')
- [Phase 01-03]: MenuTab uses union mode state ('list' | 'create' | { type: 'edit'; id: number }) to co-locate edit item ID with mode
- [Phase 01-03]: Image onError collapses slot via direct DOM style mutation (no React state re-render needed)
- [Phase 01-03]: Menu tab positioned second (after Overview) in dashboard tab strip
- [Phase 02-order-tracking-staff-dashboard]: getOrderByNumber is fully public — orderNumber serves as the access credential (no token param)
- [Phase 02-order-tracking-staff-dashboard]: staffNote stripped from public getOrderByNumber response via destructuring to prevent data leakage
- [Phase 02-order-tracking-staff-dashboard]: updateOrderStatus now requires valid staff JWT before any db write (security fix from unverified state)
- [Phase 02-order-tracking-staff-dashboard]: staffNote on updateOrderStatus is optional and only added to updateData when explicitly provided — avoids null overwrite
- [Phase 02-02]: placedOrderNumber replaces orderSuccess boolean — persistent until user dismisses, no setTimeout; keeps drawer open post-checkout so confirmation panel is visible
- [Phase 02-03]: knownIds tracked via useRef so baseline updates do not trigger re-renders; newOrderIds useState Set drives amber highlight re-renders
- [Phase 02-03]: staffNote passed as undefined (not empty string) when textarea blank — preserves backend "only update when provided" contract
- [Phase 02-03]: Confirm-gate pattern: select picks value, opens panel with textarea, Confirm fires mutation — prevents accidental status changes
- [Phase 03-customer-engagement]: submitReview derives venueId from order row — client never trusted for ownership data
- [Phase 03-customer-engagement]: upsertCustomerPreferences uses SELECT-then-INSERT/UPDATE pattern (schema has no unique index on venueId+phone)
- [Phase 03-customer-engagement]: Duplicate review guard via application-level SELECT since schema has no unique constraint on orderId
- [Phase 03-customer-engagement]: prefQuery uses enabled:false + refetch() in handlePhoneBlur — not reactive enabled flag — to prevent lookup on every keystroke
- [Phase 03-customer-engagement]: upsertPreferences fires only in createOrder.onSuccess when phone is set AND preference chosen — never before order placement
- [Phase 03-customer-engagement]: Milk/sugar stored as exact string values matching DB schema; sugar as string '0'/'0.5'/'1'/'2'/'3'
- [Phase 03-customer-engagement]: parseInt(orderId,10) coercion in Review.tsx — not Number() per documented pitfall
- [Phase 03-customer-engagement]: Reviews section on VenuePublic hidden entirely when empty — no 'no reviews' heading rendered
- [Phase 04-monetisation]: Gift card code generated via randomBytes(8).toString('base64url').toUpperCase().slice(0,12)
- [Phase 04-monetisation]: passConfig stored in venues.settingsJson as nested object — no new DB table required
- [Phase 04-monetisation]: usePassCredit uses sql template for atomic decrement to prevent race conditions
- [Phase 04-02]: createOrder computes totalAmount server-side; gift card discount recorded as orderNote field, not a totalAmount override
- [Phase 04-02]: effectiveTotal derived at render time (not inside handlePlaceOrder) to avoid stale state reads per Pitfall 6
- [Phase 04-02]: usePassCreditMutation fires in createOrder.onSuccess only — never before order confirmation
- [Phase 04-03]: GiftCardsTab reads token from localStorage (not venueId prop) — listGiftCards is owner-authed by JWT server-side
- [Phase 04-03]: Number() coercion for card.amount and card.balance (MySQL DECIMAL returns as string)
- [Phase 04-03]: Issue Pass form disabled when no passConfig — prevents orphaned pass creation
- [Phase 05-venue-expansion]: deleteLocation enforces FK guard in application code (orders.locationId has no DB-level FK constraint)
- [Phase 05-venue-expansion]: submitCateringRequest is public (no JWT) — customer-facing form submission
- [Phase 05-venue-expansion]: locationId optional in createOrder/listOrders to preserve backwards compatibility with existing clients
- [Phase 05-venue-expansion]: LocationsTab uses union-mode CRUD state matching MenuTab Phase 01-03 pattern
- [Phase 05-venue-expansion]: CateringTab confirm-gate matches Phase 02-03 StaffDashboard pattern; CATERING_STATUS_NEXT map enforces forward-only progression
- [Phase 05-venue-expansion]: Location selector only shown for multi-location venues; single location auto-selected silently via useEffect
- [Phase 05-venue-expansion]: Per-location hours replace venue-level hours section when locations exist; venue-level block preserved as fallback
- [Phase 06-marketing-notifications]: resendApiKey uses || empty string not required() — server never crashes without the key; sendEmail catches errors without rethrowing — order mutations unaffected by email failures
- [Phase 06-marketing-notifications]: IntegrationsTab accepts venue as { slug, name } | null prop; QRCode.toDataURL called in useEffect with [venue?.slug] dependency; programmatic anchor click for data URL download
- [Phase 06-marketing-notifications]: checkoutEmail || undefined coercion in createOrder.mutate — empty string not sent to server z.string().email() validator
- [v2.2 roadmap]: SSE endpoint unauthenticated — must be fixed in Phase 9 before wiring new consumers (security blocker confirmed by research)
- [v2.2 roadmap]: KDS N+1 query confirmed — fix in Phase 9 alongside KDS route addition
- [v2.2 roadmap]: Clock-in timezone uses server UTC not venue timezone — Fair Work Act blocker; fix in Phase 10
- [v2.2 roadmap]: Phone normalisation required before order history — E.164 migration scoped to Phase 12
- [v2.2 roadmap]: Only new npm package for entire v2.2 milestone is vite-plugin-pwa ^0.21.0 (verify Vite 6.3 compat before install)
- [v2.2 roadmap]: No new DB tables needed; only migration is ALTER TABLE staff_accounts ADD COLUMN clock_pin VARCHAR(8)

### Pending Todos

- Verify vite-plugin-pwa ^0.21.0 compatibility with Vite 6.3.5 before Phase 13 install
- Test E.164 phone normalisation function against production customerPhone values before running Phase 12 backfill migration
- Confirm clock-in PIN storage approach (plain 4-digit vs bcrypt) before Phase 10 ships

### Blockers/Concerns

None — Phase 8 (Stripe) in progress; v2.2 phases unblocked and ready to plan once Phase 8 completes.

## Session Continuity

Last session: 2026-05-25T01:53:00Z
Stopped at: Completed 06-03-PLAN.md
Resume file: None
