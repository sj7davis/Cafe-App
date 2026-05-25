---
phase: 04-monetisation
plan: "02"
subsystem: VenuePublic checkout drawer
tags: [gift-cards, subscription-passes, checkout, trpc, react-state]
dependency_graph:
  requires: [04-01-PLAN.md]
  provides: [gift-card-checkout-ui, pass-credit-checkout-ui]
  affects: [app/src/pages/VenuePublic.tsx]
tech_stack:
  added: []
  patterns: [useMutation-for-side-effects, enabled:false+refetch, onSuccess-chaining, derived-render-state]
key_files:
  created: []
  modified:
    - app/src/pages/VenuePublic.tsx
decisions:
  - createOrder computes totalAmount server-side from item prices; gift card discount tracked via orderNote field (e.g. "Gift card: -$5.00") — no totalAmount override sent from client
  - effectiveTotal computed at render time (not inside handlePlaceOrder) to avoid stale state reads per Pitfall 6
  - usePassCreditMutation fires inside createOrder.onSuccess only, never before order confirmation
  - Gift card input hidden after discount applied (appliedGiftDiscount === 0 guard) to prevent double-application
metrics:
  duration_minutes: 12
  completed_date: "2026-05-25"
  tasks_completed: 2
  files_modified: 1
---

# Phase 4 Plan 02: Gift Card + Pass Credit Checkout UI Summary

Wired gift card redemption and subscription pass credit usage into the VenuePublic.tsx checkout drawer, connecting the tRPC procedures added in Plan 01 to interactive UI elements with correct state management and ordering guarantees.

## State Variables Added

Three new state variables added alongside existing checkout state (after `checkoutSugar`):

```typescript
const [checkoutGiftCode, setCheckoutGiftCode] = useState('');       // raw input value
const [appliedGiftDiscount, setAppliedGiftDiscount] = useState(0);  // discount amount from server
const [checkoutUsePass, setCheckoutUsePass] = useState(false);      // toggle state
```

Plus two derived values:
- `passInfo` — derived from `passQuery.data ?? null`
- `effectiveTotal` — derived at render: `Math.max(0, cartTotal - appliedGiftDiscount)`

## How effectiveTotal Flows into createOrder

`createOrder` computes `totalAmount` server-side from item prices (no client override accepted). The gift card discount is informational — when applied, an `orderNote` is set: `"Gift card: -$X.XX"`. This note flows into the order row and is visible to staff. The `effectiveTotal` value is displayed in the UI Total line so the customer sees the correct post-discount amount before placing the order.

## How usePassCredit Is Triggered

`usePassCreditMutation` fires inside `createOrder.onSuccess`, after the existing `upsertPreferences` call:

```typescript
if (checkoutUsePass && passInfo?.id && venue?.id) {
  usePassCreditMutation.mutate({ passId: passInfo.id, venueId: venue.id });
}
```

This guarantees the pass credit is only consumed after the order is confirmed by the server — matching the same ordering guarantee established in Phase 3 for `upsertPreferences`.

## UI Rendered

- Gift card code input + Apply button: visible only when `appliedGiftDiscount === 0` (hides after discount applied)
- Green confirmation row ("Gift card applied  -$X.XX") visible when discount active
- Pass credit toggle (checkbox + label with remaining count): visible only when `passInfo && passInfo.remainingCredits > 0`
- Totals block: Subtotal (cartTotal), optional gift card discount line, Total (effectiveTotal)

## Deviations from Plan

### Auto-fixed Issues

None.

### Informational Deviation

**createOrder totalAmount handling:** The plan noted "check venue-router.ts createOrder before deciding." Confirmed the procedure computes `totalAmount` server-side from item prices — no `totalAmount` input field exists. Per plan instruction, an `orderNote` is used to record the gift card discount (e.g. `"Gift card: -$5.00"`), which is surfaced to staff in the order record. The `effectiveTotal` is correctly displayed in the customer UI.

## Self-Check

Files exist:
- `app/src/pages/VenuePublic.tsx` — modified (confirmed)

Commits:
- `9c617e3` — feat(04-02): add gift card and pass credit state, queries, and mutations
- `9ae9520` — feat(04-02): render gift card input, pass toggle, and discount totals in checkout drawer

## Self-Check: PASSED
