# Phase 4: Monetisation - Research

**Researched:** 2026-05-25
**Domain:** Gift cards + subscription coffee passes on an existing tRPC/Drizzle/MySQL stack
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GIFT-01 | Customer can purchase a gift card for a venue with a set dollar amount | createGiftCard procedure + owner-initiated creation UI |
| GIFT-02 | Gift card generates a unique code that can be shared with a recipient | `nanoid`-style random alphanumeric code stored in giftCards.code |
| GIFT-03 | Customer can apply a gift card code at checkout to reduce order total | redeemGiftCard procedure + checkout UI field |
| GIFT-04 | Venue owner can view all active gift cards from the dashboard | listGiftCards procedure + new GiftCards tab in OwnerDashboard |
| PASS-01 | Venue owner can configure a coffee pass (e.g. 10 coffees for $45) | upsertPassConfig stored in venues.settingsJson (no new table needed) |
| PASS-02 | Customer can purchase a pass by phone number | purchasePass inserts row into subscriptionPasses |
| PASS-03 | Customer can use a credit from their pass at checkout | usePassCredit procedure + checkout UI toggle |
| PASS-04 | Remaining credits are displayed and decremented correctly on each use | remainingCredits decremented atomically; checkout shows live value |
</phase_requirements>

---

## Summary

The schema already contains both required tables — `giftCards` and `subscriptionPasses` — added to the Drizzle schema in an earlier phase. No new migrations are required. The work is purely logic and UI.

Gift card flow (per the requirements and the "no real payment processing" constraint): the owner creates a gift card manually from their dashboard. A unique 12-character alphanumeric code is generated server-side. The customer enters that code at checkout; the server looks it up, validates balance, reduces totalAmount, and deducts from the card balance. Partial redemption is supported — the card balance decrements by the order amount (up to its remaining balance), not always wiped to zero.

Subscription pass flow: the owner configures a pass template (name, credit count, price) stored in `venues.settingsJson` as a simple JSON object — no new table is needed for the template itself. A customer purchases a pass by providing their phone number; this inserts a row into `subscriptionPasses` with `remainingCredits = totalCredits`. At checkout, the customer can toggle "Use a pass credit" — the backend decrements `remainingCredits` and returns the new balance.

All procedures follow the existing `publicQuery` pattern (no auth on customer-facing calls; owner calls carry a JWT token).

**Primary recommendation:** Three plans — backend procedures first (Plan 01), checkout UI integration second (Plan 02), owner dashboard UI third (Plan 03). Plans 02 and 03 both depend on Plan 01.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | already installed | DB queries against giftCards + subscriptionPasses tables | Project ORM |
| zod | already installed | Input validation on new tRPC procedures | Project validator |
| jose | already installed | JWT verify for owner-authed mutations | Project auth lib |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto.randomBytes` (Node built-in) | built-in | Generate unique gift card codes | No extra dependency |

**Installation:** No new packages required.

**Code generation pattern for gift card codes (no extra dependency):**
```typescript
// Generate a 12-char uppercase alphanumeric code using Node built-in crypto
import { randomBytes } from "crypto";
function generateGiftCardCode(): string {
  return randomBytes(8).toString('base64url').toUpperCase().slice(0, 12);
}
```
This gives 64^8 ≈ 2.8×10^14 combinations — collision probability is negligible for cafe scale.

---

## Architecture Patterns

### Plan Split

```
Plan 01 — Backend only (venue-router.ts)
  createGiftCard      (owner JWT-guarded mutation)
  listGiftCards       (owner JWT-guarded query)
  redeemGiftCard      (public mutation — called at checkout)
  purchasePass        (public mutation — owner creates on behalf of customer)
  getPassByPhone      (public query — lookup before checkout)
  usePassCredit       (public mutation — decrement at checkout)
  getPassConfig       (public query — returns pass template from settingsJson)
  upsertPassConfig    (owner JWT-guarded mutation — save template)

Plan 02 — VenuePublic.tsx checkout drawer
  Gift card code input field (below phone field)
  "Apply" button → redeemGiftCard mutation → shows discount line
  Pass credit toggle (if pass exists for this phone) → usePassCredit on order submit

Plan 03 — OwnerDashboard.tsx
  New tab: "Gift Cards" → list active cards + create card form
  Pass config section inside Gift Cards tab (or separate tab)
  New tab: "Passes" → configure pass template + create a pass for a customer
```

### Pattern 1: Owner-Authed Mutations (established in Phase 1)
**What:** All owner write operations extract venueId from JWT; never from client input.
**When to use:** createGiftCard, listGiftCards, upsertPassConfig, purchasePass (owner-initiated)
**Example:**
```typescript
// Same pattern as deleteMenuItem (established Phase 1)
createGiftCard: publicQuery.input(z.object({
  token: z.string(),
  amount: z.number().positive(),
  senderName: z.string().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  message: z.string().optional(),
})).mutation(async ({ input }) => {
  const db = getDb();
  const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
  const venueId = payload.payload.venueId as number;
  // ... business logic
})
```

### Pattern 2: Partial Gift Card Redemption
**What:** Gift card balance reduces by MIN(cardBalance, orderTotal). Customer pays the remainder in cash (at pickup, per existing payment_method:"pickup" default).
**When to use:** redeemGiftCard mutation
```typescript
redeemGiftCard: publicQuery.input(z.object({
  venueId: z.number().int().positive(),
  code: z.string().min(1),
  orderTotal: z.number().positive(),
})).mutation(async ({ input }) => {
  const db = getDb();
  const results = await db.select().from(giftCards)
    .where(and(eq(giftCards.venueId, input.venueId), eq(giftCards.code, input.code.toUpperCase())))
    .limit(1);
  const card = results[0];
  if (!card) throw new TRPCError({ code: 'NOT_FOUND', message: 'Gift card not found' });
  if (Number(card.balance) <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Gift card has no remaining balance' });

  const discount = Math.min(Number(card.balance), input.orderTotal);
  const newBalance = Number(card.balance) - discount;
  await db.update(giftCards)
    .set({ balance: String(newBalance.toFixed(2)), isRedeemed: newBalance <= 0 })
    .where(eq(giftCards.id, card.id));

  return { discount, remainingBalance: newBalance };
})
```

### Pattern 3: Pass Config in settingsJson
**What:** The pass template (name, totalCredits, price) is stored as a JSON blob on the venue row — no extra table.
**Why:** The `subscriptionPasses` table stores individual purchased passes. There only needs to be one active template per venue at a time. `venues.settingsJson` already exists as a json column for exactly this kind of lightweight config.
```typescript
// upsertPassConfig: sets venues.settingsJson.passConfig
// getPassConfig: reads venues.settingsJson?.passConfig
// Shape: { name: string, totalCredits: number, price: number }
```

### Pattern 4: Pass Credit Decrement (atomic)
**What:** `usePassCredit` decrements `remaining_credits` by 1 using a SQL expression to prevent race conditions.
```typescript
import { sql } from "drizzle-orm";

await db.update(subscriptionPasses)
  .set({ remainingCredits: sql`remaining_credits - 1` })
  .where(eq(subscriptionPasses.id, pass.id));
```
`sql` is already imported in venue-router.ts — no new import needed.

### Pattern 5: Checkout State for Discounts
**What:** VenuePublic.tsx manages gift card discount and pass credit as local state. On order submit, the effective total (post-discount) is sent to `createOrder`. The actual discount tracking is informational only — no separate order-level discount column in schema.
```
checkoutGiftCode: string        -- input value
appliedGiftDiscount: number     -- returned from redeemGiftCard
checkoutUsePass: boolean        -- toggle state
passInfo: { id, remainingCredits } | null  -- from getPassByPhone
```
The `totalAmount` sent to `createOrder` = cartTotal - appliedGiftDiscount - (checkoutUsePass && passInfo ? 0 : 0)
NOTE: pass credits are unitless (one credit = one order item, not a dollar amount), so the pass does not reduce totalAmount — it just tracks usage. The credit is consumed via `usePassCredit` in the `createOrder.onSuccess` handler.

### Anti-Patterns to Avoid
- **Trusting client for venueId on owner mutations:** Always derive from JWT (established Phase 1 pattern).
- **Case-sensitive gift card code lookup:** Normalize to uppercase on insert and on lookup.
- **Not guarding zero-balance cards:** Check `balance > 0` before allowing redemption.
- **Race condition on pass credits:** Use `sql\`remaining_credits - 1\`` not `remainingCredits - 1` in JS to avoid read-then-write gap.
- **Applying discount twice:** The `redeemGiftCard` mutation deducts balance immediately (not deferred to order completion). Do not call it again in `createOrder.onSuccess`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique code generation | Custom base-36 encoder | `crypto.randomBytes(8).toString('base64url')` | Node built-in, cryptographically random |
| Pass config persistence | New `passTemplates` DB table | `venues.settingsJson` blob | One template per venue, schema already supports it |
| Duplicate code collision check | Retry loop | SELECT before INSERT + throw CONFLICT | Collision probability ~10^-10 at cafe scale — one SELECT is sufficient |

---

## Common Pitfalls

### Pitfall 1: Gift Card Balance as Decimal String
**What goes wrong:** Drizzle returns `decimal` columns as strings (e.g. `"45.00"`). Arithmetic with `Number(card.balance)` is required; raw string arithmetic will produce NaN or wrong results.
**Why it happens:** MySQL decimal maps to Drizzle string to avoid JS float precision loss.
**How to avoid:** Always `Number(card.balance)` before arithmetic. Store back with `.toFixed(2)`.
**Warning signs:** TypeScript type shows `string` for `amount` and `balance` fields on giftCards.

### Pitfall 2: Code Case Sensitivity
**What goes wrong:** User types `abc123` but card was stored as `ABC123` — lookup fails.
**How to avoid:** Uppercase on insert AND on lookup with `.toUpperCase()`.

### Pitfall 3: Pass Config Read Before Set
**What goes wrong:** `venue.settingsJson` is `null` on new venues — accessing `.passConfig` throws.
**How to avoid:** `const passConfig = (venue.settingsJson as any)?.passConfig ?? null` — optional chain is the safe path.

### Pitfall 4: Pass Credit Used Before Order Commits
**What goes wrong:** `usePassCredit` fires BEFORE `createOrder.onSuccess`, so if the order fails the credit is consumed.
**How to avoid:** Fire `usePassCredit` in the `createOrder.onSuccess` handler (same pattern as `upsertPreferences` in Phase 3).

### Pitfall 5: redeemGiftCard Called On Every Re-render
**What goes wrong:** If wired to `useQuery` (not mutation), the card balance is deducted on every query.
**How to avoid:** `redeemGiftCard` MUST be a mutation, called only on "Apply" button click (not on code input change).

### Pitfall 6: Checkout Total Sent to createOrder Before Discount Applied
**What goes wrong:** `handlePlaceOrder` computes `cartTotal` from local state, but `appliedGiftDiscount` state update may not have flushed yet.
**How to avoid:** Compute `effectiveTotal` as a derived variable at render time, not inside `handlePlaceOrder`.

---

## Code Examples

### Schema Reference (READ ONLY — already migrated)
```typescript
// giftCards (schema.ts lines 253-265)
{ id, venueId, code (varchar 16), amount (decimal), balance (decimal),
  senderName, recipientName, recipientPhone, message, isRedeemed (boolean), createdAt }

// subscriptionPasses (schema.ts lines 227-238)
{ id, venueId, phone (varchar 32), name (varchar 128), totalCredits (int),
  remainingCredits (int), price (decimal), expiresAt, isActive (boolean), createdAt }
```

### Import Line Extension Pattern
The current venue-router.ts import line (line 5) needs `giftCards` and `subscriptionPasses` added:
```typescript
// Before (current):
import { venues, venueOwners, orders, orderItems, menuItems, inventory, locations, loyaltyAccounts, loyaltyTransactions, customerPreferences, reviews } from "@db/schema";

// After:
import { venues, venueOwners, orders, orderItems, menuItems, inventory, locations, loyaltyAccounts, loyaltyTransactions, customerPreferences, reviews, giftCards, subscriptionPasses } from "@db/schema";
```

### OwnerDashboard Tab Extension Pattern
Current tab array (lines 62-68 in OwnerDashboard.tsx):
```typescript
const TABS = ['overview', 'menu', 'settings', 'billing', 'integrations', 'reviews']
// New tabs to add:
{ id: 'giftcards' as const, label: 'Gift Cards', icon: Gift },
{ id: 'passes' as const, label: 'Passes', icon: Ticket },
```
Add `Gift` and `Ticket` to the lucide-react import.

### Checkout Discount UI Pattern
Below the phone input in VenuePublic.tsx cart drawer:
```tsx
{/* Gift Card */}
<div style={{ display: 'flex', gap: 8 }}>
  <input
    type="text"
    placeholder="Gift card code"
    value={checkoutGiftCode}
    onChange={e => setCheckoutGiftCode(e.target.value.toUpperCase())}
    style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(24,24,24,0.12)', fontSize: 14, background: '#fff' }}
  />
  <button onClick={handleApplyGiftCard} disabled={redeemGiftCard.isPending || !checkoutGiftCode}
    style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: '#181818', color: '#F3F2EE', fontSize: 13, cursor: 'pointer' }}>
    Apply
  </button>
</div>
{appliedGiftDiscount > 0 && (
  <div style={{ color: '#16a34a', fontSize: 13 }}>
    Gift card applied: -${appliedGiftDiscount.toFixed(2)}
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Separate pass template table | settingsJson blob | Simpler — one template per venue |
| Full card wipe on first use | Partial balance decrement | Supports gift cards used across multiple orders |

---

## Open Questions

1. **Does usePassCredit need to prevent negative credits?**
   - What we know: `remainingCredits` is an `int` column with no DB check constraint.
   - Recommendation: Add server-side guard: `if (pass.remainingCredits <= 0) throw BAD_REQUEST`.

2. **Can a single checkout apply BOTH a gift card and a pass credit simultaneously?**
   - Recommendation: Yes — they are independent. Gift card reduces dollar amount; pass credit is a separate counter. Allow both.

---

## Sources

### Primary (HIGH confidence)
- `app/db/schema.ts` — read directly; giftCards and subscriptionPasses table shapes confirmed
- `app/api/venue-router.ts` — read directly; publicQuery pattern, JWT pattern, TRPCError usage confirmed
- `app/src/pages/VenuePublic.tsx` — read directly; checkout state shape and cart drawer structure confirmed
- `app/src/pages/OwnerDashboard.tsx` — read directly; tab strip pattern and tab component structure confirmed
- `.planning/phases/03-customer-engagement/03-01-PLAN.md` — read directly; PLAN.md format and task structure confirmed

### Secondary (MEDIUM confidence)
- Drizzle ORM docs: decimal columns return as strings — consistent with observed `price: string` type on MenuItem

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; verified existing imports
- Architecture: HIGH — all patterns derived from reading existing code
- Pitfalls: HIGH — decimal-as-string and onSuccess-ordering confirmed by reading Phase 3 implementation

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (stable stack, no fast-moving dependencies)
