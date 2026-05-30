# Domain Pitfalls: B1 v2.2 Full Operations Suite

**Domain:** Adding SSE, KDS enhancements, PWA, clock-in/out, order history, tipping, and upsell to an existing multi-tenant cafe SaaS
**Stack context:** React 19 + Hono + tRPC v11 + Drizzle ORM + PostgreSQL on Railway
**Researched:** 2026-05-29

---

## SSE in Production

### Pitfall 1: In-Memory Client Map Dies on Railway Redeploy
**Risk:** High

The current `sse-store.ts` stores active connections in a `Map<number, Set<ServerResponse>>` in Node.js process memory. Railway deploys a new container and the old one drains — all SSE clients get their `close` event fired, EventSource auto-reconnects, but the new container has zero clients in its map until they reconnect. This is correct behaviour but causes a 2–5 second gap in real-time updates on every deploy. The real risk is Railway's zero-downtime swap: during the overlap period, `broadcastToVenue` fires on the old container while new connections are on the new one — some events are silently dropped.

**Prevention:** Accept the gap as a constraint of single-instance Node. Document it. Add a 30s fallback poll (already present in KitchenDisplay.tsx) — do not remove it. If Railway is configured with multiple replicas later, the in-memory map becomes a hard bug; at that point switch to Redis pub/sub or Postgres `LISTEN/NOTIFY`.

---

### Pitfall 2: Railway / Nginx Proxy Buffers SSE Responses
**Risk:** High

Railway sits behind an nginx-based proxy. Without `X-Accel-Buffering: no` the proxy will buffer the response body and clients never receive events until the buffer flushes (typically 4 KB or connection close). The current boot.ts already sets this header — but it must be verified end-to-end in production because Railway's behaviour can change. A second buffering risk: `Cache-Control: no-cache, no-transform` is set but if Railway ever adds a CDN layer (e.g. Cloudflare), Cloudflare buffers SSE by default unless a special rule disables it.

**Prevention:** Keep `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform` on every SSE response. After deploy, verify with `curl -N https://yourdomain/api/sse/orders/1` that heartbeat pings arrive every 25 s in real time. If a CDN is added later, set "Response Buffering: off" for the `/api/sse/` path rule.

---

### Pitfall 3: EventSource Reconnect Storm After Server Restart
**Risk:** Medium

`EventSource` uses exponential backoff starting at ~1 s but the browser caps retries at a few seconds. If the server restarts and 50 KDS + staff tabs reconnect simultaneously, the connection pool hits a spike. Under Railway's default Node single instance this is unlikely to cause a crash, but if the reconnect burst coincides with a cold-start DB connection pool warm-up, the first few tRPC requests after reconnect can time out.

**Prevention:** The 30 s fallback poll already prevents total data loss. Add a `retry: 5000\n\n` line in the SSE preamble so the browser waits 5 s before reconnecting — this staggers reconnect storms. Current boot.ts does not set a `retry` field; add it after the initial `": connected\n\n"` write.

---

### Pitfall 4: SSE Endpoint Has No Authentication
**Risk:** Medium

`/api/sse/orders/:venueId` is open to any caller that knows a venueId (which is a sequential integer). An unauthenticated browser can connect and receive real-time order data including customer names and phone numbers for any venue.

**Prevention:** Before calling `addSseClient`, verify either a staff JWT (via `Authorization: Bearer` header or a `?token=` query param) or an owner JWT. Staff tokens already exist in sessionStorage on the KDS page. Reject unauthenticated connections with a 401 before writing the event-stream headers — once headers are sent the status code cannot be changed.

---

### Pitfall 5: Memory Leak When Client Disconnects Abnormally
**Risk:** Medium

The `close` event on `ServerResponse` fires when the TCP connection closes cleanly. Abnormal disconnects (tab crash, network drop without FIN) may not fire `close` immediately. In that case the dead `res` object stays in the `clients` map until `broadcastToVenue` tries to write to it and catches the error. The current code does delete on write error, so memory will eventually be reclaimed — but a tablet KDS that disconnects on a dirty Wi-Fi drop can leave a dead entry for minutes.

**Prevention:** Add an explicit heartbeat check: if `res.write(": ping\n\n")` throws in the heartbeat interval, call `removeSseClient` immediately. The current heartbeat already does `clearInterval(heartbeat)` on throw but does not call `removeSseClient`. Fix this: `catch { clearInterval(heartbeat); removeSseClient(venueId, res); }`.

---

### Pitfall 6: Broadcasting to Wrong Venue Channel
**Risk:** Medium

`broadcastToVenue` takes a numeric `venueId`. Two call sites exist: `boot.ts` (Stripe webhook) and `venue-router.ts` (updateOrderStatus, createOrder). The Stripe webhook path reads `venueId` from the Stripe session metadata string field. If the metadata was stored as a string `"42"` and compared with `Number("42")`, the Map lookup works — but if any future code passes a string directly to `broadcastToVenue`, the Map key (number) will never match.

**Prevention:** Add a runtime guard at the top of `broadcastToVenue`: `venueId = Number(venueId)`. TypeScript types it as `number` but Stripe metadata is always `string` — the webhook handler already does `Number(...)` conversion but this is a fragile single point of failure.

---

## KDS UI

### Pitfall 1: `ordersQuery.refetch()` After Status Update Races the DB Write
**Risk:** High

`KitchenDisplay.tsx` calls `updateStatus.mutateAsync(...)` then immediately `ordersQuery.refetch()`. If the DB write hasn't committed by the time the query fires (can happen under load), the re-fetch returns the old status and the card appears to not have moved. The staff member taps "Start" again, creating a double-advance.

**Prevention:** Use tRPC's `onSuccess` callback pattern or `await` the mutation and then call `utils.venue.listOrders.invalidate()` (already used in the SSE handler) rather than `refetch()`. Alternatively, apply optimistic updates via tRPC's `onMutate`/`onError`/`onSettled` pattern so the UI moves immediately and rolls back on error.

---

### Pitfall 2: Per-Card `getOrderItemsByOrderId` Query Causes N+1 Fetches
**Risk:** High

`OrderCard` calls `trpc.venue.getOrderItemsByOrderId.useQuery({ orderId: order.id })` for every card rendered. With 20 active orders across three columns, the KDS fires 20 parallel tRPC queries on mount and on every `listOrders` invalidation. Under Railway free-tier PostgreSQL this will hit connection pool limits during a busy café rush.

**Prevention:** Join order items into `listOrders` at the backend (already done for the staff dashboard in earlier phases — replicate the same join). The KDS query should return `{ ...order, items: [...] }` so the per-card sub-query is eliminated entirely. This is the single most important KDS performance fix.

---

### Pitfall 3: Audio Alert Blocked on iOS Safari
**Risk:** High

`playChime()` creates an `AudioContext` on the chime trigger path. iOS Safari requires the `AudioContext` to be created (or resumed) in direct response to a user gesture. The KDS creates the `AudioContext` on first chime (not on login button click), so on iOS the chime will be silently blocked by the browser.

**Prevention:** Create and `.resume()` the `AudioContext` inside the `handleLogin` button handler (a user gesture), then store it in `audioCtx.current`. When a new order arrives, call `audioCtx.current.resume().then(() => playChime())`. Add a visible "audio enabled" indicator so staff know whether chimes are working.

---

### Pitfall 4: Completed Orders Briefly Re-Appear After Browser Refresh
**Risk:** Medium

The KDS query filters `statuses: ['pending', 'confirmed', 'ready']`, which excludes `completed`. However, if the cache from a previous session is loaded by React Query before the fresh network response arrives (staleTime is 0, so this window is very short), a completed order could flash for one render. More dangerously: if the SSE fires `order_update` with `status: 'completed'` and `invalidate()` is called, React Query refetches and the completed order disappears — but if the refetch fails (network hiccup), the order card stays stuck in the ready column until the next successful fetch.

**Prevention:** Client-side filter the rendered list: `const allOrders = (ordersQuery.data ?? []).filter(o => o.status !== 'completed' && o.status !== 'cancelled')`. This is belt-and-suspenders against any state that leaks through. It is already partly done (the column split only renders pending/confirmed/ready) but the raw `allOrders` variable still holds all statuses.

---

### Pitfall 5: Swimlane Layout Breaks on 4:3 Tablets
**Risk:** Low

The KDS uses `gridTemplateColumns: 'repeat(3, 1fr)'`. On a 1024×768 tablet (4:3) this works. On an 800×600 older tablet or a portrait-oriented 768×1024 iPad, the three columns at `1fr` each produce cards that are only ~250 px wide — unreadable for item names with notes. There is no responsive breakpoint.

**Prevention:** Add a media query or CSS container query: below 900 px wide, switch to a single-column scrollable list ordered by urgency. The dark KDS background already handles contrast well; just stack the columns vertically.

---

## Staff Clock-In / Clock-Out

### Pitfall 1: Double Clock-In Without Guard
**Risk:** High

The `clockIn` mutation in `clock-router.ts` inserts a new `in` event unconditionally. If a staff member taps the clock-in button twice (network latency, double tap), two `in` events are written. The `getHoursSummary` pairing logic matches the first `in` with the first `out`, so the second `in` has no matching `out` and is silently ignored — but it creates noise in the audit trail and will confuse any payroll export that counts events rather than pairs.

**Prevention:** Before inserting, check the last event for this `staffId`+`venueId`. If the last event is already `in`, return `{ ok: true, alreadyClockedIn: true }` without inserting. This guard is missing from the current router. Add a DB-level unique constraint is not practical here (clock events are a log), so the guard must be in application code.

---

### Pitfall 2: Timezone in `getPenaltyFlag` Uses Server Timezone, Not Venue Timezone
**Risk:** High

`getPenaltyFlag(clockedAt)` calls `clockedAt.getHours()` and `clockedAt.getDay()`. `getHours()` and `getDay()` use the local timezone of the Node.js process. If Railway runs the container with UTC timezone (the default for Linux containers), a staff member who clocks in at 10 PM AEST (UTC+10) will have `clockedAt.getHours()` return `12` (noon UTC), and the Saturday penalty check (`clockedAt.getDay() === 6`) could return the wrong day of week.

**Prevention:** All `clockedAt` values are stored as UTC timestamps (correct — Postgres `timestamp` with Node's `new Date()` is UTC). For penalty calculations, convert to the venue's configured timezone using `Intl.DateTimeFormat` with the venue's `timezone` field (already on the `venues` schema). Pull the venue's timezone in `clockIn`/`clockOut` and pass it to `getPenaltyFlag`. Example: `new Date(clockedAt.toLocaleString('en-AU', { timeZone: venueTimezone }))`. This is Australian Fair Work critical — wrong penalty flags mean wrong pay.

---

### Pitfall 3: Missing Clock-Out on End of Shift
**Risk:** Medium

Staff finishing their shift may forget to clock out, especially on busy close. The `getHoursSummary` pairing loop silently skips any open `in` event with no matching `out`. The hours are not counted. The staff member appears to have worked zero time for that shift.

**Prevention:** Add a "did you forget to clock out?" mechanism. Options: (a) the StaffDashboard shows a banner if `isClockedIn` is true and the last clock-in was more than 10 hours ago; (b) a nightly scheduled task (via Railway cron or a simple `setInterval` in boot.ts on server startup) queries for open clock-ins older than 12 hours and sends an alert email to the venue owner. The owner can then manually add a corrective clock-out event via an admin UI.

---

### Pitfall 4: DST Transition Corrupts Shift Duration Calculation
**Risk:** Medium

Australia observes DST in states like NSW, VIC, SA (not QLD, WA, NT). The `getHoursSummary` pairing calculates `(clockOut - clockIn) / 60000` in milliseconds, which is always correct regardless of DST because both timestamps are stored as UTC epoch milliseconds. This part is safe. The risk is in `getPenaltyFlag` which uses wall-clock hours — a clock-in at 2:30 AM during the spring-forward transition creates a wall-clock time that doesn't exist, and a clock-out at 2:00 AM during the fall-back transition is ambiguous (first or second occurrence). JavaScript's `getHours()` in the server's local timezone will resolve this incorrectly for venues in DST zones.

**Prevention:** Same fix as Pitfall 2 — use `Intl.DateTimeFormat` with explicit venue timezone for all wall-clock interpretations. Never use `getHours()` or `getDay()` without a timezone context.

---

### Pitfall 5: Payroll Export Sorted by `clockedAt` Breaks Pairing Across Midnight
**Risk:** Low

The `getHoursSummary` query orders by `staffId, clockedAt` then pairs `in`/`out` sequentially. A staff member who clocks in at 11:45 PM and out at 00:15 AM the next day will have the `out` event appear in the next day's query range if the owner exports using a date filter (`gte(clockedAt, since)`). The pairing loop will never find the `out` for that shift.

**Prevention:** When querying for a date range, extend the `since`/`until` window by 24 hours on both ends, then filter the rendered report by shift start date. Alternatively, store the shift as a single row with `clockInAt`/`clockOutAt` (a sessions model) rather than two separate event rows. The current event log model is correct for auditability but requires careful range handling for payroll.

---

## PWA

### Pitfall 1: Service Worker Caches tRPC API Responses
**Risk:** High

`vite-plugin-pwa` with a `NetworkFirst` or (worse) `CacheFirst` strategy applied to `/*` will intercept tRPC calls (`/trpc/...`). A stale cached response for `listOrders` means staff see orders that were cancelled an hour ago. The KDS and StaffDashboard must never serve API responses from cache.

**Prevention:** Configure `workbox` routes explicitly. Use `NetworkOnly` for `/trpc/`, `/api/`, and `/api/sse/`. Use `CacheFirst` only for static assets (`/assets/`, fonts, images). Use `StaleWhileRevalidate` for the Vite-generated HTML shell. Define explicit `runtimeCaching` entries — do not rely on the default `globPatterns` to exclude API routes.

---

### Pitfall 2: iOS Safari PWA Has No Push Notification Support
**Risk:** High

The existing `usePushSubscription.ts` hook checks `'PushManager' in window` and bails gracefully on iOS. However, iOS Safari PWAs (added to home screen) gained limited Web Push support in iOS 16.4+ only when installed as a home screen app — it does not work in the browser tab. Staff using an iPad KDS via Safari browser (not installed) will silently have push disabled.

**Prevention:** Do not rely on Web Push for KDS. The SSE connection is already the real-time channel for the KDS. Web Push is only useful as a fallback for the owner receiving new order alerts when the OwnerDashboard tab is not open. Design the notification architecture around SSE-primary, push-secondary, and document that iOS Safari in-browser push is not supported.

---

### Pitfall 3: Install Prompt Shown Too Early
**Risk:** Medium

The browser fires `beforeinstallprompt` shortly after page load. If the VenuePublic page shows an "Add to Home Screen" prompt immediately on first visit, the customer dismisses it and the browser suppresses it for 3 months (Chrome's heuristic). The customer never sees it again.

**Prevention:** Capture the `beforeinstallprompt` event, store it in state, and show the install prompt only after a trigger that signals intent — for example, after a second order is placed or when the customer opens their order history. Do not auto-show the banner on first page load.

---

### Pitfall 4: Manifest Icons Wrong Sizes Cause Silent Install Failure
**Risk:** Medium

Chrome requires a 192×192 and a 512×512 PNG in the manifest for installability. If the icons are SVG, a JPEG, or the wrong declared size, the browser will silently refuse to show the install prompt without any error message. The only indicator is the Lighthouse PWA audit.

**Prevention:** Generate icons at exactly 192×192 and 512×512 PNG. Add a `purpose: "any maskable"` icon at 512×512 for Android adaptive icons. Run `npx lighthouse --only-categories=pwa` in CI to catch manifest regressions. The `vite-plugin-pwa` `generatePWA` option can auto-generate icons from a source SVG using `@vite-pwa/assets-generator`.

---

### Pitfall 5: Offline Mode Breaks Multi-Tenant URL Routing
**Risk:** Low

B1 serves all venues from the same origin (`/venue/:slug`). A service worker with a broad cache strategy might cache venue A's HTML shell and serve it to venue B's URL offline. The venue slug is in the URL path, not embedded in the cached HTML, so the wrong menu appears.

**Prevention:** Use a `NavigationRoute` with `NetworkFirst` for all HTML navigation requests. Only cache static assets (`/assets/*`) with `CacheFirst`. Accept that offline mode for this SaaS means "app shell loads but shows a network error" — do not attempt full offline ordering.

---

## Upsell Engine

### Pitfall 1: Recommending Items Already in the Cart
**Risk:** High

Any recommendation query that runs against the full menu without filtering against the current cart will surface duplicates. In a cafe context where customers typically order one coffee and one food item, recommending the exact coffee they already have is the most common failure and feels broken.

**Prevention:** The upsell query must receive the current cart item IDs as an exclusion list. The backend endpoint should accept `excludeItemIds: number[]` and filter them out: `where(notInArray(menuItems.id, excludeItemIds))`. This must be enforced server-side, not just client-side, because the client-side cart state can be stale.

---

### Pitfall 2: Recommending Sold-Out or Deleted Items
**Risk:** High

The `menuItems` schema has no `deletedAt` column — items are hard-deleted. `orderItems` stores `itemName` as a string snapshot so historical orders don't break, but a recommendation based on co-purchase frequency (`item A is often ordered with item B`) could surface item B's ID even if item B was deleted from the menu. The upsell query would return an item that no longer exists.

**Prevention:** Any recommendation query must `JOIN menuItems` and filter `WHERE menuItems.id IS NOT NULL` (for join-based queries) and check `availability` (the `menuItemAvailability` table has an `isAvailable` boolean). Add an additional filter: the item must currently exist in the venue's active menu. Cache invalidation of upsell results should be tied to menu change events.

---

### Pitfall 3: Cold Start Problem for New Venues
**Risk:** High

A recommendation engine based on co-purchase frequency has no data for new venues. If the engine returns nothing, the upsell panel either disappears or shows an error. If the fallback is "show random items," it can recommend a beer at 7 AM.

**Prevention:** Use a two-tier fallback: (1) collaborative filtering from the venue's own order history; (2) if fewer than 50 orders exist, fall back to editorial recommendations — the venue owner configures 2–3 "featured" or "frequently paired" items in the dashboard. This editorial fallback is always available from day one and doubles as a marketing tool. The engine switches to data-driven recommendations automatically once enough orders accumulate.

---

### Pitfall 4: Upsell Shown at Wrong Point in the Checkout Flow
**Risk:** Medium

Showing the upsell before the customer has completed their item selection is annoying (they haven't decided yet). Showing it after the Stripe redirect begins is too late (they're already in the payment flow). The correct moment is after the customer taps "Proceed to Checkout" but before the Stripe session is created.

**Prevention:** Render the upsell as a modal or inline panel on the checkout summary screen — the same screen that shows the cart total, loyalty redemption, and discount code. The customer can add a recommended item directly from this panel, which updates the cart, then they proceed to Stripe. If the upsell panel is a separate step, conversion will drop because each additional step loses ~10–15% of customers.

---

### Pitfall 5: Upsell Triggers Unnecessary Stripe Session Recreation
**Risk:** Medium

If a Stripe Checkout Session is created first and then the customer adds an upsell item, the session must be abandoned and a new one created with the updated line items. Stripe sessions are not mutable once created. If the implementation creates the Stripe session on "proceed to checkout" click and then shows upsell, any accepted upsell requires a new session, which adds latency and a confusing redirect.

**Prevention:** Create the Stripe Checkout Session only after all cart modifications (including upsell acceptance or rejection) are finalised. The upsell step must happen entirely within the B1 UI before the Stripe redirect.

---

## Order History

### Pitfall 1: Phone Number Format Inconsistency Breaks History Lookup
**Risk:** High

`getOrdersByPhone` queries `WHERE orders.customerPhone = input.phone` with an exact string match. Australian mobile numbers can be stored as `0412345678` (local format) or `+61412345678` (E.164) or `61412345678` depending on what the customer typed at checkout. If the customer first ordered with `0412345678` and now looks up history with `+61412345678`, zero results are returned. No error — just empty history.

**Prevention:** Normalise all phone numbers to E.164 at write time (when `createOrder` and `upsertCustomerPreferences` run), not at read time. A normalise function for Australian numbers: strip non-digits, if starts with `04` replace with `+614`, if starts with `61` prefix with `+`. Apply this normaliser to all inbound phone fields across the entire codebase — checkout form, preferences, reservations, SMS marketing. This requires a one-time migration to normalise existing records. Until the migration runs, the read path must also normalise the query input: run the same function on `input.phone` before the WHERE clause.

---

### Pitfall 2: Order History Leaks Orders Across Venues
**Risk:** High

`getOrdersByPhone` accepts `venueId` as a required parameter and filters by it — this is correctly scoped. The risk is in the CustomerPortal or any future "view all my orders across venues" feature. If a new endpoint drops the `venueId` filter, every venue's orders for that phone number are exposed. Order history includes `customerName`, `totalAmount`, `items`, which is PII.

**Prevention:** Any order history query must be either venue-scoped (always include `eq(orders.venueId, venueId)`) or require a customer JWT that gates which venueIds the customer can query. There is no global "all venues" customer identity in B1 currently — preserve this constraint. Do not add a cross-venue order history endpoint without explicit authentication.

---

### Pitfall 3: Reorder Fails Silently When Menu Item Is Deleted
**Risk:** High

The schema stores `orderItems.itemName` as a string snapshot and `orderItems.menuItemId` as a foreign key. If the customer tries to reorder and the `menuItemId` no longer exists in `menuItems` (hard delete), the reorder flow must handle this. If the UI blindly adds the old `menuItemId` to the cart and that item is deleted, the add-to-cart mutation will fail with a foreign key error or return a 404 with no user-facing explanation.

**Prevention:** The reorder flow must query the current menu before adding items to the cart. For each `orderItem` in the old order, verify the `menuItemId` still exists and is available. Items that no longer exist should be marked "no longer available" in the reorder UI with the historic name shown in grey. Do not attempt to silently skip deleted items — the customer should explicitly acknowledge what they're not getting.

---

### Pitfall 4: Order History Pagination Not Scoped to Reasonable Limits
**Risk:** Low

`getOrdersByPhone` defaults to `limit: 10, max: 20`. This is fine. The risk is that no cursor-based pagination exists — if a loyal customer has 500 orders and the UI asks for the last 20, but also wants to show "total orders" count, a separate `COUNT(*)` query is needed. Running a `COUNT(*)` without an index on `(venueId, customerPhone)` will do a full table scan as the orders table grows.

**Prevention:** Add a composite index on `(venue_id, customer_phone)` to the `orders` table if it doesn't exist (check via `\d orders` in psql). The current Drizzle schema does not show this index explicitly — add it as a Drizzle index definition in the schema. The `getOrdersByPhone` query already has both columns in its WHERE clause so the index will be used immediately.

---

## Phase Assignment Summary

| Pitfall | Recommended Phase | Priority |
|---------|-------------------|----------|
| SSE: No auth on `/api/sse/orders/:venueId` | Phase 9 (SSE rollout) — Day 1 | Critical |
| SSE: heartbeat doesn't remove dead client | Phase 9 — alongside SSE work | High |
| SSE: retry field missing (reconnect storm) | Phase 9 | Medium |
| KDS: N+1 items query per card | Phase 9 (KDS enhancement) — before deploy | Critical |
| KDS: double-advance race on status update | Phase 9 | High |
| KDS: audio blocked on iOS | Phase 9 | High |
| Clock: double clock-in no guard | Phase 9 (staff scheduling/clock work) | Critical |
| Clock: timezone uses server local time | Phase 9 — must fix before payroll | Critical |
| Clock: missing clock-out detection | Phase 9 | Medium |
| Clock: DST wall-clock in penalty calc | Phase 9 | High |
| PWA: API routes cached by service worker | PWA phase — config before any deploy | Critical |
| PWA: install prompt too early | PWA phase | Medium |
| PWA: icon sizes | PWA phase — CI check | Medium |
| Upsell: items already in cart | Upsell phase — schema design | Critical |
| Upsell: deleted/sold-out items | Upsell phase — query design | Critical |
| Upsell: cold start for new venues | Upsell phase — editorial fallback | High |
| Upsell: Stripe session created too early | Upsell phase — flow design | High |
| Order history: phone normalisation | Order history phase + migration | Critical |
| Order history: cross-venue leak risk | Order history phase | High |
| Order history: reorder with deleted items | Order history phase | High |
| Order history: missing index on (venueId, phone) | Order history phase — schema | Medium |
