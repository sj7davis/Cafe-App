# Feature Landscape: v2.2 Full Operations Suite

**Domain:** Multi-tenant cafe SaaS — operator tools + customer experience
**Researched:** 2026-05-29
**Existing B1 features:** Ordering, Stripe payments, gift cards, passes, loyalty, staff dashboard, reviews, catering, multi-location, email/SMS, SSE real-time orders, staff scheduling, dine-in/bookings, automated marketing.

---

## 1. Full KDS (Kitchen Display System)

**Complexity:** Medium
**B1 dependency:** Existing orders schema, SSE broadcastToVenue, dine-in table tagging (Phase 10), order status mutations.

### Table Stakes

| Behaviour | Why Expected | Notes |
|-----------|-------------|-------|
| Swimlane columns by status | Every hardware KDS (Square, Toast, Lightspeed) uses this | Columns: Incoming / In Progress / Ready. Orders move left-to-right via bump. |
| Age-based colour coding | Core safety mechanism — cold food, missed orders | Green 0-5 min, amber 5-10 min, red 10+ min. Thresholds configurable per venue. |
| Single-tap "bump" to next status | The defining interaction of a KDS — replaces paper tickets | Large tap target (full card or dedicated button). Undo within 5s. |
| Audio alert on new order | Kitchen is noisy — visual alone is insufficient | Distinct chime on new order arrival. Separate tone for bump confirmation. Must work without user gesture on page load (use Web Audio API with an unlock tap on first interaction). |
| Items grouped per order, not per item | Kitchen needs to see whole ticket at once | Each card = one order. Items listed vertically with quantities. Modifiers/notes prominently shown. |
| Table number / order type badge | Dine-in vs takeaway workflow is fundamentally different | Table number large and prominent for dine-in. "TAKEAWAY" or pickup name for counter orders. |
| Order number visible | Staff need to call out orders or match to receipts | Short alphanumeric order number (e.g. B1-LXK3P7) on each card. |
| Real-time push (no polling) | A KDS on 20s polling is unusable — cook is already plating | SSE subscription per venue. Already built via broadcastToVenue. |
| Auto-bump timer (optional) | Reduces deliberate bump requirement in high-volume service | After configurable time (e.g. 8 min), card auto-advances to Ready and flashes. Toast KDS calls this "auto-complete." |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|------------|-------|
| Split dine-in / takeaway into separate screens | Two-screen setup common in larger cafes | Low | URL param `?mode=dine-in` or `?mode=takeaway`. Single codebase, filtered view. |
| Item-level completion | Mark individual items done (e.g. food ready, coffee still brewing) | Medium | Requires orderItems status field. Defer to v2.3+. |
| Recall bumped orders | Accidental bump recovery | Low | "Recalled" swimlane or modal listing last 5 bumped orders. |
| Customisable thresholds | Different venues have different ticket times | Low | Venue settings: green/amber/red minute values. |
| Fullscreen / kiosk mode | Tablet used exclusively as KDS | Low | `document.documentElement.requestFullscreen()` on tap. No nav chrome when in kiosk mode. |

### Anti-Features / Defer

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Drag-and-drop reordering of cards | Nobody does this in a kitchen — too error-prone with wet hands | Bump buttons only |
| Multiple KDS station routing (expo → grill → fry) | This is restaurant-grade complexity, not cafe-grade | Defer entirely. B1 serves cafes with one prep area. |
| Item-level print receipts from KDS | Printers are hardware integrations; adds complexity with low cafe return | Single-order receipts via Stripe; KDS is screen-only |
| Customer-facing order tracking screen | Already handled by `/order/:orderNumber` page | Do not duplicate |
| Login/auth on KDS screen | KDS is a shared kitchen device — PIN clock-in (Feature 2) handles identity | KDS is venue-authed by URL token, not user login |

---

## 2. Staff Clock-In / Clock-Out

**Complexity:** Medium
**B1 dependency:** Staff auth (JWT), staff scheduling (Phase 9 shifts), staff table in schema. No payroll integration built yet.

### Table Stakes

| Behaviour | Why Expected | Notes |
|-----------|-------------|-------|
| PIN-based clock-in on shared tablet | Deputy, Tanda, HireUp all use this — staff don't carry individual devices | 4-6 digit PIN set by manager per staff member. On clock-in screen, staff tap their name → enter PIN → confirm. No keyboard needed (numpad UI). |
| Clock-out requires same PIN | Prevents colleague from clocking someone else out | Same PIN flow. Show running shift duration on clock-out screen. |
| Break tracking (paid/unpaid) | Legal requirement in Australian employment law (Fair Work) | Start Break / End Break buttons visible during active shift. Break type selectable (paid / unpaid). Duration tracked separately. |
| Shift duration display | Staff want to see how long they've worked | Running timer on active-shift screen: "You've been clocked in for 3h 42m." |
| Manager view: who is clocked in now | Core operational need — who's actually on shift | Real-time clocked-in roster visible in OwnerDashboard. Show name, clock-in time, hours so far. |
| Daily and weekly hours summary | Staff and managers both need this for pay disputes | Per-staff view: shifts this week, total hours, breaks deducted. |
| Overtime flagging | Fair Work threshold: 38h/week standard. Overtime after that. | Flag rows exceeding threshold in amber/red. Warning at 35h in current week. |
| Manager approval for missed punches | Forgot to clock out — happens constantly | Manager sees a "Missed clock-out" alert. Edits the record, enters reason. Clock-out time saved with an edited flag. |
| CSV export for payroll | Not all venues use integrated payroll — most Australian SMBs use Xero, MYOB, or a bookkeeper | Export: staff name, date, clock-in, clock-out, break duration, total paid hours. One row per shift. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|------------|-------|
| Geofence / GPS lock | Prevent remote clock-in | High | PWA GPS API required. Defer — overkill for single-site cafes. |
| Photo on clock-in | Verify it's actually the right person | Medium | Camera API. Defer. |
| Penalty rate calculator | Australian award rates: Saturday, Sunday, public holiday loadings | High | This is payroll territory. Defer entirely — just export hours. |
| Roster vs actual comparison | Did scheduled staff show up? | Medium | Compare shift schedule (Phase 9) against actual clock-in records. Worthwhile but not MVP. |
| Staff self-service history | Staff can view their own timesheet from StaffDashboard | Low | Simple read-only view. Good differentiator at low cost. |

### Anti-Features / Defer

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Biometric (fingerprint) clock-in | PWA cannot access fingerprint scanner on most devices; Web Authentication API is for login, not time-tracking | PIN only |
| Payroll engine (calculate wages) | This is an accounting product, not a cafe SaaS feature | Export CSV; let Xero/MYOB handle wages |
| Award interpretation engine | Fair Work awards are complex and change. Liability risk if incorrect. | Flag overtime hours; export for human review |
| WhatsApp/Slack shift notifications | Third-party integrations; complex auth per staff member | Email notification via existing Resend integration |
| Staff profile photos | Nice to have, adds S3/storage complexity | Defer to v2.3+ when image uploads are built |

---

## 3. PWA + Add to Home Screen

**Complexity:** Low-Medium
**B1 dependency:** VenuePublic React app (already mobile-first from Phase 7), existing email/SMS for notifications, order history (Feature 4 below).

### Table Stakes

| Behaviour | Why Expected | Notes |
|-----------|-------------|-------|
| Web App Manifest with venue branding | Required for "Add to Home Screen" prompt to appear | `manifest.json`: name, short_name (venue name), icons (192px, 512px), theme_color from venue accentColor, background_color, display: standalone. Served at `/manifest.json` or linked per-venue. |
| Service Worker with offline fallback | PWA minimum — without SW it's just a website | Offline: show cached menu items (read-only). "You're offline — showing last known menu. Ordering is unavailable." Cache strategy: stale-while-revalidate for menu, network-first for cart/orders. |
| Deferred install prompt (not immediate) | Immediate prompts are dismissed reflexively. Best practice from Chrome UX research: wait until engagement. | Do not show on first visit. Trigger after: (a) customer has browsed menu for 60+ seconds, OR (b) customer has placed their first order. Store dismissal in localStorage — never show again if dismissed twice. |
| Standalone display mode | When launched from home screen, no browser chrome — feels like a native app | `display: standalone` in manifest. Detect with `window.matchMedia('(display-mode: standalone)')` to conditionally hide "install" prompts. |
| Splash screen | Prevents white flash on launch | Use manifest `background_color` + icon. iOS requires `<meta name="apple-mobile-web-app-capable">` and apple-touch-icon links. |
| iOS-specific meta tags | iOS does not support the standard Web App Manifest install flow | `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`. Show a custom "tap Share → Add to Home Screen" instruction banner on iOS Safari. |
| Push notification opt-in (after install) | Customers want order-ready alerts without opening the app | Request push permission only after order is placed — never on first visit. Use Web Push API (requires VAPID keys). Show value prop: "Get notified when your order is ready." |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|------------|-------|
| Per-venue PWA manifest | Each venue gets its own branded home screen icon | Medium | Dynamic manifest endpoint `/v/:slug/manifest.json` returns venue-specific name, colors, icons. |
| Offline order queuing | Customer builds cart offline, submits when online | High | IndexedDB queue + sync on reconnect. Defer — complex and rarely needed in cafes (always indoors with WiFi). |
| Background sync for loyalty | Loyalty balance cached offline | Medium | Cache last-known balance from localStorage. Good UX but not MVP. |
| Push for order status changes | "Your flat white is ready!" | Medium | Requires service worker + push subscription stored server-side per customer phone. Worthwhile but implement after order history (Feature 4). |

### Anti-Features / Defer

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| App Store / Play Store submission | Adds $99/year Apple dev account, review delays, update friction | PWA gives 80% of the benefit with 0% of the overhead |
| Native push via Expo/React Native | Full rewrite of customer-facing UI | Web Push API via service worker |
| Force install prompt on landing | Users immediately dismiss; Google Lighthouse penalises | Deferred prompt after first order |
| Aggressive push permission request | If user denies, you can never ask again | Request after successful order, with explicit value prop shown first |
| Full offline ordering | IndexedDB + sync is significant complexity with minimal cafe use case | Offline read-only menu only |

---

## 4. Customer Order History

**Complexity:** Medium
**B1 dependency:** Phone-number-based customer identity already exists (preferences, loyalty). `orders` table already has `customerPhone`. Loyalty points visible via existing loyalty system.

### Table Stakes

| Behaviour | Why Expected | Notes |
|-----------|-------------|-------|
| Phone number as identity (no password) | Starbucks, McDonald's, and every cafe app in AU uses phone as the customer identifier — zero friction | OTP to phone (SMS via existing Twilio/SNS integration) OR magic link to email. Do not require password creation. |
| Last N orders list (10-20) | Customers reorder the same thing constantly — McDonald's research shows 70%+ of orders are repeats | Show: date, items, total, status. Newest first. Paginate at 20. |
| One-tap reorder | The primary value of order history — McDonald's calls this "Favorites" flow, Starbucks has "Recent Orders" | "Reorder" button on each past order adds all items to cart in one tap. Skip unavailable items gracefully (item deleted from menu). |
| Order status in history | "Was my order completed?" — reduces support contacts | Show final status badge on each history row. |
| Loyalty points balance | Already built — just surface it in the history view | Points balance prominently shown at top of order history. "You have 230 points — enough for a free coffee." |
| Accessible without the app | Customer on a new device should still see their history | Phone number lookup is the key — no device-specific storage. Server-side history by phone + venue. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|------------|-------|
| Favourite order saving | Explicit save of a specific configuration (e.g. "My usual") | Low | Heart/star icon on any past order. Saved as JSON in customerPreferences or new column. One "favourite" per venue is enough for MVP. |
| Reorder with modifications | Change milk/sugar on reorder | Low | Pre-fill checkout with past order items; customer can modify before confirming. Already possible given existing preferences flow. |
| Cross-venue history | Customer has orders at multiple B1 venues | Medium | Filter by venue or show all. Phone number is the key across venues. |
| Birthday reward in history | "Here's your birthday coffee!" shown in loyalty section | Low | Already in Phase 11 automated marketing — just surface the reward in the history UI. |
| Order receipt download | PDF of past receipt | Medium | Stripe already sends email receipt. PDF generation is extra work. Defer. |

### Anti-Features / Defer

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Full account creation (email + password) | Friction kills conversion in cafe ordering context | Phone OTP only |
| Order history in a separate app/portal | Adds navigation complexity | Embed in VenuePublic or lightweight `/history/:phone` page per venue |
| Unlimited history (all-time) | Storage and query cost; nobody needs 3-year-old coffee orders | Keep last 90 days / 20 orders — whichever is less |
| Social sharing of orders | No demand signal for this in cafe context | Skip |
| Guest order tracking without phone | Already handled by `/order/:orderNumber` — history needs identity | Two-tier: anonymous order tracking via order number; history requires phone lookup |

---

## 5. Tipping Prompts

**Complexity:** Low
**B1 dependency:** Stripe checkout (Phase 8) for where tip is added. Existing checkout flow in VenuePublic.

### Table Stakes

| Behaviour | Why Expected | Notes |
|-----------|-------------|-------|
| Preset percentage buttons + custom amount | Square, Toast, and every modern POS defaults to this | Buttons: 10%, 15%, 20%, No Tip. Plus "Custom" that opens a number input. Show dollar amounts alongside percentages (e.g. "15% — $1.20"). |
| Show after cart review, before payment | Standard placement — customer has already committed to buying | After "Review Order" step, before Stripe redirect. Full-screen or modal prompt. Not inline in cart. |
| Skip for dine-in orders | Tipping dynamics differ — Australian dine-in service is table-waited, tip expectations are ambiguous. Toast KDS research shows showing tip prompts for dine-in reduces overall satisfaction. | Detect `orderType === 'dine-in'` and skip the prompt entirely. Counter/takeaway only. |
| "No Tip" is always prominent and easy | Dark patterns backfire badly in cafe context — negative reviews | "No Tip" button equal in size to preset buttons. No guilt language. |
| Tip amount added to Stripe total before checkout | Tip must be part of the payment session, not a separate charge | Pass `tipAmount` to the Stripe Checkout session creation on backend. Line item or metadata field. |
| Remember last selection | Returning customers appreciate not having to re-choose | Store last tip choice (percentage or custom) in localStorage per venue. Pre-select on next visit. Do not pre-select "No Tip" as default (neutral default: show all options unselected). |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|------------|-------|
| Tip split to staff vs venue | Show customer "tips go directly to baristas" | High | Requires payroll integration — defer entirely |
| Time-of-day tip prompts | Peak hour = higher ambient tipping likelihood | Low | Show tip prompt more prominently during 7-9am rush. Minor uplift, low effort. |
| Tip in loyalty points | "Add 50 points as a tip to your barista" | High | Novel concept but complex — loyalty points are customer-facing, not staff compensation | 

### Anti-Features / Defer

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Pre-selected tip (e.g. 15% pre-ticked) | Dark pattern. ACCC has flagged drip pricing including pre-selected tips as potentially misleading in AU. | Show all buttons unselected — customer must actively choose |
| Mandatory tip minimum | Destroys trust immediately | Always include prominent No Tip option |
| Tip prompt on every page/screen | Harassment pattern — seen on Uber Eats and criticised | One prompt, one time, per order |
| Tip for dine-in without explicit opt-in | Inconsistent with AU dine-in norms | Skip dine-in entirely unless venue explicitly enables it in settings |
| Tip stored as separate order | Creates accounting complexity with Stripe | Add tip as line item or metadata on same Stripe session |

---

## 6. Upsell Engine

**Complexity:** Medium
**B1 dependency:** Menu items, categories, order history (for co-occurrence data), existing cart flow in VenuePublic.

### Table Stakes

| Behaviour | Why Expected | Notes |
|-----------|-------------|-------|
| Max 2-3 suggestions per order | Toast, Square, and Shopify all cap at 3. More than 3 = analysis paralysis + irritation. | Show 2 suggestions on cart review screen. Never more than 3. |
| Category-based "add a side?" | Simplest form of upsell — no ML needed | If cart contains a coffee item, suggest a food item from "Pastries" or "Snacks" category. Rule: coffee + no food = suggest food. |
| Time-of-day contextual suggestions | Morning (6-11am): suggest breakfast items. Afternoon (2-5pm): suggest afternoon snacks. | Simple hour-of-day rules. No ML required for v2.2. |
| Non-intrusive placement | Shopify's "Frequently Bought Together" lives below the cart, not as a blocking modal | Render below the cart items list, above the checkout button. Expandable/collapsible. Never a blocking modal. |
| One-tap add to cart | Friction kills conversion — suggestion must convert in one tap | "Add" button on each suggestion card. No quantity selector (always adds 1). |
| Exclude already-carted items | Suggesting something already in the cart is a basic failure | Filter out items with `cartItems.some(c => c.menuItemId === suggestion.id)`. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-----------------|------------|-------|
| Co-occurrence "frequently bought together" | Best-practice for venues with enough data. Square and Toast both use this once sufficient order history exists. | Medium | Requires order history query: for items in cart, find items most commonly purchased alongside them. Minimum threshold: 50+ co-occurrence events before showing (avoid misleading suggestions with sparse data). Fall back to category-based rules when data is thin. |
| "Popular right now" (time-windowed) | "10 people ordered this this morning" — social proof | Low | Query top 3 items by order count in last 2 hours. Show on cart screen. |
| Venue-curated "featured add-ons" | Owner manually tags items as upsell candidates | Low | Boolean `isFeatured` flag on menu items. Owner can tag 3-5 items in MenuTab. Simple and reliable. |
| Loyalty-aware suggestions | "Add this to earn 50 points toward your free coffee" | Low | Show loyalty points earned on suggested item. Already have loyalty schema. |

### Anti-Features / Defer

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| ML model or external recommendation API | Engineering overhead not justified for SMB cafe volumes | Rule-based: category + time-of-day + co-occurrence on historical orders |
| Pop-up / interstitial suggestion modal | Blocking modals are the single most-complained-about pattern in ecommerce UX research | Inline placement below cart only |
| Suggesting items the venue is out of | No stock system exists yet — can't know availability | Only suggest items with `isAvailable: true` |
| Personalisation by individual customer | Requires customer identity + history — complex and sparse data per customer | Category and time-of-day rules serve 90% of the value |
| Upsell on the menu page (before cart) | Too early — customer hasn't committed. Feels like spam. | Cart review screen only |
| "Customers also viewed" (browsing-based) | This is e-commerce, not a cafe app | Not applicable to food ordering |

---

## Feature Dependencies Map

```
KDS (1)
  └── Requires: dine-in table tagging (Phase 10), SSE broadcastToVenue (Phase 9), order status mutations

Staff Clock-In (2)
  └── Requires: staff auth JWT, staff table in schema
  └── Enhanced by: staff scheduling (Phase 9) for roster vs actual comparison

PWA (3)
  └── Requires: VenuePublic mobile-first layout (Phase 7 complete)
  └── Enhanced by: order history (4) for push notification value prop

Customer Order History (4)
  └── Requires: phone-number identity (already in schema), loyalty schema (existing)
  └── Phone OTP requires: SMS integration (existing Twilio/SNS)

Tipping (5)
  └── Requires: Stripe checkout (Phase 8 complete), orderType dine-in flag (Phase 10)

Upsell Engine (6)
  └── Requires: menu items + categories (existing), cart flow (existing)
  └── Enhanced by: order history (4) for co-occurrence data
```

## MVP Recommendation for v2.2

**Build in this order:**

1. **Tipping prompts (5)** — Lowest complexity, highest direct revenue impact. Phase 8 Stripe is already done. One-session implementation.
2. **Upsell engine (6)** — Category + time-of-day rules only (no co-occurrence yet). Attach to existing cart. One-session implementation.
3. **KDS (1)** — Medium complexity. SSE already built. Swimlane + colour coding + bump + audio. Skip item-level completion.
4. **PWA (3)** — Manifest + service worker + deferred install prompt + iOS tags. Skip offline ordering.
5. **Customer order history (4)** — Phone OTP auth, last 20 orders, one-tap reorder. Skip cross-venue for now.
6. **Staff clock-in (2)** — PIN flow, break tracking, manager approval, CSV export. Skip geofence, skip penalty rates.

**Defer entirely:**
- Item-level KDS completion
- KDS multi-station routing
- Payroll/wage calculation
- PWA offline ordering
- Order history PDF receipts
- Co-occurrence upsell (build after 3 months of order data)
- Tipping for dine-in
- Geofence clock-in
- Push notifications (after PWA is live and order history is built)

## Sources

- Square KDS product documentation and feature descriptions — HIGH confidence (training data + widely documented public feature set)
- Toast KDS feature set — HIGH confidence (well-documented enterprise POS)
- Deputy and Tanda — MEDIUM confidence (AU workforce management platforms; feature set derived from their public documentation and AU employment law context)
- Fair Work Act 2009 (Cth) — ordinary hours threshold 38h/week — HIGH confidence
- Chrome PWA install prompt best practices — HIGH confidence (Google Web.dev documentation, widely cited)
- ACCC guidance on drip pricing (pre-selected tips) — MEDIUM confidence (2022-2024 ACCC digital platform scrutiny; specific tip guidance inferred from broader drip pricing position)
- Starbucks / McDonald's app patterns — HIGH confidence (widely studied, UX teardowns extensively documented)
- Shopify "Frequently Bought Together" and upsell placement — HIGH confidence (Shopify merchant documentation)
