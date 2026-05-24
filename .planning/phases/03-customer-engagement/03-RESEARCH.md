# Phase 3: Customer Engagement - Research

**Researched:** 2026-05-25
**Domain:** Checkout personalisation (saved preferences by phone) + post-order review/rating flow
**Confidence:** HIGH

---

## Summary

Phase 3 has two independent feature tracks that share a common anchor: the customer's phone number. The preferences track (PREF-01/02/03) adds a phone-number input to the checkout form in `VenuePublic.tsx`, looks up saved milk/sugar preferences from the `customerPreferences` table, pre-fills them, and upserts them on order placement. The reviews track (REV-01/02/03/04) adds a `/review/:orderId` route backed by a new `Review.tsx` page, a `submitReview` mutation, and a `listReviews` query, then surfaces review data on the venue public page and a new Reviews tab in the owner dashboard.

Both features are almost entirely additive. The schema already has both `customerPreferences` and `reviews` tables — no migrations are needed. The `createOrder` mutation already accepts `customerPhone` and `customerName`, but `VenuePublic.tsx` hardcodes those as `'Guest Customer'` / `'0400000000'` — Phase 3 must replace that with a real checkout form. The `OrderStatus.tsx` page already exists and renders when status = completed; it needs a conditional review link added pointing to `/review/:orderId`.

**Primary recommendation:** Three backend additions (getCustomerPreferences query, upsertCustomerPreferences mutation, submitReview mutation, listReviews query), one modified file (VenuePublic.tsx — add checkout form + preference lookup/upsert), one modified file (OrderStatus.tsx — add review link when status = completed), one new page (Review.tsx at `/review/:orderId`), one new tab in OwnerDashboard (Reviews), and one updated section of VenuePublic.tsx (average rating + recent reviews display). No new npm packages required.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PREF-01 | Customer saves milk and sugar preferences tied to their phone number at checkout | Requires checkout form (phone input) in VenuePublic.tsx + `upsertCustomerPreferences` mutation called from `createOrder.onSuccess`. Schema: `customerPreferences(venueId, phone, milk, sugar, temperature, notes)` — all columns exist. |
| PREF-02 | Returning customer's preferences pre-filled when phone number matches | Requires `getCustomerPreferences` query (venueId + phone). Triggered when phone field blurs or on explicit lookup. Pre-fills milk/sugar dropdowns in checkout form. |
| PREF-03 | Customer can update saved preferences | Same upsert pattern as PREF-01 — `upsertCustomerPreferences` is an INSERT ... ON DUPLICATE KEY UPDATE or a select-then-update. Called each time order is placed or via a dedicated "Update my preferences" UI element. |
| REV-01 | Customer receives review link after order marked `completed` | OrderStatus.tsx already polls status. Add conditional block: when `order.status === 'completed'`, render `<Link to={/review/${order.id}}>Leave a Review</Link>`. Uses numeric `order.id`, not `orderNumber`. |
| REV-02 | Customer submits 1–5 star rating + optional comment at `/review/:orderId` | New `Review.tsx` page at `/review/:orderId`. Needs `submitReview` mutation: `{ orderId, rating, comment? }`. Schema: `reviews(venueId, orderId, customerName, rating, comment)` — all columns exist. Must derive venueId from the order. One-review-per-order guard needed. |
| REV-03 | Venue public page shows average star rating and recent reviews | `listReviews` query (venueId, limit). Computed average on backend or client. Section added to VenuePublic.tsx below the menu. |
| REV-04 | Owner dashboard shows all reviews with ratings | New "Reviews" tab in OwnerDashboard. Calls `listReviews` with owner's venueId (from JWT). Renders star + comment + date. |
</phase_requirements>

---

## Standard Stack

### Core (no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 + TypeScript | 19.x | Frontend UI | Project stack |
| react-router v7 | 7.x | `/review/:orderId` route, `useParams`, `Link` | Already used throughout |
| tRPC client | current | Type-safe API calls | All pages use `trpc.venue.*` pattern |
| Drizzle ORM | current | `upsertCustomerPreferences`, `submitReview`, `listReviews` | All backend queries use Drizzle |
| jose | current | JWT verify for owner-authed queries | `jwtVerify` pattern established in all authed mutations |
| Tailwind + inline styles | current | Layout and styling | Project convention — inline styles for component-level, Tailwind for spacing utilities |
| lucide-react | current | Star icon, CheckCircle, etc. | Already imported in OrderStatus.tsx and VenuePublic.tsx |
| zod | current | Input validation on all mutations | All router inputs use `z.object(...)` |

### No new dependencies required.

**Installation:** None.

---

## Architecture Patterns

### Relevant Project Structure

```
app/
├── api/
│   └── venue-router.ts          # ADD: getCustomerPreferences, upsertCustomerPreferences,
│                                #      submitReview, listReviews
├── db/
│   └── schema.ts                # READ ONLY — customerPreferences and reviews tables exist
└── src/
    ├── App.tsx                  # ADD: <Route path="/review/:orderId" element={<Review />} />
    └── pages/
        ├── VenuePublic.tsx      # MODIFY — add checkout form (phone, name, pickup time, milk, sugar)
        │                        #        + preference lookup on phone blur
        │                        #        + upsert call in createOrder.onSuccess
        │                        #        + reviews section at bottom of page
        ├── OrderStatus.tsx      # MODIFY — add review link when status = completed
        ├── Review.tsx           # NEW — /review/:orderId page with star picker + comment
        └── OwnerDashboard.tsx   # MODIFY — add 'reviews' tab + ReviewsTab component
```

### Schema Facts (verified from schema.ts)

**customerPreferences table:**
```
id, venueId, phone, milk (varchar 32), temperature (varchar 32), sugar (varchar 32), notes (text), createdAt, updatedAt
```
- No unique constraint declared in schema.ts on `(venueId, phone)`. Upsert must be done as: SELECT first, then INSERT or UPDATE.
- `milk`, `sugar`, `temperature` are all `varchar(32)` — suitable for values like `"full cream"`, `"oat"`, `"1 sugar"`, `"extra hot"`.

**reviews table:**
```
id, venueId, orderId, customerName (varchar 255), rating (int), comment (text), createdAt
```
- No unique constraint on `orderId` in schema.ts — the backend must guard against duplicate reviews for the same order (SELECT before INSERT).
- `rating` is a plain `int` — the backend must validate `z.number().int().min(1).max(5)`.
- `customerName` is NOT NULL — must derive from the order's `customerName` at submission time.

### Pattern 1: Checkout Form in VenuePublic.tsx

**What:** Replace `handlePlaceOrder`'s hardcoded values with form state. Add fields for: customer name, phone, pickup time, milk preference, sugar preference. On phone field blur, call `getCustomerPreferences` and pre-fill milk/sugar if a match exists.

**State to add:**
```typescript
const [checkoutName, setCheckoutName] = useState('');
const [checkoutPhone, setCheckoutPhone] = useState('');
const [checkoutPickupTime, setCheckoutPickupTime] = useState('ASAP');
const [checkoutMilk, setCheckoutMilk] = useState('');
const [checkoutSugar, setCheckoutSugar] = useState('');
```

**Preference lookup — lazy query pattern:**
```typescript
// Use enabled: false + refetch trigger (not auto-query — we only want to fetch on phone blur)
const prefQuery = trpc.venue.getCustomerPreferences.useQuery(
  { venueId: venue?.id || 0, phone: checkoutPhone },
  { enabled: false }  // manually triggered
);

const handlePhoneBlur = async () => {
  if (checkoutPhone.length >= 8 && venue?.id) {
    const result = await prefQuery.refetch();
    if (result.data) {
      if (result.data.milk) setCheckoutMilk(result.data.milk);
      if (result.data.sugar) setCheckoutSugar(result.data.sugar);
    }
  }
};
```

**Updated handlePlaceOrder:**
```typescript
const handlePlaceOrder = () => {
  if (cart.length === 0 || !venue?.id) return;
  createOrder.mutate({
    venueId: venue.id,
    customerName: checkoutName || 'Guest',
    customerPhone: checkoutPhone || '0000000000',
    pickupTime: checkoutPickupTime || 'ASAP',
    items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
  });
};
```

**Upsert preferences in onSuccess:**
```typescript
const createOrder = trpc.venue.createOrder.useMutation({
  onSuccess: (data) => {
    setCart([]);
    setPlacedOrderNumber(data.orderNumber);
    setShowCart(true);
    // Upsert preferences if phone + at least one preference is set
    if (checkoutPhone && venue?.id && (checkoutMilk || checkoutSugar)) {
      upsertPreferences.mutate({
        venueId: venue.id,
        phone: checkoutPhone,
        milk: checkoutMilk || undefined,
        sugar: checkoutSugar || undefined,
      });
    }
  },
});
```

### Pattern 2: getCustomerPreferences + upsertCustomerPreferences (backend)

**What:** Two new entries in `venueRouter`.

```typescript
// getCustomerPreferences — public, no auth (phone is the key)
getCustomerPreferences: publicQuery.input(z.object({
  venueId: z.number().int().positive(),
  phone: z.string().min(1),
})).query(async ({ input }) => {
  const db = getDb();
  const results = await db
    .select()
    .from(customerPreferences)
    .where(and(
      eq(customerPreferences.venueId, input.venueId),
      eq(customerPreferences.phone, input.phone)
    ))
    .limit(1);
  return results[0] || null;
}),

// upsertCustomerPreferences — public (no auth — same trust model as createOrder)
upsertCustomerPreferences: publicQuery.input(z.object({
  venueId: z.number().int().positive(),
  phone: z.string().min(1),
  milk: z.string().optional(),
  sugar: z.string().optional(),
  temperature: z.string().optional(),
  notes: z.string().optional(),
})).mutation(async ({ input }) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(customerPreferences)
    .where(and(
      eq(customerPreferences.venueId, input.venueId),
      eq(customerPreferences.phone, input.phone)
    ))
    .limit(1);

  if (existing[0]) {
    const updates: Record<string, unknown> = {};
    if (input.milk !== undefined) updates.milk = input.milk;
    if (input.sugar !== undefined) updates.sugar = input.sugar;
    if (input.temperature !== undefined) updates.temperature = input.temperature;
    if (input.notes !== undefined) updates.notes = input.notes;
    await db.update(customerPreferences).set(updates).where(eq(customerPreferences.id, existing[0].id));
  } else {
    await db.insert(customerPreferences).values({
      venueId: input.venueId,
      phone: input.phone,
      milk: input.milk,
      sugar: input.sugar,
      temperature: input.temperature,
      notes: input.notes,
    });
  }
  return { success: true };
}),
```

**Import addition needed in venue-router.ts:** `customerPreferences` from `@db/schema`.

### Pattern 3: Review Link in OrderStatus.tsx

**What:** Conditional block after the items card — shown only when `order.status === 'completed'`.

**Key fact:** The review URL uses `order.id` (numeric database ID), not `order.orderNumber`. The `orderId` is available on the `order` object returned by `getOrderByNumber` (it's the primary key, present in `publicOrder`).

```typescript
// OrderStatus.tsx — after items card
{order.status === 'completed' && (
  <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginTop: 16, border: '1px solid rgba(24,24,24,0.06)', textAlign: 'center' }}>
    <p style={{ fontSize: 14, color: '#5E5E5E', marginBottom: 12 }}>How was your order?</p>
    <Link
      to={`/review/${order.id}`}
      style={{
        display: 'inline-block', padding: '10px 24px',
        background: '#181818', color: '#fff', textDecoration: 'none',
        borderRadius: 8, fontSize: 14, fontWeight: 600,
      }}
    >
      Leave a Review
    </Link>
  </div>
)}
```

**Important:** `order.id` IS present in `publicOrder` — the `getOrderByNumber` handler strips only `staffNote` (`const { staffNote: _omit, ...publicOrder } = orderRow`). The numeric `id` is included.

### Pattern 4: submitReview + listReviews (backend)

```typescript
submitReview: publicQuery.input(z.object({
  orderId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
})).mutation(async ({ input }) => {
  const db = getDb();

  // Look up the order to get venueId and customerName
  const orderResults = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);
  if (!orderResults[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
  const order = orderResults[0];

  // One-review-per-order guard
  const existing = await db
    .select()
    .from(reviews)
    .where(eq(reviews.orderId, input.orderId))
    .limit(1);
  if (existing[0]) throw new TRPCError({ code: 'CONFLICT', message: 'A review already exists for this order' });

  // Order must be completed
  if (order.status !== 'completed') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order is not yet completed' });
  }

  await db.insert(reviews).values({
    venueId: order.venueId,
    orderId: input.orderId,
    customerName: order.customerName,
    rating: input.rating,
    comment: input.comment,
  });

  return { success: true };
}),

listReviews: publicQuery.input(z.object({
  venueId: z.number().int().positive(),
  limit: z.number().int().min(1).max(100).default(20),
})).query(async ({ input }) => {
  const db = getDb();
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.venueId, input.venueId))
    .orderBy(desc(reviews.createdAt))
    .limit(input.limit);
}),
```

**Import additions needed in venue-router.ts:** `reviews`, `customerPreferences` from `@db/schema`.

### Pattern 5: Review.tsx — New Page

**What:** Page at `/review/:orderId`. Extracts `orderId` from URL params, renders a star picker (1–5), an optional comment textarea, and a submit button. On success, shows a thank-you confirmation.

**Key facts:**
- `orderId` from `useParams` is a **string** — must `parseInt(orderId, 10)` before passing to the mutation.
- No auth required — the orderId itself is the access credential (like orderNumber).
- The page does not need to load order details — it just submits `{ orderId, rating, comment }`.
- After successful submission, show a confirmation panel (no navigation away — keep them on the page).
- On CONFLICT error (review already submitted), show a clear "You've already reviewed this order" message.

```typescript
// src/pages/Review.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import { Star } from 'lucide-react';

export default function Review() {
  const { orderId } = useParams<{ orderId: string }>();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitReview = trpc.venue.submitReview.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return <ThankYouPanel />;
  }

  const handleSubmit = () => {
    if (!rating || !orderId) return;
    submitReview.mutate({
      orderId: parseInt(orderId, 10),
      rating,
      comment: comment.trim() || undefined,
    });
  };

  return (/* star picker UI + textarea + submit button */);
}
```

### Pattern 6: Reviews Section in VenuePublic.tsx

**What:** Below the bread section (or after the menu), add a "Reviews" section. Calls `listReviews` using the venue's id. Displays average rating and up to 5 recent reviews.

**Average rating computation (client-side):**
```typescript
const { data: reviewsList } = trpc.venue.listReviews.useQuery(
  { venueId: venue?.id || 0, limit: 20 },
  { enabled: !!venue?.id }
);

const avgRating = reviewsList?.length
  ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
  : null;
```

### Pattern 7: ReviewsTab in OwnerDashboard.tsx

**What:** New `'reviews'` value in `activeTab` union, new tab button in the tab strip, new `ReviewsTab` component at the bottom of the file.

**Tab strip change** (add to the array in OwnerDashboard):
```typescript
{ id: 'reviews' as const, label: 'Reviews', icon: Star },
```

**State type change:**
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'billing' | 'integrations' | 'menu' | 'reviews'>('overview');
```

**ReviewsTab uses owner JWT token** (already available via `useVenueAuth`), calls `listReviews` with `venue.id` — no additional auth needed beyond what the dashboard already has.

### Anti-Patterns to Avoid

- **Do not use `enabled: true` for the preference lookup query:** It should fire on-demand when the phone field blurs, not every time the component renders. Use `enabled: false` + manual `refetch()`.
- **Do not auto-submit preferences separately before the order:** The upsert must run in `createOrder.onSuccess`, never before — if the order fails, preferences should not be saved.
- **Do not use `orderNumber` for the review URL:** Use `order.id` (numeric). OrderNumber is a human-readable string used for the status page; orderId is the DB primary key and is simpler to validate.
- **Do not skip the one-review-per-order guard:** The schema has no DB-level unique constraint on `orderId` in the reviews table. The backend guard is mandatory.
- **Do not skip the `order.status === 'completed'` check in submitReview:** Anyone with an orderId could submit a review — enforce completed status on the server.
- **Do not parse orderId with `Number()` instead of `parseInt(..., 10)`:** `Number('')` returns 0 which would pass zod's `.positive()` check with unexpected results on some inputs.
- **Do not import `customerPreferences` and `reviews` in venue-router.ts without adding them to the import line:** The current import only includes `venues, venueOwners, orders, orderItems, menuItems, inventory, locations, loyaltyAccounts, loyaltyTransactions` — the new tables must be added.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert (insert-or-update) preferences | Custom race-condition-prone toggle | SELECT then INSERT or UPDATE in sequence | No MySQL `ON DUPLICATE KEY` via Drizzle without a unique index; explicit select-first is the safe pattern given schema has no unique constraint |
| Star rating widget | Third-party star component library | Inline button row with 5 Star icons from lucide-react | lucide-react already in project; no library install needed for 5 clickable icons |
| Average rating calculation | Server aggregate query | Client-side reduce over `listReviews` results | Simple enough with ≤20 reviews; avoids an extra tRPC procedure |
| Duplicate review protection | Frontend-only guard | Backend CONFLICT TRPCError + client error display | Frontend guards are bypassable; backend is authoritative |

---

## Common Pitfalls

### Pitfall 1: orderId vs orderNumber confusion for the review URL

**What goes wrong:** The `/review/:orderId` route uses the numeric DB `id`, but the developer uses `orderNumber` (the string like `B1-XXXX`) because it's more visible in the UI.

**Why it happens:** Both are on the order object. `orderNumber` is prominent in the OrderStatus page header; `id` is less visible.

**How to avoid:** The `order` object returned by `getOrderByNumber` includes `id` (numeric) — it is NOT stripped (only `staffNote` is stripped). Use `order.id` for the review link. In `Review.tsx`, `parseInt(orderId, 10)` where `orderId` is the route param.

**Warning signs:** Review page 404s or the mutation receives a NaN orderId.

### Pitfall 2: customerPreferences import missing in venue-router.ts

**What goes wrong:** TypeScript error: `customerPreferences is not defined`.

**Why it happens:** `venue-router.ts` line 5 imports specific table names. `customerPreferences` and `reviews` are not currently in that import list.

**How to avoid:** Add both to the import:
```typescript
import { ..., customerPreferences, reviews } from "@db/schema";
```

**Warning signs:** TS error on first run of new queries.

### Pitfall 3: Preference lookup fires on every render instead of on phone blur

**What goes wrong:** `getCustomerPreferences` query runs on every render cycle because `enabled` is computed from `checkoutPhone.length > 0`.

**Why it happens:** Reactive `enabled` flag makes the query live — any state change (adding cart item) triggers a refetch.

**How to avoid:** Set `enabled: false` on the query and call `refetch()` only in the `onBlur` handler of the phone input.

**Warning signs:** Network tab shows `getCustomerPreferences` firing repeatedly while user types in other fields.

### Pitfall 4: Checkout form not rendered when cart drawer shows confirmation panel

**What goes wrong:** After the confirmation panel shows, the form fields are gone. If the user returns and places another order, the form is pre-filled with the previous order's values.

**Why it happens:** `placedOrderNumber` being non-null shows the confirmation panel and hides the cart form. The form state (name, phone, etc.) persists in component state.

**How to avoid:** When the user dismisses the confirmation (`setPlacedOrderNumber(null)`), also reset the checkout form fields:
```typescript
onClick={() => {
  setPlacedOrderNumber(null);
  setShowCart(false);
  setCheckoutName(''); setCheckoutPhone('');
  setCheckoutMilk(''); setCheckoutSugar('');
  setCheckoutPickupTime('ASAP');
}}
```

**Warning signs:** Second order placed with same phone/preferences without the customer re-entering anything.

### Pitfall 5: Star icon import conflict — Star used for Pastries section header

**What goes wrong:** `Star` from lucide-react is already imported and used in `VenuePublic.tsx` (Pastries section header). Using the same icon for reviews rating is fine, but the developer may accidentally import a different star icon.

**Why it happens:** Multiple similar icon names in lucide-react (Star, StarHalf, etc.).

**How to avoid:** Reuse the existing `Star` import already in VenuePublic.tsx. In Review.tsx, import `Star` from `lucide-react` explicitly.

### Pitfall 6: Review submitted for an order belonging to a different venue

**What goes wrong:** A malicious user submits a review with a valid orderId that belongs to venue A, but the review is associated with their venue B.

**Why it happens:** If the venueId is taken from the frontend (e.g., passed as a mutation param) rather than derived from the order on the backend.

**How to avoid:** In `submitReview`, always derive `venueId` from the order row fetched by `orderId` — never accept `venueId` as a user-supplied input.

---

## Code Examples

### Existing: customerPreferences schema columns (schema.ts lines 214-224)

```typescript
export const customerPreferences = mysqlTable("customer_preferences", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  phone: varchar("phone", { length: 32 }).notNull(),
  milk: varchar("milk", { length: 32 }),
  temperature: varchar("temperature", { length: 32 }),
  sugar: varchar("sugar", { length: 32 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});
```

No unique index on `(venueId, phone)` — upsert must SELECT then INSERT/UPDATE.

### Existing: reviews schema columns (schema.ts lines 268-276)

```typescript
export const reviews = mysqlTable("reviews", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull().references(() => orders.id),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

No unique index on `orderId` — one-review-per-order must be enforced in backend logic.

### Existing: VenuePublic.tsx handlePlaceOrder (lines 94-103) — current hardcoded state

```typescript
const handlePlaceOrder = () => {
  if (cart.length === 0 || !venue.id) return;
  createOrder.mutate({
    venueId: venue.id,
    customerName: 'Guest Customer',  // <-- replace with form state
    customerPhone: '0400000000',     // <-- replace with form state
    pickupTime: 'ASAP',             // <-- replace with form state
    items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
  });
};
```

### Existing: OrderStatus.tsx — `order.id` is available (lines 43-44)

```typescript
const { order, venue, items } = data;
// order.id is present — staffNote is the only stripped field
```

The `getOrderByNumber` handler does `const { staffNote: _omit, ...publicOrder } = orderRow` — `id` remains in `publicOrder`.

### Existing: OwnerDashboard tab pattern (lines 60-73)

Tab strip uses an array of `{ id, label, icon }` objects mapped to buttons. To add a Reviews tab, append `{ id: 'reviews' as const, label: 'Reviews', icon: Star }` and add `'reviews'` to the `activeTab` union type and the conditional render block.

### Existing: venue-router.ts — current import line (line 5)

```typescript
import { venues, venueOwners, orders, orderItems, menuItems, inventory, locations, loyaltyAccounts, loyaltyTransactions } from "@db/schema";
```

Must become:
```typescript
import { venues, venueOwners, orders, orderItems, menuItems, inventory, locations, loyaltyAccounts, loyaltyTransactions, customerPreferences, reviews } from "@db/schema";
```

---

## State of the Art

| Old State | New State (Phase 3) | Requirement |
|-----------|--------------------|-|
| Checkout uses hardcoded 'Guest Customer' / '0400000000' | Real form: name, phone, pickup time, milk, sugar | PREF-01/02/03 |
| No customer identity — every order is anonymous | Phone-number keyed preferences across visits | PREF-02 |
| No post-completion CTA on OrderStatus page | "Leave a Review" link appears when status = completed | REV-01 |
| No review submission UI | `/review/:orderId` page with star picker + comment | REV-02 |
| Venue public page shows no social proof | Average rating badge + recent reviews section | REV-03 |
| Owner dashboard has no review visibility | Reviews tab with star + comment + date per review | REV-04 |

---

## Open Questions

1. **Milk and sugar options: free-text or constrained dropdown?**
   - What we know: Schema columns are `varchar(32)`. No enum constraint.
   - What's unclear: Whether to give customers a `<select>` with fixed options (e.g., milk: Full Cream, Oat, Almond, Soy, None; sugar: 0, 0.5, 1, 2) or a free-text input.
   - Recommendation: Use constrained dropdowns. Free-text for milk/sugar creates inconsistent data (e.g., "oat milk" vs "oat" vs "Oat Milk") that makes preference matching unreliable. Fixed options are simpler for the customer and cleaner for the barista.

2. **Should the checkout form be mandatory (block order placement if phone is empty)?**
   - What we know: PREF-01 says "customer CAN save" — it's opt-in, not mandatory. The `createOrder` mutation still accepts any phone.
   - What's unclear: Whether an empty phone input should be allowed to place orders.
   - Recommendation: Allow empty phone (fall back to `'0000000000'` or a placeholder). Preferences upsert is skipped when phone is blank. This preserves the existing "Guest Customer" quick-checkout UX while enabling preferences for customers who provide their number.

3. **Where exactly in VenuePublic.tsx should the checkout form appear?**
   - What we know: The cart drawer currently shows either the cart items + "Place Order" button OR the post-checkout confirmation panel. The checkout form needs to appear between the cart items list and the Place Order button.
   - What's unclear: Whether to put all form fields (name, phone, milk, sugar, pickup time) inline in the drawer, or to separate them into a "checkout step."
   - Recommendation: Inline in the drawer, between the cart items and the total/Place Order section. A single-step checkout is simpler and matches the existing UI simplicity. No multi-step wizard needed.

4. **Does the reviews section in VenuePublic.tsx appear when there are zero reviews?**
   - What we know: `listReviews` returns an empty array when no reviews exist.
   - Recommendation: Hide the entire section when `reviewsList?.length === 0` or when the query hasn't loaded yet. Don't show an empty "Reviews" heading — it looks unfinished.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `app/db/schema.ts` — `customerPreferences` table (lines 214-224), `reviews` table (lines 268-276) both confirmed present with exact column types
- Direct codebase inspection — `app/api/venue-router.ts` — full file read; confirmed no existing `getCustomerPreferences`, `upsertCustomerPreferences`, `submitReview`, or `listReviews` mutations; confirmed import list missing these tables; confirmed `createOrder` returns `{ orderId, orderNumber, totalAmount }`
- Direct codebase inspection — `app/src/pages/VenuePublic.tsx` — confirmed hardcoded `'Guest Customer'` / `'0400000000'` at lines 98-100; confirmed `placedOrderNumber` state and confirmation panel exist; confirmed `Star` icon already imported
- Direct codebase inspection — `app/src/pages/OrderStatus.tsx` — confirmed `order.id` present in destructured data (line 43); confirmed no review link exists; confirmed `order.status === 'completed'` is detectable from existing `STEPS` const
- Direct codebase inspection — `app/src/App.tsx` — confirmed `/review/:orderId` route is absent; `OrderStatus` import exists; pattern for adding a new route is established
- Direct codebase inspection — `app/src/pages/OwnerDashboard.tsx` — confirmed tab strip pattern (array-mapped buttons), active tab union type, and conditional render; `Star` from lucide-react not yet imported in dashboard

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns verified by direct codebase inspection
- Architecture: HIGH — schema tables exist; insertion/modification points identified precisely
- Pitfalls: HIGH — derived from direct code reading (missing import, hardcoded values, no unique constraints, orderId vs orderNumber)
- Open questions: MEDIUM — design choices (dropdown vs free-text, mandatory phone) are judgment calls not resolvable without user preference

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (stable codebase, no fast-moving dependencies)
