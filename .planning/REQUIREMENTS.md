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

- [ ] **RT-01**: Staff dashboard receives new orders via SSE instead of 20-second polling
- [ ] **RT-02**: Kitchen display updates in real time via SSE when order status changes
- [ ] **RT-03**: OwnerDashboard activity feed updates live via SSE

---

### Table Ordering / Dine-In

- [ ] **DINE-01**: Scanning a table QR code pre-fills the table number in the ordering flow
- [ ] **DINE-02**: Dine-in orders are tagged with a table number and visible as such in kitchen display
- [ ] **DINE-03**: Venue owner can generate per-table QR codes from the Integrations tab

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
| PAY-01..07 | Phase 8 (TBD) | Planned |
| CHK-01..02 | Phase 8 (TBD) | Planned |
| SCHED-01..07 | Phase 9 (TBD) | Planned |
| RT-01..03 | Phase 10 (TBD) | Planned |
| DINE-01..03 | Phase 10 (TBD) | Planned |
| BOOK-01..03 | Phase 11 (TBD) | Planned |
| AUTO-01..04 | Phase 11 (TBD) | Planned |
| SQ-01..03 | Phase 12 (TBD) | Planned |
