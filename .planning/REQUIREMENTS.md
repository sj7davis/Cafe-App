# B1 Platform — Requirements

## Milestone v1.1 Requirements

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
- [x] **PASS-04**: Remaining credits are displayed and decremented correctly on each use

---

### Reviews & Ratings

- [x] **REV-01**: Customer receives a review link after their order is marked `completed`
- [x] **REV-02**: Customer can submit a star rating (1–5) and optional comment at `/review/:orderId`
- [x] **REV-03**: Venue public page displays average star rating and recent reviews
- [x] **REV-04**: Owner dashboard shows all reviews with ratings

---

### Multi-Location

- [x] **LOC-01**: Venue owner can add and manage multiple locations from the dashboard
- [ ] **LOC-02**: Customer can select a pickup location when placing an order
- [ ] **LOC-03**: Each location has its own hours displayed on the public venue page
- [ ] **LOC-04**: Staff dashboard is filterable by location

---

### Catering Requests

- [ ] **CAT-01**: Public venue page includes a catering enquiry form (name, phone, date, guest count, details)
- [x] **CAT-02**: Catering request is saved to the database and visible in the owner dashboard
- [x] **CAT-03**: Owner can update catering request status (new → quoted → confirmed → completed)

---

### QR Codes

- [ ] **QR-01**: Owner dashboard generates a QR code that links to the venue's public ordering page
- [ ] **QR-02**: QR code is downloadable as a PNG from the dashboard
- [ ] **QR-03**: QR code works offline (encodes the full URL, not a redirect service)

---

### Email Notifications

- [ ] **EMAIL-01**: Customer receives an order confirmation email with order number, items, and pickup time
- [ ] **EMAIL-02**: Venue owner receives an email alert when a new order is placed
- [ ] **EMAIL-03**: Customer receives a review request email when their order is marked `completed`
- [ ] **EMAIL-04**: Email sending is configurable via `RESEND_API_KEY` environment variable and gracefully skipped if not set

---

## Future Requirements (v1.2+)

- Push notification subscriptions (web push) — schema exists
- Corporate account billing and invoicing
- Referral code tracking UI
- Square POS OAuth callback UI
- Mobile app (white-label, Enterprise tier)
- S3/Cloudflare R2 image upload (replace URL input)

---

## Out of Scope (v1.1)

- Stripe payment processing — subscription tier changes are manual (admin panel)
- Square POS real-time sync — OAuth scaffolding exists, full sync deferred
- Native mobile app — web-first
- SMS notifications — email only for v1.1

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
| LOC-02 | Phase 5 | Pending |
| LOC-03 | Phase 5 | Pending |
| LOC-04 | Phase 5 | Pending |
| CAT-01 | Phase 5 | Pending |
| CAT-02 | Phase 5 | Complete |
| CAT-03 | Phase 5 | Complete |
| QR-01 | Phase 6 | Pending |
| QR-02 | Phase 6 | Pending |
| QR-03 | Phase 6 | Pending |
| EMAIL-01 | Phase 6 | Pending |
| EMAIL-02 | Phase 6 | Pending |
| EMAIL-03 | Phase 6 | Pending |
| EMAIL-04 | Phase 6 | Pending |
