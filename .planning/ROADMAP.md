# Roadmap: B1 Platform — Cafe SaaS

## Milestones

- ✅ **v1.0 Infrastructure** - Phases 1-3 (shipped 2026-05-23)
- ✅ **v1.1 Full Feature Build** - Phases 1-6 (complete 2026-05-25)
- ✅ **v2.0 Dual Identity UI/UX Overhaul** - Phase 7 (complete 2026-05-28)
- 🚧 **v2.1 Revenue & Operations** - Phase 8 (in progress; Phases 9-11 absorbed into v2.2)
- 📋 **v2.2 Full Operations Suite** - Phases 9-14 (planned)

---

<details>
<summary>✅ v1.0 Infrastructure (Phases 1-3) - SHIPPED 2026-05-23</summary>

### Phase 1: Server Infrastructure

**Goal:** Replace Kimi platform scaffolding with standalone server; fix database connection.

Plans:

- [x] 1-PLAN.md: Fix env, connection, boot, context (remove Kimi OAuth dependencies)
- [x] 2-PLAN.md: Add server scripts, tsx, tsconfig-paths for server-side path aliases
- [x] 3-PLAN.md: Fix vite.config.ts proxy + path aliases for frontend

### Phase 2: API Bug Fixes

**Goal:** Fix runtime bugs that would crash the running app.

Plans:

- [x] 1-PLAN.md: Fix addLoyaltyPoints db.$executeRaw bug
- [x] 2-PLAN.md: Fix useStaffAuth logout URL, fix seed file
- [x] 3-PLAN.md: Fix billing/square routers that use db.query relational API incorrectly

### Phase 3: Database & Deployment

**Goal:** Generate migrations, update .env docs, add Railway deploy config.

Plans:

- [x] 1-PLAN.md: Generate Drizzle migrations from schema
- [x] 2-PLAN.md: Update .env.example, create Railway config, add Dockerfile
- [x] 3-PLAN.md: Final package.json scripts (build, start, seed)

</details>

---

## v1.1 Full Feature Build

**Milestone Goal:** Build all customer, staff, loyalty, and notification features to make B1 Platform a complete, production-ready cafe SaaS.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Owner Access & Menu Management** - Owner login page and full menu CRUD with image support (completed 2026-05-23)
- [x] **Phase 2: Order Tracking & Staff Dashboard** - Customer order status page and live-refreshing staff view (completed 2026-05-24)
- [x] **Phase 3: Customer Engagement** - Saved preferences at checkout and post-order review/rating flow (completed 2026-05-25)
- [x] **Phase 4: Monetisation** - Gift card purchase/redemption and subscription coffee pass (completed 2026-05-25)
- [x] **Phase 5: Venue Expansion** - Multi-location management and public catering enquiry form (completed 2026-05-25)
- [x] **Phase 6: Marketing & Notifications** - QR code generator and transactional email via Resend (completed 2026-05-25)

## Phase Details

### Phase 1: Owner Access & Menu Management

**Goal**: Returning venue owners can log in and fully manage their menu including item images
**Depends on**: v1.0 infrastructure (working JWT auth and DB connection)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, MENU-01, MENU-02, MENU-03
**Success Criteria** (what must be TRUE):

  1. A returning owner visits `/login`, enters email and password, and is redirected to `/dashboard`
  2. The `/login` page has a visible link to `/onboarding` for new registrations
  3. Owner can create, edit, and delete menu items from the dashboard without errors
  4. Owner can set an image URL on a menu item and it renders on the public venue page
  5. Venue public menu hides the image slot cleanly when no URL is set

**Plans:** 3/3 plans complete
Plans:

- [ ] 01-01-PLAN.md — Add updateMenuItem + deleteMenuItem mutations to venueRouter (backend foundation for MENU-03)
- [ ] 01-02-PLAN.md — Build /login page, register route, fix OwnerDashboard redirect (AUTH-01/02/03)
- [ ] 01-03-PLAN.md — Add MenuTab CRUD to OwnerDashboard + conditional image render in VenuePublic (MENU-01/02/03 UI)

### Phase 2: Order Tracking & Staff Dashboard

**Goal**: Customers can track their order status without logging in, and staff see new orders automatically
**Depends on**: Phase 1
**Requirements**: ORD-01, ORD-02, ORD-03, ORD-04, STAFF-01, STAFF-02, STAFF-03
**Success Criteria** (what must be TRUE):

  1. Customer opens `/order/:orderNumber` without being logged in and sees status with a visual progress indicator (pending → confirmed → ready → completed)
  2. The post-checkout screen includes a link to the order status page
  3. Order status page shows estimated pickup time and the ordered items
  4. Staff dashboard polls every 20 seconds and newly arrived orders are visually highlighted without a manual page reload
  5. Staff can type an internal note when updating an order's status

**Plans:** 3/3 plans complete
Plans:

- [x] 02-01-PLAN.md — Backend: add getOrderByNumber query and extend updateOrderStatus with staffNote + JWT verify (ORD-01/04, STAFF-03)
- [x] 02-02-PLAN.md — Customer: OrderStatus page + /order/:orderNumber route + post-checkout link (ORD-01/02/03/04)
- [x] 02-03-PLAN.md — Staff: OrdersTab polling + new-order highlight + staff-note confirm panel (STAFF-01/02/03)

### Phase 3: Customer Engagement

**Goal**: Customers get personalised checkout via saved preferences and can leave a review after order completion
**Depends on**: Phase 2
**Requirements**: PREF-01, PREF-02, PREF-03, REV-01, REV-02, REV-03, REV-04
**Success Criteria** (what must be TRUE):

  1. Customer saves milk and sugar preferences tied to their phone number at checkout
  2. Returning customer who enters the same phone number has preferences pre-filled at checkout
  3. Customer can update saved preferences and the change persists on the next visit
  4. When an order is marked `completed`, the customer receives a link to `/review/:orderId`
  5. Customer submits a 1–5 star rating with an optional comment; the venue public page shows the running average and recent reviews
  6. Owner dashboard shows all reviews with their star ratings

**Plans:** 3/3 plans complete
Plans:

- [x] 03-01-PLAN.md — Backend: add getCustomerPreferences, upsertCustomerPreferences, submitReview, listReviews to venueRouter (PREF-01/02/03, REV-02/03/04)
- [x] 03-02-PLAN.md — Customer: checkout form (phone/milk/sugar) + preference lookup on phone blur + post-order upsert in VenuePublic (PREF-01/02/03)
- [x] 03-03-PLAN.md — Reviews UI: /review/:orderId page, OrderStatus review link, VenuePublic reviews section, OwnerDashboard Reviews tab (REV-01/02/03/04)

### Phase 4: Monetisation

**Goal**: Venues can sell gift cards and subscription coffee passes as additional revenue streams
**Depends on**: Phase 2
**Requirements**: GIFT-01, GIFT-02, GIFT-03, GIFT-04, PASS-01, PASS-02, PASS-03, PASS-04
**Success Criteria** (what must be TRUE):

  1. Customer purchases a gift card for a set dollar amount and receives a unique shareable code
  2. Customer enters a gift card code at checkout and the order total is reduced by the card's balance
  3. Owner dashboard lists all active gift cards
  4. Owner configures a subscription pass (e.g. 10 coffees for $45) from the dashboard
  5. Customer purchases a pass by phone number, applies a credit at checkout, and remaining credits are displayed and decremented correctly after each use

**Plans**: TBD

### Phase 5: Venue Expansion

**Goal**: Owners manage multiple physical locations and customers can submit catering enquiries from the public page
**Depends on**: Phase 1
**Requirements**: LOC-01, LOC-02, LOC-03, LOC-04, CAT-01, CAT-02, CAT-03
**Success Criteria** (what must be TRUE):

  1. Owner can add and manage multiple locations from the dashboard
  2. Customer sees a location selector when placing an order and the chosen location is saved with the order
  3. Each location's operating hours are displayed on the public venue page
  4. Staff dashboard has a location filter so staff only see orders for their assigned location
  5. Public venue page has a catering enquiry form; submissions appear in the owner dashboard and the owner can move requests through statuses (new → quoted → confirmed → completed)

**Plans**: 1/3 complete

- [x] 05-01-PLAN.md — Backend: add location mutations, catering procedures, extend createOrder/listOrders with locationId (LOC-01, LOC-02, LOC-04, CAT-01, CAT-02, CAT-03)
- [x] 05-02-PLAN.md — OwnerDashboard UI: LocationsTab and CateringTab
- [x] 05-03-PLAN.md — VenuePublic: location hours display + catering form; StaffDashboard: location filter

### Phase 6: Marketing & Notifications

**Goal**: Owners can share a scannable QR code and customers and owners receive transactional emails for key events
**Depends on**: Phase 2, Phase 3
**Requirements**: QR-01, QR-02, QR-03, EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04
**Success Criteria** (what must be TRUE):

  1. Owner dashboard displays a QR code linking to the venue's public ordering URL and the code is downloadable as a PNG
  2. The QR code encodes the full URL directly so it works without internet access or a redirect service
  3. Customer receives an order confirmation email with order number, items, and pickup time after placing an order
  4. Venue owner receives an email alert when a new order is placed
  5. Customer receives a review request email when their order is marked `completed`
  6. Email sending is skipped gracefully when `RESEND_API_KEY` is not configured, with no server crash

**Plans**: TBD

---

## v2.0 Dual Identity UI/UX Overhaul

**Milestone Goal:** Full visual and UX redesign using a "Dual Identity" approach — operator tools get a professional SaaS shell (dark sidebar nav, dense data tables, analytics), while customer-facing pages stay warm but get a proper component refresh (better cards, mobile-first ordering, smoother flows). New features woven in where they add the most value.

### Phase 7: Dual Identity UI Refresh

**Goal**: Redesign all pages into two distinct design languages — operator SaaS shell and refreshed customer experience — plus add analytics, activity feed, and mobile ordering improvements.
**Depends on**: Phases 1–6 (all complete)
**Design Direction**: Dual Identity

- **Operator side** (OwnerDashboard, StaffDashboard, StaffLogin, KitchenDisplay, TabletPos, SuperAdmin): collapsible sidebar nav, white/slate content area, card-based analytics with charts, dark mode toggle, dense data tables
- **Customer side** (VenuePublic, VenueApp, OrderStatus, Review, GiftCardLanding, BookingPage, GroupOrder, CustomerPortal): warm aesthetic preserved, sharper type hierarchy, sticky cart UX, mobile-first layout
- **Marketing/auth** (Landing, Login, Onboarding): modern SaaS landing hero, trust-building sections, clean auth forms

**Design Tokens:**

- Operator: bg `#FAFAFA` / `#111111` (dark), sidebar `#18181B`, accent teal `#5E8B8B`, text `#09090B`
- Customer: bg `#F3F2EE`, cards `#FFFFFF`, accent from venue `accentColor`, warm neutrals
- Shared: Geist Sans headings, Geist Mono labels/stats, 4px base radius → 12px cards → 16px modals

**New Features (woven in):**

- Analytics tab in OwnerDashboard: revenue chart (7d/30d), top items by orders, hourly heatmap
- Activity feed: recent orders, new reviews, low-stock alerts in sidebar
- Sticky floating cart on VenuePublic mobile
- Order progress animation on OrderStatus page
- Empty-state illustrations throughout

**Success Criteria** (what must be TRUE):

1. OwnerDashboard has a persistent left sidebar with icon + label nav (Menu, Orders, Analytics, Staff, Bookings, Settings) that collapses to icon-only on narrow screens
2. OwnerDashboard Analytics tab shows a revenue line chart for 7d/30d and a top-5 items table
3. All operator-side pages (Staff, Kitchen, Tablet) use the same sidebar/shell component
4. VenuePublic ordering flow works smoothly on 375px mobile — cart is accessible without scrolling
5. OrderStatus shows animated step progress (Pending → Confirmed → Ready → Picked Up)
6. Landing page has a hero, feature grid, and social proof section that reads as a proper SaaS product page
7. Dark mode toggle in OwnerDashboard persists to localStorage and applies across operator pages

**Plans:**
4/4 plans executed

- [x] 07-02-PLAN.md — Re-shell OwnerDashboard with AppShell (collapsible sidebar + dark mode), add getActivityFeed + activity feed, 7d/30d analytics with top-5 table
- [x] 07-03-PLAN.md — Customer-facing refresh: VenuePublic mobile-first + sticky cart, VenueApp cards, OrderStatus animation, Review page polish
- [x] 07-04-PLAN.md — Marketing + auth refresh: Landing hero + feature grid, Login/Onboarding clean forms, StaffLogin, SuperAdmin table layout

---

## v2.1 Revenue & Operations

**Milestone Goal:** Close the revenue loop with real Stripe payments and complete the operations suite — live order streaming, staff scheduling, dine-in table ordering, bookings management, automated customer engagement, and Square POS menu sync.

### v2.1 Phase Summary

- [ ] **Phase 8: Stripe Payments & Checkout** - Real payment processing for orders, gift cards, and passes via Stripe Connect; discount codes and loyalty redemption at checkout
- [x] **Phase 9: Real-Time Orders & Staff Scheduling** - Replace 20s polling with SSE push; staff shift management with swap and time-off request workflows *(absorbed into v2.2)* (completed 2026-05-30)
- [ ] **Phase 10: Dine-In & Bookings** - Table QR ordering flow with kitchen tagging; owner reservation management dashboard *(absorbed into v2.2)*
- [ ] **Phase 11: Automated Marketing & Square POS** - Event-driven email/SMS triggers for re-engagement, birthdays, and pass expiry; Square catalog menu sync *(absorbed into v2.2)*

### v2.1 Phase Details

### Phase 8: Stripe Payments & Checkout

**Goal**: Every revenue transaction — orders, gift cards, and subscription passes — flows through real Stripe payments, and customers can reduce their total at checkout using discount codes or loyalty points
**Depends on**: Phase 7 (v2.0 UI shell in place; existing gift card and pass logic from Phase 4)
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, CHK-01, CHK-02
**Success Criteria** (what must be TRUE):

  1. Customer completes a real card payment via Stripe Checkout before an order is confirmed; the order status moves to confirmed only after Stripe sends a successful webhook
  2. Customer receives a Stripe-generated payment receipt by email after a successful order payment
  3. Customer purchases a gift card via Stripe Checkout; the card is created in the database only after payment succeeds
  4. Customer purchases a subscription coffee pass via Stripe Checkout; pass credits are created only after payment succeeds
  5. Venue owner completes Stripe Connect onboarding from the Integrations tab and their connected account ID is stored against the venue
  6. Each successful payment deducts a platform fee via Stripe Connect application fees; the fee amount is visible in the platform admin panel
  7. Venue owner can view their current Stripe payout balance and most recent payout date from the OwnerDashboard
  8. Customer can enter a discount code at checkout and, when the code is valid, the order total is reduced by the configured amount before payment
  9. Customer can choose to redeem loyalty points at checkout; the points balance is decremented and the order total is reduced accordingly

**Plans**: 4 plansPlans:
**Wave 1**

- [x] 08-01-PLAN.md — Backend: Connect application fee on order checkout + webhook persists confirmed order with line items (PAY-01/02/06)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 08-02-PLAN.md — Backend: gift card + pass Stripe checkout sessions + webhook fulfilment + loyalty redemption decrement (PAY-03/04, CHK-02)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 08-03-PLAN.md — Customer: VenuePublic Stripe redirect checkout, loyalty/discount reductions, gift card + pass purchase, return verification (PAY-01..04, CHK-01/02)
- [ ] 08-04-PLAN.md — Owner/admin: Connect onboarding + payout balance in Integrations tab, platform fee visibility in admin panel (PAY-05/06/07, CHK-01)

**UI hint**: yes

---

## v2.2 Full Operations Suite

**Milestone Goal:** Deliver the complete real-time operations layer — authenticated SSE, full KDS, dine-in QR table ordering, Deputy-style staff clock-in/out with Fair Work compliance, staff scheduling, ACCC-compliant tipping, smart upsells, customer order history, PWA, and automated marketing with Square POS sync.

**Note on phase numbering:** v2.1 Phases 9-11 were never executed and are replaced by v2.2 Phases 9-14 below. The v2.1 phase definitions above are superseded.

### v2.2 Phase Summary

- [x] **Phase 9: SSE Hardening + Full KDS + Dine-In** - Fix SSE auth gap, wire real-time push to all dashboards, route KDS at /kitchen/:slug, and add table QR ordering flow (completed 2026-05-30)
- [ ] **Phase 10: Staff Scheduling + Clock-In/Out** - Full shift management workflow plus Deputy-style PIN clock-in with Fair Work-compliant timezone handling and timesheet export
- [ ] **Phase 11: Tipping + Upsell Engine** - ACCC-compliant tip selector and co-purchase upsell panel, both completing before Stripe session creation
- [ ] **Phase 12: Customer Order History** - Phone-based order history with E.164 normalisation migration and one-tap reorder
- [ ] **Phase 13: PWA + Add to Home Screen** - vite-plugin-pwa manifest, service worker with offline menu cache, and deferred install prompt
- [ ] **Phase 14: Automated Marketing + Square POS** - Scheduled re-engagement/birthday/pass-expiry triggers and Square OAuth catalog sync

### v2.2 Phase Details

### Phase 9: SSE Hardening + Full KDS + Dine-In

**Goal**: Authenticated real-time order push reaches all operator dashboards and the kitchen display; dine-in customers can scan a table QR and place a tagged order without typing their table number
**Depends on**: Phase 8 (Stripe webhooks are the primary order-confirmed event source that SSE must broadcast)
**Requirements**: RT-01, RT-02, RT-03, RT-04, KDS-01, KDS-02, KDS-03, KDS-04, KDS-05, DINE-01, DINE-02, DINE-03
**Success Criteria** (what must be TRUE):

  1. A new order placed on VenuePublic appears on the StaffDashboard within 2 seconds via SSE — the 20-second polling timer is no longer used
  2. The SSE endpoint rejects unauthenticated connections with 401 before writing event-stream headers; a valid staff JWT is required to receive a venue's order stream
  3. Staff can access the full kitchen display at `/kitchen/:slug` without an owner login; the KDS shows open orders in three swimlane columns (New / Confirmed / Ready) that update in real time
  4. Each KDS order card shows all line items, a table number badge for dine-in orders, the order age in minutes, and turns red when the order is older than 10 minutes
  5. Staff can tap a KDS card once to advance the order to the next status; completed orders disappear from the display within 30 seconds of completion
  6. Scanning a table QR code opens the venue ordering page with the table number already filled in; dine-in orders appear in the KDS with the table number prominently labelled
  7. Venue owner can generate and download individual per-table QR codes from the Integrations tab

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 09-01-PLAN.md — Backend: authenticate SSE endpoint + add listOrdersWithItems query (RT-04, KDS-02, KDS-03, KDS-05, DINE-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 09-02-PLAN.md — Frontend: useVenueSSE hook, KDS swimlane + table badge + auto-clear, StaffDashboard SSE wiring (RT-01, RT-02, KDS-01, KDS-02, KDS-03, KDS-04, KDS-05, DINE-01, DINE-02)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 09-03-PLAN.md — OwnerDashboard: activity feed SSE wiring + per-table QR confirmed (RT-03, DINE-03)

**UI hint**: yes

### Phase 10: Staff Scheduling + Clock-In/Out

**Goal**: Venue owners can build and manage staff rosters with a full request-and-approval workflow, and staff can clock in and out from a shared tablet using a PIN with Fair Work Act-compliant timezone handling
**Depends on**: Phase 9 (SSE infrastructure stable; clock events may broadcast to OwnerDashboard)
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, SCHED-07, CLOCK-01, CLOCK-02, CLOCK-03, CLOCK-04, CLOCK-05, CLOCK-06
**Success Criteria** (what must be TRUE):

  1. Venue owner can create, edit, and delete shifts for staff members from a scheduling tab; each shift shows staff name, date, and start/end time
  2. Staff member can view their upcoming shifts from the StaffDashboard and submit their weekly availability preferences for the owner to see when building the schedule
  3. Staff member can submit a shift swap request naming another staff member; the owner can approve or deny it from the dashboard
  4. Staff member can submit a time-off request with a date range and reason; the owner can approve or deny it from the dashboard
  5. Staff member can clock in at `/clock/:slug` by entering their 4-digit PIN; the system prevents a second clock-in if they are already clocked in without having clocked out
  6. Clock-in and clock-out times are stored in UTC and displayed in the venue's configured local timezone (AEST/AEDT), so penalty rate flags reflect the correct wall-clock hour under Fair Work Act rules
  7. Staff member can record a break start and end during their shift from the clock page
  8. Venue owner can view a per-staff weekly hours summary in OwnerDashboard and export the timesheet to CSV for payroll

**Plans**: TBD
**UI hint**: yes

### Phase 11: Tipping + Upsell Engine

**Goal**: Customers are offered an ACCC-compliant tip selector and co-purchase upsell suggestions as part of the checkout flow, both presented and resolved before the Stripe session is created so all accepted items are included in a single payment
**Depends on**: Phase 8 (Stripe checkout session must not yet be created when these steps appear; tipping state already wired to stripe-checkout-router.ts)
**Requirements**: TIP-01, TIP-02, TIP-03, UPSELL-01, UPSELL-02, UPSELL-03
**Success Criteria** (what must be TRUE):

  1. A tip selector with options for 10%, 15%, 20%, custom amount, and no tip appears in the cart before the Place Order button; no option is pre-selected when the cart first appears
  2. The tip selector is hidden for dine-in orders where a table number is set, as table service makes tipping implicit
  3. Up to 3 "customers also ordered" suggestions appear inline in the cart when the cart has items; suggestions are based on co-purchase frequency from the last 90 days of orders
  4. Upsell suggestions never include items already in the cart or items marked unavailable; venues with fewer than 3 co-purchase data points fall back to featured items
  5. Accepting an upsell item adds it to the cart immediately; the Stripe checkout session is created only after the customer has seen and acted on both the tip selector and upsell panel
  6. A customer who selects "no tip" explicitly proceeds to checkout without any friction or guilt prompt

**Plans**: TBD
**UI hint**: yes

### Phase 12: Customer Order History

**Goal**: Customers can retrieve their last 10 orders at a venue using their phone number and reorder in one tap, with phone number normalisation ensuring lookup works regardless of how the number was originally entered
**Depends on**: Phase 11 (checkout flow stabilised; reorder must reproduce the cart state from Phase 11 including tip/upsell logic)
**Requirements**: HIST-01, HIST-02, HIST-03
**Success Criteria** (what must be TRUE):

  1. A customer who enters their phone number on VenuePublic sees their last 10 orders at that venue — orders placed with 0412345678, +61412345678, or 61412345678 all appear in the same history regardless of how the number was entered
  2. Customer can tap a previous order to repopulate the cart with that order's items; items that have since been deleted from the menu are skipped gracefully with a visible notice rather than causing an error
  3. Phone numbers entered in any common Australian format are normalised to E.164 (+61XXXXXXXXX) at write time; existing records in the database are migrated to the same format

**Plans**: TBD
**UI hint**: yes

### Phase 13: PWA + Add to Home Screen

**Goal**: VenuePublic is a fully-compliant Progressive Web App so customers can install it to their home screen, browse the menu offline, and get a native-app-like experience — with the install prompt deferred until after the first order so it feels earned rather than intrusive
**Depends on**: Phases 9-12 (service worker covers the full API surface built across those phases; network-only rules can be finalised once all API routes are known)
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04
**Success Criteria** (what must be TRUE):

  1. VenuePublic passes browser PWA install criteria — a valid `manifest.json` with name, icons (192px and 512px), and `start_url` is served; a registered service worker is active on the page
  2. After a customer completes their first order, an "Add to Home Screen" install prompt appears; the prompt is not shown on first page load before any order
  3. A customer who has previously visited the menu can browse all menu items and categories without a network connection; the items load from the service worker cache
  4. All `/api/` and `/trpc/` routes are handled with a network-only strategy and are never served from the service worker cache, so order state is always live

**Plans**: TBD
**UI hint**: yes

### Phase 14: Automated Marketing + Square POS

**Goal**: The platform fires targeted automated messages to customers at the right moment without manual owner action, and venue owners can import their Square menu catalog directly into B1 with a single sync trigger
**Depends on**: Phase 8 (Stripe transaction history drives re-engagement logic; pass credits drive expiry nudge), Phase 6 (Resend email infrastructure)
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, SQ-01, SQ-02, SQ-03
**Success Criteria** (what must be TRUE):

  1. A customer who has not placed an order in 30 days receives an automated re-engagement email or SMS; the trigger fires once per customer per 30-day window and not again until the window resets
  2. A customer with a birthday on file receives a birthday greeting email or SMS on their birthday; the message is not sent if the birthday field is blank
  3. A customer whose pass has exactly 1 credit remaining receives a pass-expiry nudge at the time the credit is used; the nudge is not repeated if they have already received one for the current pass
  4. Venue owner can enable or disable each automated trigger independently per venue from the Marketing tab in OwnerDashboard; a disabled trigger produces no outbound messages
  5. Venue owner can connect their Square account via OAuth from the Integrations tab; the connection status (connected / disconnected / token expiring) is visible in the dashboard
  6. After connecting Square, the owner can tap "Sync Menu" to import items from the Square catalog; matching items are updated and new items are created in B1 without duplicating existing records
  7. The Square OAuth access token is stored encrypted and refreshed automatically before expiry; the owner is never asked to re-authenticate while the token is valid

**Plans**: TBD
**UI hint**: yes

---

### Phase 15: Shopify-Style Website Builder

**Goal:** Replace the basic block editor with a full Shopify-style drag-and-drop page builder — section library, live preview, template picker, colour scheme editor, and mobile/desktop viewport toggle
**Depends on:** Phase 7 (existing WebsiteTab + websiteBlocks schema)
**Requirements:** WEB-01, WEB-02, WEB-03, WEB-04, WEB-05, WEB-06, WEB-07, WEB-08, WEB-09, WEB-10
**Success Criteria:**
1. Owner opens Website Builder tab and sees their live page rendered in an iframe/preview panel alongside a left section-stack editor
2. Owner drags a section card up or down and the preview reorders in real time
3. Owner clicks a section to open an edit panel with fields for heading, body, image URL, button label
4. Owner picks "Modern" template and the page layout and colour scheme update to the template defaults
5. Owner toggles to mobile viewport and the preview shrinks to 390px width showing mobile layout
6. Owner adds a new "Gallery" section from the section library; it appears at the bottom of the stack
7. Owner changes the accent colour; VenuePublic reflects the new colour without a deploy

**Plans:** TBD
**UI hint:** yes

---

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Owner Access & Menu Management | v1.1 | 3/3 | Complete | 2026-05-23 |
| 2. Order Tracking & Staff Dashboard | v1.1 | 3/3 | Complete | 2026-05-24 |
| 3. Customer Engagement | v1.1 | 3/3 | Complete | 2026-05-25 |
| 4. Monetisation | v1.1 | 3/3 | Complete | 2026-05-25 |
| 5. Venue Expansion | v1.1 | 3/3 | Complete | 2026-05-25 |
| 6. Marketing & Notifications | v1.1 | 3/3 | Complete | 2026-05-25 |
| 7. Dual Identity UI Refresh | v2.0 | 4/4 | Complete | 2026-05-28 |
| 8. Stripe Payments & Checkout | v2.1 | 1/4 | In Progress | - |
| 9. SSE Hardening + Full KDS + Dine-In | v2.2 | 3/3 | Complete    | 2026-05-30 |
| 10. Staff Scheduling + Clock-In/Out | v2.2 | 0/? | Not started | - |
| 11. Tipping + Upsell Engine | v2.2 | 0/? | Not started | - |
| 12. Customer Order History | v2.2 | 0/? | Not started | - |
| 13. PWA + Add to Home Screen | v2.2 | 0/? | Not started | - |
| 14. Automated Marketing + Square POS | v2.2 | 0/? | Not started | - |
| 15. Shopify-Style Website Builder | v2.2 | 0/? | Not started | - |
