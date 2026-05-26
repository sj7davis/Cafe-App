# Phase 2: Order Tracking & Staff Dashboard - Research

**Researched:** 2026-05-24
**Domain:** Public order status page (unauthenticated) + polling-based staff order dashboard
**Confidence:** HIGH

---

## Summary

Phase 2 has two distinct halves that share a common backend foundation. The backend is almost complete: `orders`, `orderItems`, `listOrders`, `getOrderItems`, `updateOrderStatus`, and `createOrder` all exist and work. The schema already has a `staffNote` column on `orders` — STAFF-03 is a backend change to `updateOrderStatus` plus a UI addition.

**Customer side (ORD-01 to ORD-04):** A new page `OrderStatus.tsx` at `/order/:orderNumber` must be created and registered in `App.tsx`. This page is public (no auth) — it looks up an order by `orderNumber` string. A new backend query `getOrderByNumber` is needed because no mutation or query currently looks up by `orderNumber`; all order queries use numeric `orderId` or `venueId`. The page must show: status with a visual stepper (pending → confirmed → ready → completed), estimated pickup time (`orders.pickupTime`), and the order items (via `getOrderItems`). After checkout, `VenuePublic.tsx` currently shows a generic toast and resets — it must instead capture the returned `orderNumber` from `createOrder.onSuccess` and persist it so the post-checkout screen (or the success toast) can show a link to `/order/:orderNumber`.

**Staff side (STAFF-01 to STAFF-03):** `OrdersTab` inside `StaffDashboard.tsx` currently fetches orders once on mount with no polling. Three additions are needed: (1) add `refetchInterval: 20_000` to the `listOrders` `useQuery` call; (2) track seen order IDs across polls and apply a highlight style to newly appeared rows; (3) extend `updateOrderStatus` on the backend to accept an optional `staffNote` field and persist it, and extend the `<select>` in the UI to open a note input when status is changed.

No new npm packages are needed. All work is pure TypeScript/React + Drizzle DB calls using the existing tRPC setup.

**Primary recommendation:** Three backend mutations need to change or be added (`getOrderByNumber` query, `updateOrderStatus` extended with `staffNote`), two new or changed frontend files (`OrderStatus.tsx` new, `VenuePublic.tsx` modified for post-checkout link, `StaffDashboard.tsx` modified for polling + highlight + note), and one route added to `App.tsx`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ORD-01 | Customer can view order status at `/order/:orderNumber` without logging in | Requires new `OrderStatus.tsx` page + new `venue.getOrderByNumber` backend query. Route `/order/:orderNumber` does not exist in `App.tsx`. No auth needed — query is public. |
| ORD-02 | Status shows progress indicator (pending → confirmed → ready → completed) | Status enum on `orders` table: `["pending", "confirmed", "ready", "completed", "cancelled"]`. Stepper component is pure UI with no new data requirements. `StatusBadge` helper already exists in `StaffDashboard.tsx` for colour reference. |
| ORD-03 | Post-checkout screen includes link to order status page | `createOrder.onSuccess` in `VenuePublic.tsx` currently receives `{ orderId, orderNumber, totalAmount }`. `orderNumber` is already returned. The success toast just says "Order placed successfully!" — it must instead transition to a post-checkout panel that shows the order number and a link to `/order/:orderNumber`. |
| ORD-04 | Status page shows estimated pickup time and order items | `orders.pickupTime` is `varchar(32)` storing the string (e.g., "ASAP" or "10:30"). `getOrderItems` query exists and returns `orderItems` rows including `itemName`, `quantity`, `unitPrice`. |
| STAFF-01 | Staff dashboard auto-refreshes every 20 seconds | `trpc.venue.listOrders.useQuery` in `OrdersTab` needs `refetchInterval: 20_000` added to its options. tRPC v11 query options pass through to TanStack Query — `refetchInterval` is a supported TanStack Query option. |
| STAFF-02 | New orders are visually highlighted when they appear | Track the set of order IDs seen on the previous poll. After each refetch, compare. New IDs get a highlight style (e.g., amber left border + light background) that auto-clears after a timeout or next poll cycle. |
| STAFF-03 | Staff can add internal note when updating order status | `orders.staffNote` column is `text("staff_note")` — already in schema. `updateOrderStatus` mutation currently accepts `{ token, orderId, status }` — extend input with `staffNote: z.string().optional()` and add it to the `db.update` set object. UI: when staff changes the `<select>`, open an inline note input before confirming. |
</phase_requirements>

---

## Standard Stack

### Core (no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 + TypeScript | 19.x | Frontend UI | Project stack |
| react-router v7 | 7.x | `/order/:orderNumber` route, `useParams`, `Link` | Already used throughout |
| tRPC client | current | Type-safe API calls | All pages use `trpc.venue.*` pattern |
| TanStack Query (via tRPC) | current | `refetchInterval` for polling | Underlying query layer for tRPC's `useQuery` |
| Drizzle ORM | current | `getOrderByNumber`, extended `updateOrderStatus` | All backend queries use Drizzle |
| jose | current | JWT verify in extended `updateOrderStatus` | Established pattern for authed mutations |
| Tailwind CSS | current | Utility classes where used | Project convention |
| lucide-react | current | Icons for stepper (CheckCircle, Clock, etc.) | Already imported in both StaffDashboard and VenuePublic |

### No new dependencies required.

**Installation:** None.

---

## Architecture Patterns

### Relevant Project Structure

```
app/
├── api/
│   └── venue-router.ts          # ADD: getOrderByNumber query; EXTEND: updateOrderStatus with staffNote
├── src/
│   ├── App.tsx                  # ADD: <Route path="/order/:orderNumber" element={<OrderStatus />} />
│   └── pages/
│       ├── OrderStatus.tsx      # NEW — public order status page
│       ├── VenuePublic.tsx      # MODIFY — capture orderNumber post-checkout, show status link
│       └── StaffDashboard.tsx   # MODIFY — OrdersTab: polling + highlight + note input
```

### Pattern 1: New Public Query — getOrderByNumber

**What:** Backend query that looks up an order by its human-readable `orderNumber` string (e.g., "B1-LXK3P7"). Returns the order row and its items. No auth required — order number is the access credential (unguessable).

**Why needed:** All existing order queries use numeric `orderId` or `venueId`. Customers only have the `orderNumber` printed on their receipt/link.

**Example:**
```typescript
// venue-router.ts — add after getOrderItems
getOrderByNumber: publicQuery.input(z.object({
  orderNumber: z.string().min(1),
})).query(async ({ input }) => {
  const db = getDb();
  const results = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, input.orderNumber))
    .limit(1);
  if (!results[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
  const order = results[0];
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  return { order, items };
}),
```

**Security note:** `orderNumber` format is `B1-${Date.now().toString(36).toUpperCase()}` — base-36 timestamp, effectively unguessable for a casual attacker. No auth needed. Do not expose staffNote in this response — strip it before returning.

### Pattern 2: OrderStatus.tsx — Public Status Page

**What:** New page at `/order/:orderNumber`. Uses `useParams` to extract `orderNumber`, calls `trpc.venue.getOrderByNumber.useQuery`, renders a status stepper and order items list.

**Key facts:**
- No auth check — this page is intentionally public
- The route `/order/:orderNumber` does not conflict with any existing route
- Use `refetchInterval: 30_000` on the status query so the customer sees updates without manual refresh
- Status stepper: 4 steps (pending, confirmed, ready, completed). "cancelled" is a terminal state, show a distinct cancelled UI instead of the stepper
- `pickupTime` is stored as a raw string (whatever the customer typed at checkout, or "ASAP") — display as-is

**Example skeleton:**
```typescript
// src/pages/OrderStatus.tsx
import { useParams, Link } from 'react-router';
import { trpc } from '@/providers/trpc';

const STEPS = ['pending', 'confirmed', 'ready', 'completed'] as const;

export default function OrderStatus() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { data, isLoading, error } = trpc.venue.getOrderByNumber.useQuery(
    { orderNumber: orderNumber || '' },
    { enabled: !!orderNumber, refetchInterval: 30_000 }
  );

  if (isLoading) return <LoadingState />;
  if (error || !data) return <NotFoundState />;

  const { order, items } = data;
  const currentStep = STEPS.indexOf(order.status as typeof STEPS[number]);

  return (/* stepper UI + items list + pickup time */);
}
```

### Pattern 3: Post-Checkout Link in VenuePublic.tsx

**What:** After order placement, instead of a 5-second auto-dismissing toast, show a persistent "Order Confirmed" panel inside the cart drawer (or replace the drawer content) that includes the order number and a link to `/order/:orderNumber`.

**Key facts:**
- `createOrder.onSuccess` already receives `(data)` where `data = { orderId, orderNumber, totalAmount }`
- Currently: `setOrderSuccess(true); setTimeout(() => setOrderSuccess(false), 5000)` — clears after 5s, loses the order number
- Fix: add `const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null)` — set it in `onSuccess`, use it to render the confirmation panel
- The confirmation panel replaces the cart contents when `placedOrderNumber` is set
- Use `<Link to={/order/${placedOrderNumber}}>` — react-router Link, consistent with Login.tsx pattern

```typescript
// VenuePublic.tsx — updated createOrder mutation
const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);

const createOrder = trpc.venue.createOrder.useMutation({
  onSuccess: (data) => {
    setCart([]);
    setPlacedOrderNumber(data.orderNumber);  // persist for link
    setShowCart(true);  // keep drawer open to show confirmation
  },
});
```

### Pattern 4: Polling + New Order Highlight in OrdersTab

**What:** Add `refetchInterval: 20_000` to the `listOrders` query. Track previously seen order IDs in a ref. After each refetch, new IDs receive a temporary highlight class/style.

**Key facts:**
- `refetchInterval` is passed in the query options object, same position as `enabled`
- Use `useRef<Set<number>>` to track known IDs (a ref, not state, to avoid re-render on update)
- On each render where `ordersList` changes, diff against `knownIds.current` to find new ones
- Store new IDs in a `useState<Set<number>>` so that highlighting causes a re-render
- Auto-clear highlight after 8 seconds using `setTimeout`

```typescript
// OrdersTab — polling + highlight
const knownIds = useRef<Set<number>>(new Set());
const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());

const { data: ordersList } = trpc.venue.listOrders.useQuery(
  { venueId, status: statusFilter === 'all' ? undefined : statusFilter, limit: 50 },
  { refetchInterval: 20_000 }
);

useEffect(() => {
  if (!ordersList) return;
  const incoming = new Set(ordersList.map(o => o.id));
  const isFirstLoad = knownIds.current.size === 0;
  if (!isFirstLoad) {
    const fresh = new Set([...incoming].filter(id => !knownIds.current.has(id)));
    if (fresh.size > 0) {
      setNewOrderIds(fresh);
      setTimeout(() => setNewOrderIds(new Set()), 8_000);
    }
  }
  knownIds.current = incoming;
}, [ordersList]);
```

Highlight style: `background: '#fffbeb', borderLeft: '3px solid #d97706'` — matches the existing amber/yellow warning colour used for "pending" in `StatusBadge`.

### Pattern 5: Staff Note on updateOrderStatus

**What:** Extend the `updateOrderStatus` mutation input to include `staffNote?: string`. In the UI, when the staff selects a new status from the dropdown, pop a small inline note field so they can optionally type a note before confirming.

**Backend change:**
```typescript
// venue-router.ts — updateOrderStatus extension
updateOrderStatus: publicQuery.input(z.object({
  token: z.string(),
  orderId: z.number().int().positive(),
  status: z.enum(["pending", "confirmed", "ready", "completed", "cancelled"]),
  staffNote: z.string().optional(),   // ADD THIS
})).mutation(async ({ input }) => {
  const db = getDb();
  const updateData: Record<string, unknown> = { status: input.status };
  if (input.staffNote !== undefined) updateData.staffNote = input.staffNote;
  await db.update(orders).set(updateData).where(eq(orders.id, input.orderId));
  return { success: true };
}),
```

**UI change:** Replace the inline `<select onChange={...mutate}>` in `OrdersTab` with a row-level expandable note panel. When the select value changes, show a `<textarea>` + "Confirm" button in the row instead of immediately calling `mutate`. Calling "Confirm" fires `updateStatus.mutate({ token, orderId, status, staffNote })`.

### Anti-Patterns to Avoid

- **Do not use WebSockets or SSE:** Explicitly decided — polling only. `refetchInterval` on TanStack Query is the correct implementation.
- **Do not poll with `setInterval` manually:** Use `refetchInterval` on `useQuery`. Manual intervals conflict with React lifecycle and TanStack Query's caching.
- **Do not store newOrderIds in a ref instead of state:** Refs don't trigger re-renders. The highlight needs state.
- **Do not pass `staffNote` in the `getOrderByNumber` response:** Internal notes are staff-only. Strip `staffNote` from the public response.
- **Do not replace the cart drawer's backdrop click-to-close for the confirmation panel:** The post-checkout confirmation should close when the customer navigates to the order status page (via Link) or manually dismisses. Don't auto-close it.
- **Do not use `window.location.href` for the order status link:** Use `<Link to={...}>` from react-router, consistent with all other internal navigation.
- **Do not add a token requirement to `getOrderByNumber`:** The order number itself is the access key. Auth would break the customer UX (they're not logged in).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polling for new orders | Manual `setInterval` + fetch | `refetchInterval` on `trpc.*.useQuery` | TanStack Query handles deduplication, cleanup, and background refetch correctly |
| New order detection | Server-sent events / WebSocket | Client-side diff of `ordersList` between renders | No server infrastructure needed; 20-second delay is acceptable for MVP |
| Status stepper component | Third-party step library | Inline styled divs matching existing project design system | No shadcn/ui stepper exists; inline style is the project convention |
| Order lookup by number | Custom REST endpoint | `venue.getOrderByNumber` tRPC query | Consistent with the entire API surface |
| Highlight animation | CSS animation library | Inline style with border + background colour | Project uses inline styles throughout; no animation library present |

---

## Common Pitfalls

### Pitfall 1: First poll always highlights all orders

**What goes wrong:** On the very first load, `knownIds.current` is empty. Every order returned appears "new" and gets highlighted, even if they're all old orders.

**Why it happens:** The diff runs before the first load populates `knownIds`.

**How to avoid:** Guard with `if (knownIds.current.size === 0)` — treat the first load as a baseline, not a diff. Only set `newOrderIds` on subsequent polls. See code example in Pattern 4.

**Warning signs:** All orders highlighted on page load.

### Pitfall 2: staffNote not stripped from public getOrderByNumber response

**What goes wrong:** Internal staff notes become visible to customers on the public order status page.

**Why it happens:** `orders.$inferSelect` includes `staffNote`. If the query returns the whole row, staffNote is included.

**How to avoid:** In `getOrderByNumber`, explicitly select columns excluding `staffNote`, or destructure and omit before returning:
```typescript
const { staffNote: _omit, ...publicOrder } = order;
return { order: publicOrder, items };
```

**Warning signs:** TypeScript shows `staffNote` present in the data type on `OrderStatus.tsx`.

### Pitfall 3: orderNumber from createOrder not captured — link is lost

**What goes wrong:** The success toast disappears after 5 seconds and the customer loses their order number entirely. They can't find the status page.

**Why it happens:** Current code uses `setTimeout(() => setOrderSuccess(false), 5000)` which clears all state.

**How to avoid:** Use `placedOrderNumber` state (set in `onSuccess`, cleared only when user dismisses or navigates). Never auto-clear it on a timer — keep it until the user acts.

**Warning signs:** After checkout success, no way to navigate to `/order/:orderNumber`.

### Pitfall 4: refetchInterval resets the status filter

**What goes wrong:** When `listOrders` refetches, if React re-renders and re-mounts `OrdersTab`, the `statusFilter` state resets to `'all'`.

**Why it happens:** Tab switching unmounts and remounts components — not a `refetchInterval` issue per se, but a state persistence concern.

**How to avoid:** This is only a problem if the parent component unmounts `OrdersTab`. Since `StaffDashboard` renders `{activeTab === 'orders' && <OrdersTab ... />}`, navigating to another tab and back resets the filter. This is acceptable for MVP — the requirement only says polling must work, not that filter state must persist across tab switches. Do not over-engineer.

### Pitfall 5: updateOrderStatus token verification is missing

**What goes wrong:** The current `updateOrderStatus` mutation does NOT verify the JWT token — it accepts any `token` string and does no authentication. Any request with an arbitrary token can update any order's status.

**Why it happens:** Line 181-184 of `venue-router.ts` — `jwtVerify` is not called; the token is accepted but never verified.

**How to avoid:** When extending `updateOrderStatus` to add `staffNote`, also add proper token verification using the staff JWT pattern. The staff token is a different JWT than the owner token — check `staffAuth-router.ts` for how staff tokens are signed and verified. This is a security fix that should be included in this phase's backend task.

**Warning signs:** `updateOrderStatus` in `venue-router.ts` accepts `token` param but never calls `jwtVerify`.

### Pitfall 6: pickupTime display — "ASAP" vs timestamp

**What goes wrong:** `pickupTime` is stored as whatever the customer typed (`"ASAP"`, `"10:30"`, `"2:45 PM"`). Attempting to parse it as a `Date` will throw.

**Why it happens:** `pickupTime` is `varchar(32)`, not a timestamp. `createOrder` stores `input.pickupTime` directly.

**How to avoid:** Display `order.pickupTime` as a plain string on the order status page. Do not wrap in `new Date()`. Example: `<span>{order.pickupTime}</span>`.

---

## Code Examples

### Existing: createOrder returns orderNumber (venue-router.ts line 252)

```typescript
return { orderId, orderNumber, totalAmount: totalAmount.toFixed(2) };
```

`orderNumber` is available in `createOrder.onSuccess(data)` — `data.orderNumber` is the string needed for the link.

### Existing: updateOrderStatus current implementation (venue-router.ts lines 177-185)

```typescript
updateOrderStatus: publicQuery.input(z.object({
  token: z.string(),
  orderId: z.number().int().positive(),
  status: z.enum(["pending", "confirmed", "ready", "completed", "cancelled"]),
})).mutation(async ({ input }) => {
  const db = getDb();
  await db.update(orders).set({ status: input.status as any }).where(eq(orders.id, input.orderId));
  return { success: true };
}),
```

Note: no `jwtVerify` call here — security issue to fix when extending.

### Existing: StatusBadge colour map (StaffDashboard.tsx lines 815-822)

```typescript
const colors: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#fef3c7', text: '#d97706' },
  confirmed: { bg: '#dbeafe', text: '#2563eb' },
  ready:     { bg: '#d1fae5', text: '#059669' },
  completed: { bg: '#f3f4f6', text: '#6b7280' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
};
```

Reuse these exact colours in the `OrderStatus.tsx` stepper so the visual language is consistent.

### Existing: TanStack Query refetchInterval pattern

```typescript
// Standard tRPC useQuery with polling — same API as TanStack Query options
const { data } = trpc.venue.listOrders.useQuery(
  { venueId, limit: 50 },
  { refetchInterval: 20_000 }  // milliseconds
);
```

`refetchInterval` is a first-class TanStack Query option. It is passed as the second argument to `useQuery` alongside `enabled`. It runs only when the browser tab is active (default behaviour — no extra config needed).

### Existing: orders.staffNote column in schema (schema.ts line 163)

```typescript
staffNote: text("staff_note"),
```

Column already exists. No migration needed. It is `null` by default when not set.

---

## State of the Art

| Old Approach | Current Approach (to build) | Impact |
|--------------|----------------------------|--------|
| No order status page — customers have no visibility post-checkout | `/order/:orderNumber` public page with live status | ORD-01/02/04 |
| Checkout success: 5s toast, order number lost | Persistent confirmation panel with link to status page | ORD-03 |
| Orders fetched once on mount, manual browser refresh needed | `refetchInterval: 20_000` on `listOrders` | STAFF-01 |
| No new-order highlighting | Client-side diff + amber highlight for 8s | STAFF-02 |
| Status update: no staff note capture | Inline note input + extended `updateOrderStatus` | STAFF-03 |
| `updateOrderStatus` token unauthenticated | JWT verify added when extending mutation | Security fix |

---

## Open Questions

1. **Checkout form is currently hardcoded with placeholder customer data**
   - What we know: `handlePlaceOrder` in `VenuePublic.tsx` (line 96-103) sends `customerName: 'Guest Customer'`, `customerPhone: '0400000000'`, `pickupTime: 'ASAP'` — all hardcoded. No customer input form exists.
   - What's unclear: Is Phase 2 expected to add a proper checkout form (name, phone, pickup time), or just the order tracking features?
   - Recommendation: The Phase 2 success criteria do not mention a checkout form. ORD-03 says "post-checkout screen includes a link." Implement the link using the existing (placeholder) flow. A proper checkout form is likely a future concern. Do not add it in Phase 2.

2. **Should OrderStatus.tsx auto-navigate the customer back to the venue page?**
   - What we know: The status page only has an order number as context — not the venue slug (unless derived from the order's venueId via a join).
   - What's unclear: Whether to show a "Back to menu" link, and if so, how to get the venue slug.
   - Recommendation: `getOrderByNumber` joins/fetches the order's venue row — the `venues` table has `slug`. Include `venueSlug` in the response and render a "Back to [Venue Name]" link. This costs one extra join and materially improves UX.

3. **Highlight persistence: clear on next poll or after timeout?**
   - What we know: `newOrderIds` set is cleared via `setTimeout` in Pattern 4.
   - What's unclear: Whether to also clear on the next successful poll (re-diff wipes the set naturally if no new orders arrive).
   - Recommendation: Both behaviours are correct — the `setTimeout(8000)` is the primary user-facing clear. The next poll will only add to `newOrderIds`, never remove from it. This means a highlighted row stays amber until either 8s passes or the user navigates away. This is intentional and correct.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `app/api/venue-router.ts` (complete file, all order mutations)
- Direct codebase inspection — `app/db/schema.ts` (orders, orderItems tables — staffNote column verified)
- Direct codebase inspection — `app/src/pages/StaffDashboard.tsx` (complete file — OrdersTab, StatusBadge, polling gap confirmed)
- Direct codebase inspection — `app/src/pages/VenuePublic.tsx` (complete file — createOrder onSuccess, orderSuccess state confirmed)
- Direct codebase inspection — `app/src/App.tsx` (all routes — /order/:orderNumber confirmed absent)
- Direct codebase inspection — `app/src/hooks/useStaffAuth.ts` (staff token localStorage key confirmed: `b1-staff-token`)
- `.planning/STATE.md` — confirmed "Staff order polling every 20s (WebSocket deferred)" decision

### Secondary (MEDIUM confidence)

- TanStack Query `refetchInterval` option: supported as a second-argument option to `useQuery` in TanStack Query v5 (which React Query / tRPC v11 uses). Pattern confirmed by project's existing use of `{ enabled: !!token }` in the same position.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by direct codebase inspection, no new dependencies
- Architecture: HIGH — all patterns derived from existing code, no guesswork
- Pitfalls: HIGH — derived from direct reading of current code (unauthenticated updateOrderStatus, hardcoded checkout, timer-cleared orderNumber)
- Open questions: MEDIUM — checkout form scope is an interpretation question; venue slug join is a minor design decision

**Research date:** 2026-05-24
**Valid until:** 2026-06-24 (stable codebase, no fast-moving dependencies)
