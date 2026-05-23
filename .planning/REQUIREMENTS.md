# B1 Platform — Requirements

## Milestone v1.1 Requirements

### Auth & Owner Access

- [ ] **AUTH-01**: Returning venue owner can log in at `/login` with email and password
- [ ] **AUTH-02**: Logged-in owner is redirected to `/dashboard` after login
- [ ] **AUTH-03**: Owner login page links to `/onboarding` for new registrations

---

### Customer Order Experience

- [ ] **ORD-01**: Customer can view their order status at `/order/:orderNumber` without logging in
- [ ] **ORD-02**: Order status page shows current status (pending → confirmed → ready → completed) with visual progress indicator
- [ ] **ORD-03**: Order confirmation after checkout includes a link/button to the order status page
- [ ] **ORD-04**: Customer can see estimated pickup time and order items on status page

---

### Menu & Images

- [ ] **MENU-01**: Venue owner can add an image URL to a menu item from the owner dashboard
- [ ] **MENU-02**: Public venue menu displays item images when available
- [x] **MENU-03**: Owner can create, edit, and delete menu items from the dashboard

---

### Staff Order Management

- [ ] **STAFF-01**: Staff dashboard auto-refreshes orders every 20 seconds without manual page reload
- [ ] **STAFF-02**: New incoming orders are visually highlighted when they appear
- [ ] **STAFF-03**: Staff can add an internal note to an order when updating its status

---

### Customer Preferences

- [ ] **PREF-01**: Customer can save milk and sugar preferences tied to their phone number at checkout
- [ ] **PREF-02**: Returning customer's saved preferences are pre-filled at checkout when phone number matches
- [ ] **PREF-03**: Customer can update their saved preferences

---

### Gift Cards

- [ ] **GIFT-01**: Customer can purchase a gift card for a venue with a set dollar amount
- [ ] **GIFT-02**: Gift card generates a unique code that can be shared with a recipient
- [ ] **GIFT-03**: Customer can apply a gift card code at checkout to reduce order total
- [ ] **GIFT-04**: Venue owner can view all active gift cards from the dashboard

---

### Subscription Coffee Pass

- [ ] **PASS-01**: Venue owner can configure a coffee pass (e.g. 10 coffees for $45)
- [ ] **PASS-02**: Customer can purchase a subscription pass by phone number
- [ ] **PASS-03**: Customer can use a credit from their pass at checkout
- [ ] **PASS-04**: Remaining credits are displayed and decremented correctly on each use

---

### Reviews & Ratings

- [ ] **REV-01**: Customer receives a review link after their order is marked `completed`
- [ ] **REV-02**: Customer can submit a star rating (1–5) and optional comment at `/review/:orderId`
- [ ] **REV-03**: Venue public page displays average star rating and recent reviews
- [ ] **REV-04**: Owner dashboard shows all reviews with ratings

---

### Multi-Location

- [ ] **LOC-01**: Venue owner can add and manage multiple locations from the dashboard
- [ ] **LOC-02**: Customer can select a pickup location when placing an order
- [ ] **LOC-03**: Each location has its own hours displayed on the public venue page
- [ ] **LOC-04**: Staff dashboard is filterable by location

---

### Catering Requests

- [ ] **CAT-01**: Public venue page includes a catering enquiry form (name, phone, date, guest count, details)
- [ ] **CAT-02**: Catering request is saved to the database and visible in the owner dashboard
- [ ] **CAT-03**: Owner can update catering request status (new → quoted → confirmed → completed)

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
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| MENU-01 | Phase 1 | Pending |
| MENU-02 | Phase 1 | Pending |
| MENU-03 | Phase 1 | Complete |
| ORD-01 | Phase 2 | Pending |
| ORD-02 | Phase 2 | Pending |
| ORD-03 | Phase 2 | Pending |
| ORD-04 | Phase 2 | Pending |
| STAFF-01 | Phase 2 | Pending |
| STAFF-02 | Phase 2 | Pending |
| STAFF-03 | Phase 2 | Pending |
| PREF-01 | Phase 3 | Pending |
| PREF-02 | Phase 3 | Pending |
| PREF-03 | Phase 3 | Pending |
| REV-01 | Phase 3 | Pending |
| REV-02 | Phase 3 | Pending |
| REV-03 | Phase 3 | Pending |
| REV-04 | Phase 3 | Pending |
| GIFT-01 | Phase 4 | Pending |
| GIFT-02 | Phase 4 | Pending |
| GIFT-03 | Phase 4 | Pending |
| GIFT-04 | Phase 4 | Pending |
| PASS-01 | Phase 4 | Pending |
| PASS-02 | Phase 4 | Pending |
| PASS-03 | Phase 4 | Pending |
| PASS-04 | Phase 4 | Pending |
| LOC-01 | Phase 5 | Pending |
| LOC-02 | Phase 5 | Pending |
| LOC-03 | Phase 5 | Pending |
| LOC-04 | Phase 5 | Pending |
| CAT-01 | Phase 5 | Pending |
| CAT-02 | Phase 5 | Pending |
| CAT-03 | Phase 5 | Pending |
| QR-01 | Phase 6 | Pending |
| QR-02 | Phase 6 | Pending |
| QR-03 | Phase 6 | Pending |
| EMAIL-01 | Phase 6 | Pending |
| EMAIL-02 | Phase 6 | Pending |
| EMAIL-03 | Phase 6 | Pending |
| EMAIL-04 | Phase 6 | Pending |
