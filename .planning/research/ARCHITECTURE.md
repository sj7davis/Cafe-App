# Architecture: v2.2 Full Operations Suite — Integration Map

**Project:** B1 Platform Cafe SaaS
**Milestone:** v2.2
**Researched:** 2026-05-29
**Basis:** Direct inspection of boot.ts, schema.ts, KitchenDisplay.tsx, StaffDashboard.tsx, VenuePublic.tsx, App.tsx, clock-router.ts, sse-store.ts, venue-router.ts

---

## Feature 1: SSE Live Orders

### Current State

The SSE infrastructure is fully wired. `app/api/lib/sse-store.ts` maintains a `Map<venueId, Set<ServerResponse>>`. `boot.ts` exposes `GET /api/sse/orders/:venueId` which registers the response object and sends `": ping\n\n"` every 25 seconds. `broadcastToVenue(venueId, event, data)` is called in the Stripe webhook on order confirmation.

`KitchenDisplay.tsx` already has a working SSE consumer (lines 56–77):
```
const es = new EventSource(`/api/sse/orders/${venueId}`)
es.addEventListener('order_update', refresh)
es.addEventListener('order_new', () => { refresh(); playChime() })
const fallback = setInterval(refresh, 30000)
```

### What Is Missing

`StaffDashboard.tsx` and `OwnerDashboard.tsx` currently use manual refetch or polling. Neither subscribes to SSE.

### Integration Points

**Modified files:**
- `app/src/pages/StaffDashboard.tsx` — add SSE `useEffect` inside the Orders tab section (same pattern as KitchenDisplay, conditioned on `!!venueId`)
- `app/src/pages/OwnerDashboard.tsx` — add SSE `useEffect` in whatever tab renders live orders; invalidate the relevant tRPC query on `order_update`

**New files:**
- `app/src/hooks/useVenueSSE.ts` — extract the reconnecting EventSource pattern into a shared hook so all three pages use identical logic

### SSE Reconnect Pattern (React Hook)

```typescript
// app/src/hooks/useVenueSSE.ts
export function useVenueSSE(
  venueId: number | null,
  handlers: Record<string, () => void>
) {
  useEffect(() => {
    if (!venueId) return;
    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(`/api/sse/orders/${venueId}`);
      es.onerror = () => {
        es.close();
        retryTimer = setTimeout(connect, 5000); // exponential backoff next step
      };
      Object.entries(handlers).forEach(([event, fn]) => {
        es.addEventListener(event, fn);
      });
    }

    connect();
    return () => { es?.close(); clearTimeout(retryTimer); };
  }, [venueId]);
}
```

**One connection per page, not shared across pages.** KDS runs on a separate browser tab/device; StaffDashboard and OwnerDashboard are on different sessions. Sharing a single connection across different page components in the same SPA would require a context provider and is not worth the complexity for this use case. Each page that needs real-time opens its own EventSource. The server-side `Set<ServerResponse>` per venue handles N concurrent listeners efficiently.

### Data Flow

```
Stripe webhook → broadcastToVenue(venueId, "order_update", {orderId, status, orderNumber})
                       │
              sse-store broadcasts SSE frame to all registered ServerResponse objects
                       │
          ┌────────────┼────────────────────┐
          ▼            ▼                    ▼
  KitchenDisplay  StaffDashboard      OwnerDashboard
  EventSource     EventSource         EventSource
  → invalidate    → invalidate        → invalidate
    listOrders      listOrders          listOrders
```

### Build Order Dependency

None. SSE infrastructure exists. This is purely frontend wiring.

---

## Feature 2: Full KDS Page

### Current State

`KitchenDisplay.tsx` at route `/kitchen` is already a full KDS. It:
- Has its own staff login gate (username + password via `staffAuth.login`)
- Opens an EventSource on `/api/sse/orders/:venueId`
- Queries `venue.listOrders` with `statuses: ['pending', 'confirmed', 'ready']`
- Renders three columns (NEW / IN PROGRESS / READY)
- Plays a Web Audio API chime on new orders

The existing page is functionally complete as a KDS.

### What Is Missing / Should Change

The route is `/kitchen` with no slug — the venue is identified only by a numeric venueId typed into a login form. This is fragile for multi-tenant deployments. A dedicated `/kitchen/:slug` route would allow tablets to be bookmarked per venue.

### Integration Points

**Modified files:**
- `app/src/App.tsx` — add `<Route path="/kitchen/:slug" element={<KitchenDisplay />} />` alongside the existing `/kitchen` route (keep old route for backwards compat)
- `app/src/pages/KitchenDisplay.tsx` — read `useParams<{ slug: string }>()` and resolve venueId from slug via a tRPC call (`venue.getPublicVenue` already exists and returns `{ id, slug, ... }`); remove the manual venueId input from the login form when slug is present

**New files:** None required. The existing KitchenDisplay handles all KDS functionality.

### Auth Decision

Keep the existing staff username/password gate. Do not make it public-URL accessible without auth — the KDS can advance and cancel orders which are destructive operations. PIN auth (just a 4-digit code) would be an acceptable simplification but requires a new tRPC mutation; stick with full staff login for v2.2.

### Data Flow

```
/kitchen/:slug
  → useParams slug
  → trpc.venue.getPublicVenue({ slug }) → { id: venueId }
  → staff login form with venueId pre-filled
  → EventSource /api/sse/orders/:venueId
  → trpc.venue.listOrders({ venueId, statuses: [...], limit: 100 })
```

---

## Feature 3: Staff Clock-In / Clock-Out

### Current State

This feature is **fully implemented** in the backend and partially in the frontend.

**Backend (complete):**
- `app/db/schema.ts` — `staffClockEvents` table exists: `{ id, venueId, staffId, eventType: "in"|"out", clockedAt, note }`
- `app/api/clock-router.ts` — `clockIn`, `clockOut`, `getMyStatus`, `getShiftHistory`, `getHoursSummary` all implemented

**Frontend:**
- `StaffDashboard.tsx` has a `clock` tab in `buildTabs()` (line 65) — this tab exists in the nav but its render content must be checked

### What Needs Building

**Modified files:**
- `app/src/pages/StaffDashboard.tsx` — implement the `clock` tab body: show current status (clocked in/out), a large Clock In / Clock Out button, and today's elapsed time. Use `trpc.clock.getMyStatus` on mount and after each mutation.
- `app/src/pages/OwnerDashboard.tsx` — add a Timesheets section that calls `trpc.clock.getHoursSummary({ token, days: 14 })` and renders a table: staff name | total hours | shifts | penalty flags

### No New DB Tables Needed

`staffClockEvents` schema is already complete. No `shiftId` column needed — shifts are reconstructed by pairing sequential in/out events in `getHoursSummary`.

### Clock-In UI Location Decision

Clock-in lives in `StaffDashboard.tsx` (the `clock` tab). A dedicated tablet clock-in page is not needed for v2.2. If a wall-mounted tablet use case arises later, extract to `/clock/:slug` with PIN entry.

### Data Flow — Clock-In

```
Staff opens StaffDashboard → clock tab
  → trpc.clock.getMyStatus({ token })  →  { isClockedIn: bool, lastEvent }
  → displays status badge + elapsed time (if clocked in: Date.now() - lastEvent.clockedAt)
  → user taps "Clock In"
  → trpc.clock.clockIn({ token })      →  { ok, clockedAt, penaltyFlag }
  → if penaltyFlag: show toast warning ("Saturday penalty rate applies")
  → re-fetch getMyStatus
```

### Data Flow — Owner Timesheet View

```
OwnerDashboard → Staff tab → Timesheets section
  → trpc.clock.getHoursSummary({ token, days: 14 })
  → renders table: [staffName | totalHours | shifts | penaltyFlags]
  → "Export CSV" button (client-side: construct CSV from array, trigger download)
```

---

## Feature 4: PWA

### Current State

No PWA configuration exists. `vite.config.ts` has no `vite-plugin-pwa`. No `manifest.json` in `app/public/`.

### What Needs Building

**New files:**
- `app/public/manifest.json` — Web App Manifest (name, short_name, icons, start_url, display: "standalone", background_color, theme_color)
- `app/public/icons/` — icon set: 192x192 and 512x512 PNG (minimum); also 180x180 Apple touch icon
- `app/src/hooks/usePwaInstall.ts` — captures the `beforeinstallprompt` event, exposes `{ canInstall, prompt }` to components

**Modified files:**
- `app/vite.config.ts` — add `vite-plugin-pwa` (package: `vite-plugin-pwa`) with Workbox config
- `app/src/main.tsx` — register service worker (plugin handles this automatically via `registerType: 'autoUpdate'`)
- `app/src/pages/VenuePublic.tsx` — add an install prompt banner (shown when `canInstall` is true, dismissible)
- `index.html` — add `<link rel="manifest" href="/manifest.json">` and `<meta name="theme-color">`

### Vite Config Change

```typescript
import { VitePWA } from 'vite-plugin-pwa';

// In plugins array:
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icons/*.png'],
  manifest: false, // use our own manifest.json in public/
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^\/api\/trpc\/venue\.getPublicVenue/,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'venue-cache', expiration: { maxAgeSeconds: 86400 } }
      },
      {
        urlPattern: /^\/api\/trpc\/venue\.listMenuItems/,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'menu-cache', expiration: { maxAgeSeconds: 3600 } }
      }
    ]
  }
})
```

### Offline Strategy

Cache only: `VenuePublic` menu browsing (venue data + menu items via tRPC GET queries). Do not cache: checkout, order placement, SSE, auth. The Workbox `StaleWhileRevalidate` handler on the two menu tRPC queries gives offline menu display while silently refreshing in background.

### Install Prompt Pattern

```typescript
// app/src/hooks/usePwaInstall.ts
export function usePwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const install = async () => { if (!prompt) return; prompt.prompt(); await prompt.userChoice; setPrompt(null); };
  return { canInstall: !!prompt, install };
}
```

In `VenuePublic.tsx`, render a sticky bottom banner if `canInstall`:
```tsx
{canInstall && (
  <div style={{ position: 'fixed', bottom: 0, ... }}>
    Add {venue.name} to your home screen
    <button onClick={install}>Install</button>
    <button onClick={dismiss}>Not now</button>
  </div>
)}
```

### Build Order Dependency

PWA is self-contained. Install `vite-plugin-pwa` first, then manifest, then hook, then VenuePublic banner.

---

## Feature 5: Customer Order History

### Current State

No `getOrderHistory` query exists in `venue-router.ts`. Orders have `customerPhone` stored. The `orders` table has `customerPhone`, `customerName`, `createdAt`, `orderNumber`, `totalAmount`, `status`. `orderItems` is a separate join.

`VenuePublic.tsx` has extensive checkout state but no order history panel.

### New Backend

**Modified file:** `app/api/venue-router.ts` — add:

```typescript
getOrderHistory: publicQuery.input(z.object({
  venueId: z.number().int().positive(),
  phone: z.string().min(8),
})).query(async ({ input }) => {
  const db = getDb();
  const recentOrders = await db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    status: orders.status,
    totalAmount: orders.totalAmount,
    createdAt: orders.createdAt,
    pickupTime: orders.pickupTime,
  })
    .from(orders)
    .where(and(
      eq(orders.venueId, input.venueId),
      eq(orders.customerPhone, input.phone),
    ))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  // Fetch items for each order
  const orderIds = recentOrders.map(o => o.id);
  const items = orderIds.length > 0
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : [];

  return recentOrders.map(o => ({
    ...o,
    items: items.filter(i => i.orderId === o.id),
  }));
}),
```

No new DB table needed. Phone number is the lookup key — consistent with how loyalty accounts work.

### Frontend Integration

**Modified file:** `app/src/pages/VenuePublic.tsx`

Placement: After the user enters their phone number in the checkout form and tabs out (onBlur), fetch history. If results exist, render a collapsible "Your previous orders" panel above the checkout button.

State additions:
```typescript
const [orderHistory, setOrderHistory] = useState<any[]>([]);
const [showHistory, setShowHistory] = useState(false);
const orderHistoryQuery = trpc.venue.getOrderHistory.useQuery(
  { venueId: venue.id, phone: checkoutPhone },
  { enabled: checkoutPhone.length >= 8 }
);
```

**Reorder flow:** Each history entry has a "Reorder" button. On click, map the `items` array back into `CartItem[]` shape and call `setCart(reorderItems)`. Note: `menuItemId` and `itemName` are stored on `orderItems`, price must be re-fetched from the current menu (use the in-memory `menuItems` array already loaded by `listMenuItems` query). If an item no longer exists on the menu, skip it with a toast.

### Data Flow

```
User types phone in checkout → onBlur triggers
  → trpc.venue.getOrderHistory({ venueId, phone })
  → if results.length > 0: show "Previous orders" panel
  → user taps "Reorder #B1-XYZ"
  → map order.items → CartItem[] using current menuItems for price lookup
  → setCart(mapped)
  → panel collapses, cart slides open
```

---

## Feature 6: Tipping

### Current State

Tipping is **substantially complete**. In `VenuePublic.tsx`:
- `tipOption` state (0 | 10 | 15 | 20 | 'custom') exists (line 248)
- `tipCustom` string state for custom amount (line 249)
- `tipAmount` computed value (lines 730–733)
- Tip UI renders inside the checkout flow at lines 1709–1767 (percentage buttons + custom input)
- `tipAmount` is passed to Stripe checkout session metadata and stored on `orders.tipAmount`
- The Stripe webhook correctly excludes tip from loyalty points calculation (line 627)
- Order summary shows tip line item (lines 1864–1867)

### What Is Actually Missing

Reviewing the checkout flow sequence in VenuePublic: the tip prompt currently appears inside the checkout panel. The question is whether it appears **before** the final checkout/pay button in a way that's prominent enough.

**Only change needed:** Ensure the tip UI is positioned as the final step before the checkout button, not buried mid-form. This is a layout refactor, not a feature build. Move the tip section to immediately precede the "Place Order" / "Pay with Card" buttons if it is not already there.

No Stripe line item changes needed — Stripe already receives `tipAmount` in metadata and the total is calculated correctly. No new tRPC mutations needed.

**Modified file:** `app/src/pages/VenuePublic.tsx` — reorder JSX so tip selection is the last input before the submit button. No logic changes.

---

## Feature 7: Upsell Engine

### Current State

The backend is **fully implemented**. `venue-router.ts` has `getUpsellSuggestions` (lines 1754–1793):
- Input: `{ venueId, slugs: string[] }` (cart item slugs)
- Logic: finds orders from last 90 days containing cart items, counts co-purchased items, returns top 3 by frequency
- No minimum threshold filter — items with any co-purchase count are returned

`VenuePublic.tsx` has upsell state scaffolding:
```typescript
const [showUpsell, setShowUpsell] = useState(false);
const shownUpsell = useRef(false);
const upsellDismissTimer = useRef<...>(null);
```

### What Is Missing

The tRPC query call and the UI panel are not yet wired up in VenuePublic.

### Frontend Integration

**Modified file:** `app/src/pages/VenuePublic.tsx`

Query (add near other trpc queries):
```typescript
const cartSlugs = cart.map(i => {
  // menuItems is already fetched; find slug by menuItemId
  return menuItemsData?.find(m => m.id === i.menuItemId)?.slug ?? '';
}).filter(Boolean);

const upsellQuery = trpc.venue.getUpsellSuggestions.useQuery(
  { venueId: venue.id, slugs: cartSlugs },
  { enabled: cart.length > 0 && !!venue }
);
```

**Trigger:** When `cart.length` goes from 0 to >0 for the first time in a session (or when cart changes), check `upsellQuery.data`. If results exist and `!shownUpsell.current`, set `showUpsell(true)` and `shownUpsell.current = true`. Auto-dismiss after 8 seconds.

**Placement:** The upsell panel appears at the bottom of the cart slide-over (the same `showCart` panel), above the checkout button. It should be a horizontal scroll of 1–3 item cards with an "Add" button each. Not a modal — inline within the cart.

**Minimum threshold:** The backend does not filter by minimum co-purchase count. Add `.filter(i => i.cnt >= 3)` client-side, or pass a `minCount` param to the backend query. Adding server-side is cleaner:

```typescript
// In getUpsellSuggestions, change the .limit(3) section:
const qualified = coPurchased.filter(r => r.cnt >= 3);
if (qualified.length === 0) return [];
const topIds = qualified.map(r => r.menuItemId);
```

**Modified file:** `app/api/venue-router.ts` — add the `>= 3` filter to `getUpsellSuggestions`.

### Data Flow

```
User adds item to cart
  → cartSlugs derived from cart + menuItems
  → trpc.venue.getUpsellSuggestions({ venueId, slugs }) fires
  → if results ≥ 1 and !shownUpsell.current:
      setShowUpsell(true), shownUpsell.current = true
      auto-dismiss after 8s via upsellDismissTimer
  → Upsell panel renders in cart slide-over:
      [Item A card] [Item B card] [Item C card]
      each: name, price, "Add" button → addToCart(item)
  → dismiss: setShowUpsell(false)
```

---

## Build Order (Dependency-Respecting)

| Step | Feature | Files Touched | Blocker |
|------|---------|---------------|---------|
| 1 | Extract `useVenueSSE` hook | `hooks/useVenueSSE.ts` (new) | None |
| 2 | Wire SSE to StaffDashboard + OwnerDashboard | Both page files (modify) | Step 1 |
| 3 | KDS slug route | `App.tsx` (modify), `KitchenDisplay.tsx` (modify) | None |
| 4 | Clock UI in StaffDashboard | `StaffDashboard.tsx` (modify) | None — backend done |
| 5 | Timesheet in OwnerDashboard | `OwnerDashboard.tsx` (modify) | None — backend done |
| 6 | Upsell backend threshold fix | `venue-router.ts` (modify) | None |
| 7 | Upsell UI in VenuePublic | `VenuePublic.tsx` (modify) | Step 6 |
| 8 | Order history backend | `venue-router.ts` (modify) | None |
| 9 | Order history UI in VenuePublic | `VenuePublic.tsx` (modify) | Step 8 |
| 10 | Tip UI reorder | `VenuePublic.tsx` (modify) | None |
| 11 | PWA manifest + icons | `public/manifest.json`, `public/icons/` (new) | None |
| 12 | PWA vite config + hook | `vite.config.ts` (modify), `hooks/usePwaInstall.ts` (new) | Step 11 |
| 13 | PWA install banner in VenuePublic | `VenuePublic.tsx` (modify) | Step 12 |

Steps 3–10 can be parallelised — they are independent of each other. Steps 11–13 must be sequential.

---

## New vs Modified Files Summary

### New Files

| File | Purpose |
|------|---------|
| `app/src/hooks/useVenueSSE.ts` | Shared reconnecting EventSource hook |
| `app/src/hooks/usePwaInstall.ts` | Captures beforeinstallprompt, exposes install() |
| `app/public/manifest.json` | Web App Manifest for PWA |
| `app/public/icons/icon-192.png` | PWA icon |
| `app/public/icons/icon-512.png` | PWA icon |

### Modified Files

| File | Change Summary |
|------|---------------|
| `app/src/App.tsx` | Add `/kitchen/:slug` route |
| `app/src/pages/KitchenDisplay.tsx` | Read slug param, resolve venueId from tRPC |
| `app/src/pages/StaffDashboard.tsx` | SSE hook, clock tab body (clock in/out UI) |
| `app/src/pages/OwnerDashboard.tsx` | SSE hook, timesheet section |
| `app/src/pages/VenuePublic.tsx` | Order history panel, upsell query+UI, tip layout reorder, PWA install banner |
| `app/api/venue-router.ts` | Add `getOrderHistory`, add `>= 3` threshold to `getUpsellSuggestions` |
| `app/vite.config.ts` | Add `vite-plugin-pwa` with Workbox config |
| `index.html` | Add manifest link + theme-color meta |

### No New DB Tables Needed

| Feature | Reason |
|---------|--------|
| SSE | Infrastructure exists |
| KDS | Uses existing orders + orderItems |
| Clock-in/out | `staffClockEvents` table exists with correct schema |
| PWA | Frontend only |
| Order history | Query over existing `orders` + `orderItems` by phone |
| Tipping | `orders.tipAmount` column exists, Stripe integration complete |
| Upsell | `getUpsellSuggestions` router exists, queries existing `orderItems` |
