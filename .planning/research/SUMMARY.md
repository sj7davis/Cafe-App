# Research Summary - B1 Platform v2.2 Full Operations Suite

**Project:** B1 Platform (Cafe SaaS)
**Domain:** Multi-tenant cafe SaaS - operator tools and customer experience additions
**Researched:** 2026-05-29
**Confidence:** HIGH (all findings based on direct codebase inspection + ecosystem patterns)

---

## Executive Summary

The v2.2 milestone adds seven features to an already substantial platform: SSE wiring to additional dashboards, a full KDS page, PWA/Add to Home Screen, staff clock-in/out, customer order history, tipping prompts, and an upsell engine. The most important finding across all four research streams is that the vast majority of this milestone is completing and wiring work that is already 50-100% built on the backend - not building from scratch. The SSE infrastructure, clock-in router, tip fields, and upsell query all exist. The primary engineering work is frontend integration and a small number of critical correctness fixes.

The recommended approach is to address correctness pitfalls before or alongside each feature, not after. Four issues are pre-ship blockers: the SSE endpoint has no authentication (leaks customer PII to anyone who knows a venueId); the KDS fires N+1 queries per order card (will hit DB connection limits under load); clock-in timezone handling uses server local time instead of venue timezone (produces wrong penalty flags); and phone number format inconsistency means order history lookups silently return empty results for returning customers. These are not performance niceties - they are data correctness and security issues that will manifest in production immediately.

Only one new npm package is needed for this entire milestone: vite-plugin-pwa. Everything else - SSE, KDS, clock-in, tipping, upsell, order history - is covered by the existing stack (React 19, Hono, tRPC, Drizzle, date-fns, input-otp, zod). One DB migration is required: adding a clockPin nullable column to staffAccounts. All other features need no schema changes.

---

## Key Findings

### Recommended Stack

The existing stack handles all v2.2 requirements without additions. date-fns 4.1.0 covers all clock-in time math. input-otp 1.4.2 covers the PIN entry UI. drizzle-orm inArray/notInArray handle the upsell co-occurrence query. The only new dependency is `vite-plugin-pwa ^0.21.0` (dev dependency) - verify Vite 6.3 compatibility before install via `npx npm-check-updates vite-plugin-pwa`.

**New dependencies:**
- `vite-plugin-pwa ^0.21.0` - PWA manifest + Workbox service worker - only new package needed

**Do NOT add:**
- `socket.io` / `ws` - SSE is sufficient; one-way push needs no WebSocket overhead
- `hono/streaming streamSSE` - existing raw ServerResponse pattern in boot.ts works and avoids adapter conflicts
- Any second date library - date-fns 4.x already installed

**DB migrations required:**
- `ALTER TABLE staff_accounts ADD COLUMN clock_pin VARCHAR(8)` - nullable, non-breaking
- Optional: composite index on `order_items(menu_item_id, order_id)` for upsell query performance at scale
- Recommended: composite index on `orders(venue_id, customer_phone)` for order history pagination

### Expected Features

**Must have (table stakes for v2.2):**
- KDS: swimlane columns (pending / in progress / ready), age-based colour coding, single-tap bump, audio alert on new order, real-time push via SSE
- Clock-in: PIN-based on shared tablet, break tracking (paid/unpaid), shift duration display, manager view of who is clocked in, daily/weekly hours summary, CSV export
- PWA: Web App Manifest, service worker with offline menu fallback, deferred install prompt, iOS meta tags
- Order history: phone-number-as-identity (no password), last 10-20 orders, one-tap reorder with deleted-item handling
- Tipping: preset percentages + custom amount, shown after cart review before Stripe redirect, dine-in skipped, No Tip always prominent
- Upsell: max 2-3 suggestions, non-intrusive inline placement, category/time-of-day rules, exclude already-carted items, co-occurrence query with editorial fallback for new venues

**Should have (differentiators at low cost):**
- KDS: recall bumped orders (accidental bump recovery), fullscreen kiosk mode
- Clock-in: staff self-service timesheet view in StaffDashboard
- Upsell: isFeatured flag on menu items so owner can curate suggestions from day one (solves cold-start problem)
- Order history: favourite order saving

**Defer to v2.3+:**
- KDS item-level completion, multi-station routing
- Clock-in geofence, photo verification, penalty rate calculator
- PWA offline ordering (IndexedDB + sync), push notifications (implement after order history ships)
- Order history PDF receipts
- Co-occurrence upsell (build after 3 months of order data exist)
- Tipping for dine-in

### Architecture Approach

Most v2.2 work touches four existing files: VenuePublic.tsx (tipping layout, upsell UI, order history panel, PWA install banner), StaffDashboard.tsx (clock tab body, SSE hook), OwnerDashboard.tsx (timesheet section, SSE hook), and venue-router.ts (add getOrderHistory, fix upsell threshold). Five new files are created: useVenueSSE.ts hook, usePwaInstall.ts hook, public/manifest.json, and two PWA icon PNGs. The KDS (KitchenDisplay.tsx) needs only a slug-based route addition - it is already a functional KDS.

**What is already fully built (do not rebuild):**
- `app/api/lib/sse-store.ts` - SSE in-memory map, broadcastToVenue(), heartbeat
- `app/api/clock-router.ts` - clockIn, clockOut, getMyStatus, getShiftHistory, getHoursSummary all implemented
- `app/src/pages/KitchenDisplay.tsx` - full KDS with SSE, three columns, audio chime, staff login gate
- `orders.tipAmount` column, stripe-checkout-router.ts tip line item logic, webhook storage
- `venue-router.ts` getUpsellSuggestions - backend query exists, needs minimum-threshold filter added
- `VenuePublic.tsx` tip UI - tip state, percentage buttons, and custom input already exist; needs layout reorder only

**Major components and integration points:**

| Component | File | Status | Work Needed |
|-----------|------|--------|-------------|
| SSE infrastructure | sse-store.ts, boot.ts | Complete | Wire to StaffDashboard + OwnerDashboard; add auth; fix heartbeat cleanup |
| KDS | KitchenDisplay.tsx | Complete | Add /kitchen/:slug route; fix N+1 items query |
| Clock-in backend | clock-router.ts | Complete | Frontend only; fix timezone + double-clock-in guard |
| Clock-in frontend | StaffDashboard.tsx | Stub (tab exists) | Implement clock tab body |
| Tipping | VenuePublic.tsx, stripe-checkout-router.ts | ~90% | Reorder JSX layout only |
| Upsell backend | venue-router.ts | Complete | Add >= 3 count threshold; add item availability filter |
| Upsell frontend | VenuePublic.tsx | State stubs only | Wire tRPC query + render panel |
| Order history | venue-router.ts, VenuePublic.tsx | No backend yet | Add getOrderHistory query; build panel; phone normalisation |
| PWA | vite.config.ts, public/ | Not started | Install plugin, manifest, icons, hook, banner |

### Critical Pitfalls

The following must be fixed concurrently with feature delivery - they are not cleanup items.

1. **SSE endpoint has no authentication** - /api/sse/orders/:venueId is open to any caller. VenueId is a sequential integer. Fix: validate a staff JWT (via ?token= query param) before writing event-stream headers. Reject with 401 before the response is opened - once SSE headers are sent the status code cannot be changed. This leaks customer names and phone numbers for any venue.

2. **KDS N+1 query per order card** - OrderCard calls trpc.venue.getOrderItemsByOrderId individually for every card rendered. With 20 active orders, 20 parallel tRPC queries fire on every listOrders invalidation. Fix: join order items into listOrders at the backend so each order includes its items in a single query.

3. **Clock-in timezone uses server local timezone** - getPenaltyFlag(clockedAt) calls clockedAt.getHours() and clockedAt.getDay() against the Node.js process timezone. Railway containers run UTC. A staff member clocking in at 10 PM AEST shows 12 (noon UTC). Fix: pass the venue timezone field from the venues schema into getPenaltyFlag and use Intl.DateTimeFormat for all wall-clock interpretations. This affects AU Fair Work penalty calculations.

4. **Phone number format inconsistency breaks order history** - Australian numbers can be stored as 0412345678, +61412345678, or 61412345678. An exact-match WHERE clause returns zero results when formats differ. Fix: normalise all phone numbers to E.164 at write time in createOrder and upsertCustomerPreferences. Apply the same normaliser to input.phone in getOrderHistory as a read-path guard.

5. **Upsell must complete before Stripe session is created** - Stripe Checkout Sessions are immutable once created. If the upsell step follows session creation, any accepted suggestion requires abandoning and recreating the session. Fix: render the upsell panel on the checkout summary screen before any Stripe redirect is initiated.

**Additional high-priority fixes (address alongside each feature):**
- Clock-in double-tap creates duplicate in events - check last event for staffId+venueId before inserting
- DST transition corrupts penalty calc wall-clock hours - same fix as timezone pitfall above
- KDS status update races the DB write - use invalidate() from SSE handler, not refetch() immediately after mutation
- KDS audio blocked on iOS Safari - create AudioContext inside the login button handler (user gesture), not on first chime
- PWA service worker must not cache tRPC/API routes - configure NetworkOnly for /api/ paths explicitly in Workbox
- Upsell must filter deleted and unavailable items server-side - join menuItems and check isAvailable

---

## Implications for Roadmap

The research points to a 5-phase build order driven by three principles: (a) fix correctness issues before or alongside each feature; (b) complete nearly-done work before starting net-new work; (c) VenuePublic checkout flow changes are grouped to avoid repeated testing of the payment path.

### Phase 1: SSE Hardening + KDS Completion
**Rationale:** SSE auth gap is a security issue that must be closed before any new dashboard wiring. The KDS N+1 query must be fixed before load testing. Both are fast to fix (under 1 day combined) and unblock everything downstream.
**Delivers:** Authenticated SSE endpoint; useVenueSSE shared hook wired to StaffDashboard and OwnerDashboard; KDS accessible via /kitchen/:slug; order items joined into listOrders; heartbeat dead-client cleanup; retry reconnect field added
**Files:** sse-store.ts, boot.ts, venue-router.ts, App.tsx, KitchenDisplay.tsx, hooks/useVenueSSE.ts (new)
**Avoids:** SSE auth leak, N+1 KDS queries, reconnect storms, memory leak from dead clients

### Phase 2: Staff Clock-In / Clock-Out
**Rationale:** Backend fully implemented. Only frontend + two correctness fixes (timezone, double-clock-in guard) remain. No dependencies on other v2.2 features. Standalone and deliverable in isolation.
**Delivers:** Clock tab body in StaffDashboard; timesheet section in OwnerDashboard; double-clock-in guard; timezone-aware penalty flags; missed clock-out detection; CSV export
**Files:** StaffDashboard.tsx, OwnerDashboard.tsx, clock-router.ts
**Schema:** ALTER TABLE staff_accounts ADD COLUMN clock_pin VARCHAR(8) (nullable, non-breaking)
**Avoids:** Timezone penalty errors (Fair Work critical), double clock-in audit noise, missed shifts silently zeroed

### Phase 3: Checkout Revenue Features (Tipping + Upsell)
**Rationale:** Tipping is a layout reorder only - backend 100% complete. Upsell backend exists but needs threshold fix and frontend wiring. Grouping them means the checkout flow in VenuePublic.tsx is tested once end-to-end. Both must complete before Stripe session is created.
**Delivers:** Tip selector prominently placed before checkout button; upsell panel inline in cart with co-occurrence + editorial fallback; upsell >= 3 threshold and availability filter; Stripe session created only after both steps complete
**Files:** VenuePublic.tsx, venue-router.ts
**Avoids:** Pre-selected tip dark pattern (ACCC risk), upsell triggering Stripe session recreation, recommending deleted items, showing items already in cart

### Phase 4: Customer Order History
**Rationale:** Depends on a stable checkout flow (Phase 3) for the reorder flow to be testable. Phone normalisation requires a migration that should run after the app is otherwise stable.
**Delivers:** getOrderHistory tRPC query; phone normalisation at write + read time; order history panel in VenuePublic on phone blur; one-tap reorder with deleted-item graceful handling; composite index on (venue_id, customer_phone)
**Files:** venue-router.ts, VenuePublic.tsx
**Schema:** Index orders(venue_id, customer_phone) (additive); phone normalisation migration for existing records
**Avoids:** Silent empty results for returning customers, cross-venue PII leak, reorder crashing on deleted items

### Phase 5: PWA + Add to Home Screen
**Rationale:** Self-contained feature with no dependencies on other v2.2 features. Left last so Workbox config can be tested against the full API surface built in Phases 1-4.
**Delivers:** vite-plugin-pwa installed; manifest.json with venue branding; 192px + 512px PNG icons; usePwaInstall hook; deferred install banner in VenuePublic (triggered after first order); iOS meta tags; NetworkOnly Workbox rule for all /api/ routes
**Files:** vite.config.ts, public/manifest.json, public/icons/ (new), hooks/usePwaInstall.ts (new), VenuePublic.tsx, index.html
**Avoids:** API route caching (stale orders), early install prompt dismissal, broken offline routing across venues, icon size silent failure

### Phase Ordering Rationale

- Phase 1 before everything: SSE auth is an open security gap; no new SSE consumers should be wired before it is closed
- Phase 2 is independent: clock-in has no dependency on phases 3-5 and can be developed in parallel if team size allows
- Phases 3 and 4 are ordered by data dependency: order history reorder flow must handle the checkout flow changes from Phase 3 correctly
- Phase 5 last: service worker configuration should wrap a stable API surface so Workbox caching rules can be tested against the full feature set

### Research Flags

Phases with standard patterns (no deeper research needed):
- **Phase 1 (SSE hardening):** All patterns already in the codebase. Auth pattern same as existing tRPC JWT guards.
- **Phase 2 (Clock-in frontend):** Backend complete. Standard tRPC mutation + form pattern. Intl.DateTimeFormat timezone fix is well-documented.
- **Phase 3 (Tipping):** Layout change only. No research needed.
- **Phase 5 (PWA):** vite-plugin-pwa has official docs. Workbox config is well-documented.

Phase that may benefit from a targeted research pass before execution:
- **Phase 4 (Order history - phone normalisation migration):** Write and test the E.164 normalisation function against real customerPhone values from the production DB before running the backfill migration.

---

## Surprises - Things Already Built That Developers Might Not Know About

1. **KitchenDisplay.tsx is a complete KDS.** Three swimlane columns, SSE subscription, Web Audio chime, staff login gate - all working. Only changes needed: slug-based route and N+1 query fix. Do not build a new KDS from scratch.

2. **The entire clock-in/out backend is implemented.** clock-router.ts has clockIn, clockOut, getMyStatus, getShiftHistory, and getHoursSummary including AU penalty rate flags. staffClockEvents table exists with correct schema. Frontend is the only missing piece.

3. **Tipping is around 90% complete.** VenuePublic.tsx already has tipOption state, percentage buttons, custom input, and passes tipAmount to Stripe. The orders.tipAmount column exists and the webhook stores it correctly. Only a JSX layout reorder is needed.

4. **getUpsellSuggestions exists in venue-router.ts.** The co-occurrence query against the last 90 days of order history is already written. It needs a minimum count threshold (>= 3) and an item availability filter, then the frontend wires the query and renders the panel.

5. **SSE broadcastToVenue is already called from the Stripe webhook.** Any new mutation that changes order status (e.g. staff bumping a KDS card) also needs to call broadcastToVenue - but the infrastructure requires no changes, just new call sites.

6. **input-otp 1.4.2 is already installed.** Likely used for 2FA elsewhere. Use InputOTP maxLength={4} directly for the clock-in PIN entry UI - no new component library needed.

7. **usePushSubscription.ts already exists.** Web Push infrastructure is partially in place. iOS Safari in-browser push is not supported (only works in iOS 16.4+ PWA installed to home screen). Design SSE as the primary real-time channel; push as secondary/optional.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct package.json and file inspection. Only caveat: verify vite-plugin-pwa version for Vite 6.3 before install. |
| Features | HIGH | KDS/POS patterns (Square, Toast), AU employment law (Fair Work 38h/week), Chrome PWA install UX all well-documented. AU tipping/ACCC angle is MEDIUM - inferred from broader drip pricing position. |
| Architecture | HIGH | Direct inspection of KitchenDisplay.tsx, StaffDashboard.tsx, OwnerDashboard.tsx, VenuePublic.tsx, clock-router.ts, venue-router.ts, sse-store.ts, boot.ts, schema.ts. |
| Pitfalls | HIGH | SSE auth gap, N+1 query, timezone issue, phone normalisation all confirmed by reading the actual code. Not inferred. |

**Overall confidence:** HIGH

### Gaps to Address During Implementation

- **vite-plugin-pwa version:** Verify Vite 6.3.5 compatibility before npm install. Run npx npm-check-updates vite-plugin-pwa or check the plugin CHANGELOG for the Vite 6 support entry.
- **Phone normalisation migration:** Write and test E.164 normalisation against real customerPhone values from production DB before running the backfill. Confirm no unexpected formats are stored.
- **Clock-in PIN storage:** Research recommends storing plain 4-digit PINs (not bcrypt-hashed) given the internal nature of a clock-in PIN. Confirm this is acceptable before shipping - bcrypt is already installed if hashing is required.
- **StaffDashboard clock tab body:** Architecture notes the clock tab exists in buildTabs() but the render content must be checked before building to avoid duplicating partially-written UI.

---

## Sources

### Primary (HIGH confidence - direct codebase inspection)
- app/api/lib/sse-store.ts - SSE map structure, broadcastToVenue signature
- app/api/boot.ts lines 361-384 - SSE endpoint; lines 586, 612 - webhook broadcast
- app/api/clock-router.ts - full clock-in/out backend
- app/db/schema.ts - staffClockEvents, staffAccounts, orders, orderItems, venues.timezone
- app/api/stripe-checkout-router.ts line 75 - tip amount handling
- app/api/venue-router.ts lines 1754-1793 - getUpsellSuggestions
- app/src/pages/KitchenDisplay.tsx lines 56-77 - SSE consumer, audio chime
- app/src/pages/VenuePublic.tsx lines 248-249, 730-733, 1709-1767, 1864-1867 - tip state and UI
- app/package.json - confirmed date-fns 4.1.0, input-otp 1.4.2, zod 4.3.5

### Secondary (HIGH confidence - well-documented public sources)
- Square KDS product documentation - swimlane pattern, bump interaction, auto-complete
- Toast KDS feature set - audio alerts, tip prompt behaviour for dine-in
- Deputy and Tanda AU - PIN clock-in pattern, break tracking requirements
- Fair Work Act 2009 (Cth) - 38h/week ordinary hours threshold
- Chrome Web.dev PWA install prompt best practices - deferred prompt timing
- Starbucks and McDonald app patterns - order history, one-tap reorder, phone-as-identity
- Shopify Frequently Bought Together - upsell placement, 3-item maximum

### Tertiary (MEDIUM confidence - inferred or unverified)
- ACCC drip pricing position applied to pre-selected tips - inferred from broader 2022-2024 ACCC digital platform scrutiny; not a specific tip ruling
- vite-plugin-pwa 0.21.x compatibility with Vite 6.3 - based on known release history; verify before install

---
*Research completed: 2026-05-29*
*Ready for roadmap: yes*
