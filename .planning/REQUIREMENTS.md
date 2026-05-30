# B1 Platform — Requirements

## Milestone v1.1 Requirements (Complete)

### Auth & Owner Access

- [x] **AUTH-01**: Returning venue owner can log in at `/login` with email and password
- [x] **AUTH-02**: Logged-in owner is redirected to `/dashboard` after login
- [x] **AUTH-03**: Owner login page links to `/onboarding` for new registrations

---

### Customer Order Experience

- [x] **ORD-01**: Customer can view their order status at `/order/:orderNumber` without logging in
- [x] **ORD-02**: Order status page shows current status (pending → confirmed → ready → completed) with visual progress indicator
- [x] **ORD-03**: Order confirmation after checkout includes a link/button to the order status page
- [x] **ORD-04**: Customer can see estimated pickup time and order items on status page

---

### Menu & Images

- [x] **MENU-01**: Venue owner can add an image URL to a menu item from the owner dashboard
- [x] **MENU-02**: Public venue menu displays item images when available
- [x] **MENU-03**: Owner can create, edit, and delete menu items from the dashboard

---

### Staff Order Management

- [x] **STAFF-01**: Staff dashboard auto-refreshes orders every 20 seconds without manual page reload
- [x] **STAFF-02**: New incoming orders are visually highlighted when they appear
- [x] **STAFF-03**: Staff can add an internal note to an order when updating its status

---

### Customer Preferences

- [x] **PREF-01**: Customer can save milk and sugar preferences tied to their phone number at checkout
- [x] **PREF-02**: Returning customer's saved preferences are pre-filled at checkout when phone number matches
- [x] **PREF-03**: Customer can update their saved preferences

---

### Gift Cards

- [x] **GIFT-01**: Customer can purchase a gift card for a venue with a set dollar amount
- [x] **GIFT-02**: Gift card generates a unique code that can be shared with a recipient
- [x] **GIFT-03**: Customer can apply a gift card code at checkout to reduce order total
- [x] **GIFT-04**: Venue owner can view all active gift cards from the dashboard

---

### Subscription Coffee Pass

- [x] **PASS-01**: Venue owner can configure a coffee pass (e.g. 10 coffees for $45)
- [x] **PASS-02**: Customer can purchase a subscription pass by phone number
- [x] **PASS-03**: Customer can use a credit from their pass at checkout
- [x] **PASS-04**: Remaining credits are decremented correctly on each use

---

### Reviews & Ratings

- [x] **REV-01**: Customer receives a review link after their order is marked `completed`
- [x] **REV-02**: Customer can submit a star rating (1–5) and optional comment at `/review/:orderId`
- [x] **REV-03**: Venue public page displays average star rating and recent reviews
- [x] **REV-04**: Owner dashboard shows all reviews with ratings

---

### Multi-Location

- [x] **LOC-01**: Venue owner can add and manage multiple locations from the dashboard
- [x] **LOC-02**: Customer can select a pickup location when placing an order
- [x] **LOC-03**: Each location has its own hours displayed on the public venue page
- [x] **LOC-04**: Staff dashboard is filterable by location

---

### Catering Requests

- [x] **CAT-01**: Public venue page includes a catering enquiry form (name, phone, date, guest count, details)
- [x] **CAT-02**: Catering request is saved to the database and visible in the owner dashboard
- [x] **CAT-03**: Owner can update catering request status (new → quoted → confirmed → completed)

---

### QR Codes

- [x] **QR-01**: Owner dashboard generates a QR code that links to the venue's public ordering page
- [x] **QR-02**: QR code is downloadable as a PNG from the dashboard
- [x] **QR-03**: QR code works offline (encodes the full URL, not a redirect service)

---

### Email Notifications

- [x] **EMAIL-01**: Customer receives an order confirmation email with order number, items, and pickup time
- [x] **EMAIL-02**: Venue owner receives an email alert when a new order is placed
- [x] **EMAIL-03**: Customer receives a review request email when their order is marked `completed`
- [x] **EMAIL-04**: Email sending is configurable via `RESEND_API_KEY` environment variable and gracefully skipped if not set

---

---

## Milestone v2.1 Requirements — Revenue & Operations

### Payments (Stripe)

- [ ] **PAY-01**: Customer pays for an order online via Stripe Checkout before the order is confirmed
- [ ] **PAY-02**: After successful Stripe payment the order is confirmed and customer receives a receipt
- [ ] **PAY-03**: Customer can purchase a gift card via Stripe Checkout; card is created on payment success
- [ ] **PAY-04**: Customer can purchase a subscription coffee pass via Stripe Checkout
- [ ] **PAY-05**: Venue owner connects their Stripe account from the Integrations tab in OwnerDashboard
- [ ] **PAY-06**: Platform charges a fee per transaction via Stripe Connect
- [ ] **PAY-07**: Venue payouts are handled via Stripe Connect; owner can see payout status in dashboard

---

### Checkout Enhancements

- [ ] **CHK-01**: Customer can enter a discount code at checkout; valid codes reduce the order total
- [ ] **CHK-02**: Customer can redeem loyalty points for a discount at checkout

---

### Staff Scheduling

- [ ] **SCHED-01**: Venue owner can create, edit, and delete shifts for staff members
- [ ] **SCHED-02**: Staff member can view their upcoming shifts from the staff dashboard
- [ ] **SCHED-03**: Staff member can set their availability preferences (days/hours they can work)
- [ ] **SCHED-04**: Staff member can submit a shift swap request targeting another staff member
- [ ] **SCHED-05**: Venue owner can approve or deny pending swap requests from the dashboard
- [ ] **SCHED-06**: Staff member can submit a time-off request with a date range and reason
- [ ] **SCHED-07**: Venue owner can approve or deny time-off requests from the dashboard

---

### Real-Time Orders (SSE)

- [x] **RT-01**: Staff dashboard receives new orders via SSE instead of 20-second polling
- [x] **RT-02**: Kitchen display updates in real time via SSE when order status changes
- [x] **RT-03**: OwnerDashboard activity feed updates live via SSE

---

### Table Ordering / Dine-In

- [x] **DINE-01**: Scanning a table QR code pre-fills the table number in the ordering flow
- [x] **DINE-02**: Dine-in orders are tagged with a table number and visible as such in kitchen display
- [x] **DINE-03**: Venue owner can generate per-table QR codes from the Integrations tab

---

### Bookings Dashboard

- [ ] **BOOK-01**: Venue owner can view all upcoming reservations in OwnerDashboard
- [ ] **BOOK-02**: Owner can confirm, mark as seated, or cancel a reservation from the dashboard
- [ ] **BOOK-03**: Today's reservations are shown on the OwnerDashboard overview panel

---

### Automated Marketing Triggers

- [ ] **AUTO-01**: System sends a re-engagement email/SMS to customers who have not ordered in 30 days
- [ ] **AUTO-02**: System sends a birthday greeting email/SMS to customers on their birthday
- [ ] **AUTO-03**: System sends a pass-expiry nudge to customers with 1 credit remaining on their pass
- [ ] **AUTO-04**: Venue owner can enable or disable each automated trigger per venue from the dashboard

---

### Square POS Integration

- [ ] **SQ-01**: Venue owner can connect their Square account via OAuth from the Integrations tab
- [ ] **SQ-02**: Owner can trigger a menu sync that imports items from the Square catalog into B1
- [ ] **SQ-03**: Square OAuth token is stored securely and auto-refreshed before expiry

---

## Out of Scope (v2.1)

- Square order push (B1 → Square) — sync is one-way (Square → B1) for v2.1
- Native mobile app
- Web push notifications
- Corporate invoicing

---

## Milestone v2.2 Requirements — Full Operations Suite

### Kitchen Display System (KDS)

- [x] **KDS-01**: Venue owner can access a full-screen KDS at `/kitchen/:slug` without an owner login (PIN or URL token)
- [x] **KDS-02**: KDS displays open orders in swimlane columns (New → Confirmed → Ready), updating in real time via SSE
- [x] **KDS-03**: Each KDS order card shows items, table number (dine-in), order age in minutes, and colour-codes red when older than 10 minutes
- [x] **KDS-04**: Staff can tap a KDS card to advance the order to the next status in one tap
- [x] **KDS-05**: KDS filters out completed orders automatically; completed orders disappear within 30 seconds of completion

---

### Real-Time Orders via SSE

- [x] **RT-01**: Staff dashboard receives new orders via SSE instead of 20-second polling
- [x] **RT-02**: KDS updates in real time via SSE when order status changes
- [x] **RT-03**: OwnerDashboard activity feed updates live via SSE
- [x] **RT-04**: SSE endpoint is authenticated — only the venue's own orders are streamed to authenticated clients

---

### Table Ordering / Dine-In

- [x] **DINE-01**: Scanning a table QR code pre-fills the table number in the ordering flow
- [x] **DINE-02**: Dine-in orders are tagged with a table number and visible as such in the KDS
- [x] **DINE-03**: Venue owner can generate per-table QR codes from the Integrations tab

---

### Staff Scheduling

- [ ] **SCHED-01**: Venue owner can create, edit, and delete shifts for staff members
- [ ] **SCHED-02**: Staff member can view their upcoming shifts from the staff dashboard
- [ ] **SCHED-03**: Staff member can set their availability preferences (days/hours they can work)
- [ ] **SCHED-04**: Staff member can submit a shift swap request targeting another staff member
- [ ] **SCHED-05**: Venue owner can approve or deny pending swap requests from the dashboard
- [ ] **SCHED-06**: Staff member can submit a time-off request with a date range and reason
- [ ] **SCHED-07**: Venue owner can approve or deny time-off requests from the dashboard

---

### Staff Clock-In / Clock-Out

- [ ] **CLOCK-01**: Staff member can clock in using a 4-digit PIN on a shared tablet at `/clock/:slug`
- [ ] **CLOCK-02**: Clock-in/out timestamps are stored in UTC and displayed in the venue's local timezone (AEST/AEDT)
- [ ] **CLOCK-03**: System prevents double clock-in — a staff member already clocked in cannot clock in again without clocking out first
- [ ] **CLOCK-04**: Staff member can record a break (start and end) during their shift from the clock page
- [ ] **CLOCK-05**: Venue owner can view a timesheet summary (hours per staff member per week) in OwnerDashboard
- [ ] **CLOCK-06**: Venue owner can export the timesheet to CSV for payroll processing

---

### Tipping

- [ ] **TIP-01**: A tip selector (10% / 15% / 20% / custom / no tip) appears in the cart before the Place Order button
- [ ] **TIP-02**: All tip options including "No tip" start unselected by default (ACCC drip-pricing compliance)
- [ ] **TIP-03**: Tip selector is hidden for dine-in orders where table service is implicit

---

### Upsell Engine

- [ ] **UPSELL-01**: VenuePublic shows up to 3 "customers also ordered" suggestions when cart has items, based on co-purchase frequency
- [ ] **UPSELL-02**: Upsell suggestions never include items already in the cart or marked unavailable
- [ ] **UPSELL-03**: Upsell panel is shown before the Stripe checkout session is created so accepted items are included in the payment

---

### Customer Order History

- [ ] **HIST-01**: Customer can view their last 10 orders at a venue by entering their phone number on VenuePublic
- [ ] **HIST-02**: Customer can one-tap reorder from their history, which repopulates the cart with the previous order's items
- [ ] **HIST-03**: Phone numbers are normalised to a consistent format (e.g. +61XXXXXXXXX) at write time so history lookup works regardless of how the number was entered

---

### PWA / Add to Home Screen

- [ ] **PWA-01**: VenuePublic pages are served as a Progressive Web App with a valid `manifest.json` and service worker
- [ ] **PWA-02**: Customers are prompted to "Add to Home Screen" after completing their first order (not on first page load)
- [ ] **PWA-03**: Menu items are cached by the service worker so customers can browse the menu without a network connection
- [ ] **PWA-04**: All `/api/` and `/trpc/` routes are excluded from the service worker cache (network-only)

---

### Automated Marketing Triggers

- [ ] **AUTO-01**: System sends a re-engagement email/SMS to customers who have not ordered in 30 days
- [ ] **AUTO-02**: System sends a birthday greeting email/SMS to customers on their birthday
- [ ] **AUTO-03**: System sends a pass-expiry nudge to customers with 1 credit remaining on their pass
- [ ] **AUTO-04**: Venue owner can enable or disable each automated trigger per venue from the dashboard

---

### Square POS Integration

- [ ] **SQ-01**: Venue owner can connect their Square account via OAuth from the Integrations tab
- [ ] **SQ-02**: Owner can trigger a menu sync that imports items from the Square catalog into B1
- [ ] **SQ-03**: Square OAuth token is stored securely and auto-refreshed before expiry

---

## Out of Scope (v2.2)

- AI-powered upsell (ML co-occurrence) — rule-based is sufficient until v2.3 when enough order data exists
- Native iOS/Android app — PWA covers the use case
- Break pay calculation — export CSV to Xero/payroll software instead
- Web push notifications on iOS — not supported by Safari; deferred
- KDS audio alerts — requires user gesture on iOS; deferred to v2.3
- KDS item-level completion (tick off individual items) — cafe complexity, not restaurant complexity

---

### Shopify-Style Website Builder

- [ ] **WEB-01**: Venue owner can choose from at least 3 pre-built page templates (Classic, Modern, Bold) from the Website Builder tab
- [ ] **WEB-02**: Editor shows the page as a stack of section blocks — Hero, Menu Preview, About, Gallery, Reviews, CTA, Opening Hours, Contact/Map
- [ ] **WEB-03**: Owner can drag and drop sections to reorder them on the page
- [ ] **WEB-04**: Owner can click any section to open a side panel and edit its content (heading, body text, image URL, button label)
- [ ] **WEB-05**: Owner can show or hide individual sections without deleting them
- [ ] **WEB-06**: Owner can set a venue colour scheme (primary, accent, background) and font family from the editor; changes apply live in the preview
- [ ] **WEB-07**: Editor shows a live preview of the page as edits are made, switchable between desktop and mobile viewport widths
- [ ] **WEB-08**: Owner can add new sections from a section library (all available block types listed)
- [ ] **WEB-09**: Saved website configuration is reflected on the live VenuePublic customer page in real time after saving
- [ ] **WEB-10**: Owner can reset to a template default without losing their menu or venue data

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| MENU-01 | Phase 1 | Complete |
| MENU-02 | Phase 1 | Complete |
| MENU-03 | Phase 1 | Complete |
| ORD-01 | Phase 2 | Complete |
| ORD-02 | Phase 2 | Complete |
| ORD-03 | Phase 2 | Complete |
| ORD-04 | Phase 2 | Complete |
| STAFF-01 | Phase 2 | Complete |
| STAFF-02 | Phase 2 | Complete |
| STAFF-03 | Phase 2 | Complete |
| PREF-01 | Phase 3 | Complete |
| PREF-02 | Phase 3 | Complete |
| PREF-03 | Phase 3 | Complete |
| REV-01 | Phase 3 | Complete |
| REV-02 | Phase 3 | Complete |
| REV-03 | Phase 3 | Complete |
| REV-04 | Phase 3 | Complete |
| GIFT-01 | Phase 4 | Complete |
| GIFT-02 | Phase 4 | Complete |
| GIFT-03 | Phase 4 | Complete |
| GIFT-04 | Phase 4 | Complete |
| PASS-01 | Phase 4 | Complete |
| PASS-02 | Phase 4 | Complete |
| PASS-03 | Phase 4 | Complete |
| PASS-04 | Phase 4 | Complete |
| LOC-01 | Phase 5 | Complete |
| LOC-02 | Phase 5 | Complete |
| LOC-03 | Phase 5 | Complete |
| LOC-04 | Phase 5 | Complete |
| CAT-01 | Phase 5 | Complete |
| CAT-02 | Phase 5 | Complete |
| CAT-03 | Phase 5 | Complete |
| QR-01 | Phase 6 | Complete |
| QR-02 | Phase 6 | Complete |
| QR-03 | Phase 6 | Complete |
| EMAIL-01 | Phase 6 | Complete |
| EMAIL-02 | Phase 6 | Complete |
| EMAIL-03 | Phase 6 | Complete |
| EMAIL-04 | Phase 6 | Complete |
| PAY-01 | Phase 8 | Pending |
| PAY-02 | Phase 8 | Pending |
| PAY-03 | Phase 8 | Pending |
| PAY-04 | Phase 8 | Pending |
| PAY-05 | Phase 8 | Pending |
| PAY-06 | Phase 8 | Pending |
| PAY-07 | Phase 8 | Pending |
| CHK-01 | Phase 8 | Pending |
| CHK-02 | Phase 8 | Pending |
| BOOK-01 | Phase 10 (v2.1) | Pending |
| BOOK-02 | Phase 10 (v2.1) | Pending |
| BOOK-03 | Phase 10 (v2.1) | Pending |
| KDS-01 | Phase 9 | Complete |
| KDS-02 | Phase 9 | Complete |
| KDS-03 | Phase 9 | Complete |
| KDS-04 | Phase 9 | Complete |
| KDS-05 | Phase 9 | Complete |
| RT-01 | Phase 9 | Complete |
| RT-02 | Phase 9 | Complete |
| RT-03 | Phase 9 | Complete |
| RT-04 | Phase 9 | Complete |
| DINE-01 | Phase 9 | Complete |
| DINE-02 | Phase 9 | Complete |
| DINE-03 | Phase 9 | Complete |
| SCHED-01 | Phase 10 | Pending |
| SCHED-02 | Phase 10 | Pending |
| SCHED-03 | Phase 10 | Pending |
| SCHED-04 | Phase 10 | Pending |
| SCHED-05 | Phase 10 | Pending |
| SCHED-06 | Phase 10 | Pending |
| SCHED-07 | Phase 10 | Pending |
| CLOCK-01 | Phase 10 | Pending |
| CLOCK-02 | Phase 10 | Pending |
| CLOCK-03 | Phase 10 | Pending |
| CLOCK-04 | Phase 10 | Pending |
| CLOCK-05 | Phase 10 | Pending |
| CLOCK-06 | Phase 10 | Pending |
| TIP-01 | Phase 11 | Pending |
| TIP-02 | Phase 11 | Pending |
| TIP-03 | Phase 11 | Pending |
| UPSELL-01 | Phase 11 | Pending |
| UPSELL-02 | Phase 11 | Pending |
| UPSELL-03 | Phase 11 | Pending |
| HIST-01 | Phase 12 | Pending |
| HIST-02 | Phase 12 | Pending |
| HIST-03 | Phase 12 | Pending |
| PWA-01 | Phase 13 | Pending |
| PWA-02 | Phase 13 | Pending |
| PWA-03 | Phase 13 | Pending |
| PWA-04 | Phase 13 | Pending |
| AUTO-01 | Phase 14 | Pending |
| AUTO-02 | Phase 14 | Pending |
| AUTO-03 | Phase 14 | Pending |
| AUTO-04 | Phase 14 | Pending |
| SQ-01 | Phase 14 | Pending |
| SQ-02 | Phase 14 | Pending |
| SQ-03 | Phase 14 | Pending |
| WEB-01 | Phase 15 | Pending |
| WEB-02 | Phase 15 | Pending |
| WEB-03 | Phase 15 | Pending |
| WEB-04 | Phase 15 | Pending |
| WEB-05 | Phase 15 | Pending |
| WEB-06 | Phase 15 | Pending |
| WEB-07 | Phase 15 | Pending |
| WEB-08 | Phase 15 | Pending |
| WEB-09 | Phase 15 | Pending |
| WEB-10 | Phase 15 | Pending |
