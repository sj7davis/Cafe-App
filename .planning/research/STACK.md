# Technology Stack — v2.2 Full Operations Suite

**Project:** B1 Platform (Cafe SaaS)
**Milestone:** v2.2 — Full Operations Suite
**Researched:** 2026-05-29
**Confidence:** HIGH (based on direct codebase inspection + ecosystem knowledge)

---

## Existing Validated Stack (do not change)

React 19 + Vite 6.3 + TypeScript + Tailwind + shadcn/ui  
Hono 4.12 + tRPC v11 + Drizzle ORM + PostgreSQL (Railway)  
JWT (jose) + bcrypt, Stripe, Resend, Twilio, Square OAuth  
`date-fns` 4.1.0, `input-otp` 1.4.2, `zod` 4.3.5 already installed.

---

## Feature 1: Server-Sent Events (SSE)

**Verdict: No new dependencies needed. Pattern exists — extend it.**

The SSE infrastructure is already fully in place:
- `app/api/lib/sse-store.ts` — in-memory Map keyed by venueId, `broadcastToVenue()` exists
- `app/api/boot.ts` lines 361–384 — raw Node.js SSE endpoint `/api/sse/orders/:venueId`
- The endpoint uses `c.env.outgoing` (Hono's `HttpBindings`) to access the raw `ServerResponse`
- Heartbeat ping every 25s prevents proxy timeout

**The current pattern is correct for Hono + `@hono/node-server`.** The `streamSSE` Hono helper
(available in `hono/streaming`) is an alternative, but the raw `ServerResponse` approach in
boot.ts avoids tRPC adapter conflicts and is already working. Do not migrate to `streamSSE`.

**What to add for StaffDashboard / KDS / OwnerDashboard:**

The *only* work needed is on the frontend — replace polling with `EventSource`:

```typescript
// Pattern for any React component replacing polling
const es = new EventSource(`/api/sse/orders/${venueId}`);
es.addEventListener("order_update", (e) => {
  const data = JSON.parse(e.data);
  queryClient.invalidateQueries({ queryKey: ["orders", venueId] });
});
return () => es.close(); // cleanup in useEffect
```

`broadcastToVenue(venueId, "order_update", payload)` is already called from the Stripe webhook
(boot.ts line 612). It needs to also be called from the `venue.updateOrderStatus` tRPC mutation
so staff-side status changes propagate live.

**Multi-channel pattern:** The sse-store Map is already keyed by venueId. No change needed for
multi-venue. If a single venue needs separate channels (e.g., kitchen vs. front-of-house), add
a second Map keyed by `${venueId}:${channel}` — zero new deps.

**DB migration:** None.

---

## Feature 2: Full KDS (Kitchen Display System)

**Verdict: No new dependencies needed.**

A dedicated full-screen KDS page is pure React + Tailwind + existing tRPC queries.
The swimlane column layout (pending / preparing / ready) maps directly to `orders.status` values
already in the schema (`confirmed`, `preparing`, `ready`, `completed`, `cancelled`).

**What exists:**
- `orders` table has `status`, `createdAt`, `orderNote`, `tableNumber`, `customerName`, `pickupTime`
- `orderItems` table has `itemName`, `quantity`, `unitPrice`, `note`
- `venue.getOrders` or similar tRPC query already fetches orders by venueId

**What's needed:**
- A new React route (e.g., `/kds/:venueId`) — no routing library changes, React Router 7 is installed
- A `useEffect` that connects EventSource (Feature 1) to auto-refresh the board
- Tailwind CSS Grid or Flexbox for swimlane columns — no new component library

**Confirm no new deps:** `@radix-ui/react-scroll-area` (already installed) handles overflow
within each column. `lucide-react` (already installed) provides status icons.

**DB migration:** None.

---

## Feature 3: PWA + Add to Home Screen

**New dependency needed: `vite-plugin-pwa`**

| Library | Recommended Version | Install |
|---------|---------------------|---------|
| `vite-plugin-pwa` | `^0.21.0` | `npm install -D vite-plugin-pwa` |
| `workbox-window` | bundled with vite-plugin-pwa | — |

**Version note (MEDIUM confidence — no live lookup available):** `vite-plugin-pwa` 0.21.x is the
stable release line for Vite 5+. The project uses Vite **6.3.5**. As of the plugin's changelog,
Vite 6 is supported from vite-plugin-pwa 0.21.0+. Verify the exact compatible version before
installing:

```
npx npm-check-updates vite-plugin-pwa
```

or check https://github.com/vite-pwa/vite-plugin-pwa/releases for the latest 0.x tag.

**vite.config.ts changes:**

```typescript
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "B1 Cafe",
        short_name: "B1",
        description: "Cafe ordering and operations",
        theme_color: "#5E8B8B",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Cache strategy: network-first for API, stale-while-revalidate for assets
        runtimeCaching: [
          {
            // tRPC API calls — always network-first (orders must be live)
            urlPattern: /^\/api\/trpc\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "trpc-api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 },
            },
          },
          {
            // SSE endpoint — do NOT cache, exclude entirely
            urlPattern: /^\/api\/sse\/.*/,
            handler: "NetworkOnly",
          },
          {
            // Static assets — stale-while-revalidate
            urlPattern: /\.(?:js|css|woff2|png|jpg|webp|svg)$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "static-assets" },
          },
        ],
      },
    }),
  ],
  // ... rest of config unchanged
});
```

**Install prompt:** Use the browser's `beforeinstallprompt` event — no library needed. The
install prompt component is ~30 lines of React with a `useState` that stores the deferred event.

**Anti-pattern:** Do not use `CacheFirst` for tRPC endpoints. Order data is time-sensitive.
`NetworkOnly` for SSE prevents service worker interception of the streaming response.

**DB migration:** None.

---

## Feature 4: Staff Clock-in / Clock-out (PIN-based)

**Verdict: No new dependencies needed. DB schema partially exists — one column addition needed.**

**What's already built:**
- `staffClockEvents` table in schema.ts (lines 613–620): `venueId`, `staffId`, `eventType` (in/out),
  `clockedAt`, `note` — fully complete for hours tracking
- `clockRouter` in `api/clock-router.ts` — `clockIn`, `clockOut`, `getMyStatus`, `getShiftHistory`,
  `getHoursSummary` all implemented, including AU penalty rate flags
- `input-otp` 1.4.2 already installed — use this for the PIN entry UI (it's already a dep,
  likely used elsewhere for 2FA; the `<InputOTP>` component is the right primitive)
- `date-fns` 4.1.0 already installed — use `differenceInMinutes`, `format`, `startOfWeek`,
  `endOfWeek` for hours calculations in the UI display layer

**What's missing — schema addition required:**

`staffAccounts` has no `clockPin` column. The table has `tabletPin` on `venues` (for POS access)
but nothing per-staff. Add:

```
ALTER TABLE staff_accounts ADD COLUMN clock_pin VARCHAR(8);
```

In Drizzle schema:
```typescript
clockPin: varchar("clock_pin", { length: 8 }), // nullable — null means PIN not set
```

**DB migration: YES** — add `clockPin` to `staffAccounts`.

**PIN flow:**
1. Owner sets a 4-digit PIN per staff member in OwnerDashboard (`venue.updateStaff` mutation,
   store bcrypt hash or plain for tablet — plain is fine for a 4-digit internal PIN since it's
   not a password)
2. Staff faces a tablet PIN pad (`<InputOTP maxLength={4}>`) at `/clock` route
3. `clockRouter.clockIn` validates PIN via a lookup query, then inserts the event

**No new libraries needed.** Hours calculation uses `date-fns` already installed.

---

## Feature 5: Customer Order History (phone-number lookup)

**Verdict: No new dependencies needed. Backend query only.**

**What's needed:**

A new tRPC query (can go in `venue-router.ts` or a new `customer-router.ts`):

```typescript
getOrderHistory: publicQuery.input(z.object({
  venueId: z.number(),
  phone: z.string(),
})).query(async ({ input }) => {
  const db = getDb();
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalAmount: orders.totalAmount,
      status: orders.status,
      createdAt: orders.createdAt,
      pickupTime: orders.pickupTime,
      items: sql<string>`JSON_AGG(
        JSON_BUILD_OBJECT(
          'itemName', ${orderItems.itemName},
          'quantity', ${orderItems.quantity},
          'unitPrice', ${orderItems.unitPrice}
        )
      )`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(
      eq(orders.venueId, input.venueId),
      eq(orders.customerPhone, input.phone),
      ne(orders.status, "cancelled"),
    ))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))
    .limit(20);
})
```

**One-tap reorder:** Pass the items array from history into the existing cart state. No new backend
needed — the frontend constructs a new cart from the stored `itemName`/`quantity` data and POSTs
a new `createCheckoutSession`.

**Rate-limiting note:** Phone lookups should use the existing `rate-limit.ts` middleware to prevent
enumeration of phone numbers (already available in `api/lib/rate-limit.ts`).

**DB migration:** None.

---

## Feature 6: Tipping Prompts

**Verdict: No new dependencies needed. Tip infrastructure is ~90% done.**

**What exists:**
- `orders.tipAmount` column is in the schema (line 215)
- `stripe-checkout-router.ts` already accepts `tipAmount: z.number().min(0).default(0)` (line 75)
- The Stripe webhook reads `meta.tipAmount` and stores it on the order (boot.ts line 586)
- `broadcastToVenue` payload includes the order (so KDS sees tip amounts)

**What's missing — frontend only:**

The VenuePublic checkout flow needs a tip selector component before the Stripe redirect:

```typescript
// Tip options component — no new deps
const TIP_OPTIONS = [
  { label: "10%", value: 0.10 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.20 },
  { label: "Custom", value: "custom" },
];
```

The selected tip amount (in dollars) is passed into the existing `createCheckoutSession` mutation.
Stripe adds it as a separate line item — that logic is already in `stripe-checkout-router.ts`.

**Stripe line item approach:** Tip is passed as a dollar amount and added as an additional
`line_items` entry with name "Tip". This is already the pattern used — verify line 75–80 of
`stripe-checkout-router.ts` includes the tip in amount calculation.

**DB migration:** None. `tipAmount` column already exists.

---

## Feature 7: Upsell Engine (co-occurrence query)

**Verdict: No new dependencies needed. Pure SQL/Drizzle query.**

**Co-occurrence query pattern** — finds items most frequently ordered together with a given item:

```typescript
// Given a set of menuItemIds in the current cart, find what else people ordered with those items
getUpsells: publicQuery.input(z.object({
  venueId: z.number(),
  cartItemIds: z.array(z.number()),
})).query(async ({ input }) => {
  const db = getDb();
  const { cartItemIds, venueId } = input;
  if (cartItemIds.length === 0) return [];

  // Step 1: find all orders that contained any of the cart items
  const coOrders = await db
    .selectDistinct({ orderId: orderItems.orderId })
    .from(orderItems)
    .where(inArray(orderItems.menuItemId, cartItemIds));

  if (coOrders.length === 0) return [];
  const coOrderIds = coOrders.map(r => r.orderId);

  // Step 2: in those orders, count frequency of items NOT already in the cart
  const suggestions = await db
    .select({
      menuItemId: orderItems.menuItemId,
      itemName: orderItems.itemName,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(orderItems)
    .where(and(
      inArray(orderItems.orderId, coOrderIds),
      notInArray(orderItems.menuItemId, cartItemIds),
      // Join to menuItems to filter by venueId and availability
      exists(
        db.select({ one: sql`1` })
          .from(menuItems)
          .where(and(
            eq(menuItems.id, orderItems.menuItemId),
            eq(menuItems.venueId, venueId),
            eq(menuItems.isAvailable, true),
          ))
      ),
    ))
    .groupBy(orderItems.menuItemId, orderItems.itemName)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(3);

  return suggestions;
})
```

**Performance note:** For cafes with <50k orders this runs in <50ms without an index. Add a
composite index on `order_items(menu_item_id, order_id)` if query time degrades:

```sql
CREATE INDEX idx_order_items_menu_order ON order_items(menu_item_id, order_id);
```

**DB migration:** No schema change. Optional index addition is non-breaking.

The `inArray` and `notInArray` helpers are already available in `drizzle-orm`.

---

## Summary: New Dependencies

| Library | Version | Install Command | Required For |
|---------|---------|-----------------|--------------|
| `vite-plugin-pwa` | `^0.21.0` | `npm install -D vite-plugin-pwa` | PWA / Add to Home Screen |

**Everything else is covered by the existing stack.**

---

## DB Migrations Required

| Feature | Migration | Breaking? |
|---------|-----------|-----------|
| Staff Clock-in PIN | `ALTER TABLE staff_accounts ADD COLUMN clock_pin VARCHAR(8)` | No — nullable column |
| Upsell index (optional) | `CREATE INDEX idx_order_items_menu_order ON order_items(menu_item_id, order_id)` | No — additive |

All other features require no schema changes.

---

## Confirmed: Do NOT Add

| Library | Reason |
|---------|--------|
| `socket.io` / `ws` | SSE is sufficient for one-way push; WebSocket adds server complexity with no benefit for this use case |
| `hono/streaming` `streamSSE` | Existing raw `ServerResponse` SSE pattern in boot.ts works and avoids Hono fetch-adapter conflicts |
| `@tanstack/react-table` | KDS swimlane is a simple flex/grid layout — a full table library is overengineered |
| `luxon` / `dayjs` | `date-fns` 4.x is already installed and tree-shakeable; a second date library creates inconsistency |
| `react-beautiful-dnd` | `@dnd-kit/core` + `@dnd-kit/sortable` are already installed if drag ordering of KDS tickets is ever needed |
| `next-pwa` | Next.js-specific — wrong ecosystem |
| Any GraphQL library | tRPC already handles typed API; upsell engine is a standard Drizzle query |

---

## Sources

- Direct inspection of `app/api/lib/sse-store.ts`, `app/api/boot.ts` (lines 361–384), `app/api/clock-router.ts`
- Direct inspection of `app/db/schema.ts` — `staffClockEvents`, `staffAccounts`, `orders`, `orderItems` tables
- Direct inspection of `app/api/stripe-checkout-router.ts` — tip handling at line 75
- Direct inspection of `app/package.json` — confirmed installed versions of all mentioned packages
- vite-plugin-pwa changelog: https://github.com/vite-pwa/vite-plugin-pwa/blob/main/CHANGELOG.md (MEDIUM confidence — version compatibility based on known release history, verify before install)
- Drizzle ORM `inArray`/`notInArray`: https://orm.drizzle.team/docs/operators
