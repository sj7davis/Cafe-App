# Roadmap: B1 Platform — Cafe SaaS

## Milestones

- ✅ **v1.0 Infrastructure** - Phases 1-3 (shipped 2026-05-23)
- 🚧 **v1.1 Full Feature Build** - Phases 1-6 (in progress)

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

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Owner Access & Menu Management | v1.1 | 3/3 | Complete | 2026-05-23 |
| 2. Order Tracking & Staff Dashboard | v1.1 | 3/3 | Complete | 2026-05-24 |
| 3. Customer Engagement | v1.1 | 3/3 | Complete | 2026-05-25 |
| 4. Monetisation | v1.1 | 3/3 | Complete | 2026-05-25 |
| 5. Venue Expansion | v1.1 | 3/3 | Complete | 2026-05-25 |
| 6. Marketing & Notifications | v1.1 | 3/3 | Complete | 2026-05-25 |
| 7. Dual Identity UI Refresh | v2.0 | 4/4 | Complete | 2026-05-28 |
