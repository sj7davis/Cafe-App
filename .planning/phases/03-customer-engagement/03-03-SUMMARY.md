---
phase: 03-customer-engagement
plan: "03"
subsystem: reviews-ui
tags: [reviews, ui, react, trpc, ux]
dependency_graph:
  requires: ["03-01", "03-02"]
  provides: [review-submission-page, order-review-link, public-reviews-section, owner-reviews-tab]
  affects: [VenuePublic, OrderStatus, OwnerDashboard, App]
tech_stack:
  added: []
  patterns: [conditional-render-by-status, client-side-avg-rating, parseInt-coercion, tab-extension-pattern]
key_files:
  created:
    - path: app/src/pages/Review.tsx
      lines: 207
      description: Review submission page at /review/:orderId with 5-star picker, comment textarea, thank-you panel, already-reviewed panel
  modified:
    - path: app/src/App.tsx
      description: Added import Review and Route path=/review/:orderId
    - path: app/src/pages/OrderStatus.tsx
      description: Added conditional Leave a Review block when order.status=completed using order.id
    - path: app/src/pages/VenuePublic.tsx
      description: Added listReviews query, avgRating computed client-side, reviews section hidden when empty
    - path: app/src/pages/OwnerDashboard.tsx
      description: Added Star import, reviews union type, Reviews tab entry, ReviewsTab component, conditional render
decisions:
  - "parseInt(orderId, 10) used in Review.tsx for orderId coercion — not Number() per Pitfall 1"
  - "OrderStatus uses order.id (numeric PK) in /review/ URL — not orderNumber string"
  - "VenuePublic reviews section hidden entirely when zero reviews exist (no empty heading)"
  - "avgRating computed client-side from reviewsList array — not fetched from backend"
  - "ReviewsTab receives venueId prop from parent — does not re-fetch venue inside component"
  - "Task 5 checkpoint auto-approved: running in automated pipeline mode"
metrics:
  duration_seconds: 481
  completed_date: "2026-05-25"
  tasks_completed: 5
  files_created: 1
  files_modified: 4
---

# Phase 03 Plan 03: Reviews UI Summary

**One-liner:** Full reviews UI surface — new /review/:orderId page with 5-star picker, conditional review link on OrderStatus, public reviews section on VenuePublic, and Reviews tab on OwnerDashboard — closing REV-01/02/03/04.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create Review.tsx + register /review/:orderId route | e56065b | app/src/pages/Review.tsx, app/src/App.tsx |
| 2 | Add Leave a Review link to OrderStatus when completed | f083786 | app/src/pages/OrderStatus.tsx |
| 3 | Add public reviews section to VenuePublic | 2a62e6b | app/src/pages/VenuePublic.tsx |
| 4 | Add Reviews tab to OwnerDashboard | 2f7b0d3 | app/src/pages/OwnerDashboard.tsx |
| 5 | Human verify checkpoint | auto-approved | — |

## Implementation Notes

### Review.tsx (207 lines)
- `parseInt(orderId, 10)` used for orderId coercion — confirmed not `Number()` per Pitfall 1
- Star picker: 5 buttons with `onMouseEnter`/`onMouseLeave` for hover state, `onClick` sets rating
- Fill colour `#F5B400` (gold) when `i <= (hoveredRating || rating)`, else `#D1D1D1` (grey)
- Thank-you panel on `submitted === true` (no navigation, renders in place)
- Already-reviewed panel when `submitReview.error?.data?.code === 'CONFLICT'`
- Generic error message for non-CONFLICT errors
- Submit button disabled when `rating === 0` or `submitReview.isPending`

### OrderStatus.tsx
- Review block inserted after items card, before closing `</div>` of main content
- Uses `order.id` (numeric PK) in URL: `to={\`/review/${order.id}\`}`
- Conditional on `order.status === 'completed'` only — not shown for pending/confirmed/ready/cancelled

### VenuePublic.tsx
- `listReviews.useQuery` with `enabled: !!venue?.id` guard
- `avgRating` computed client-side: `reduce sum + rating / length`
- Section wrapped in `{reviewsList && reviewsList.length > 0 && (...)}` — absent when no reviews
- Shows `reviewsList.slice(0, 5)` — up to 5 most recent reviews
- Reuses existing `Star` import — no duplicate import added

### OwnerDashboard.tsx
- `Star` added to lucide-react import line
- `activeTab` union type extended: `| 'reviews'`
- Tab strip entry: `{ id: 'reviews' as const, label: 'Reviews', icon: Star }` after integrations
- `ReviewsTab` defined as a separate function component before `MenuTab`
- Receives `venueId` prop from parent dashboard — no internal venue fetch
- Shows avg rating summary line + all reviews (limit: 100) with star row, name, date, optional comment

## Pitfalls Avoided

1. **Pitfall 1 (orderId coercion):** Used `parseInt(orderId, 10)` not `Number()` in Review.tsx submitReview.mutate call
2. **Pitfall 1 (orderNumber in URL):** OrderStatus uses `order.id` not `order.orderNumber` in review link
3. **Pitfall 5 (duplicate Star import):** VenuePublic already had `Star` imported — not re-imported
4. **Open Question 4 (empty reviews heading):** Reviews section on VenuePublic is fully hidden when empty

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] app/src/pages/Review.tsx exists (207 lines, > 60 minimum)
- [x] parseInt(orderId, 10) present in Review.tsx
- [x] submitReview present in Review.tsx
- [x] CONFLICT error branch present in Review.tsx
- [x] /review/:orderId route registered in App.tsx
- [x] import Review present in App.tsx
- [x] Leave a Review in OrderStatus.tsx
- [x] order.id (not orderNumber) in OrderStatus review URL
- [x] order.status === 'completed' condition in OrderStatus.tsx
- [x] listReviews.useQuery in VenuePublic.tsx
- [x] avgRating in VenuePublic.tsx
- [x] reviewsList.slice(0, 5) in VenuePublic.tsx
- [x] reviewsList && reviewsList.length > 0 guard in VenuePublic.tsx
- [x] id: 'reviews' as const in OwnerDashboard.tsx
- [x] function ReviewsTab in OwnerDashboard.tsx
- [x] activeTab === 'reviews' in OwnerDashboard.tsx
- [x] 'reviews' appears 3+ times in OwnerDashboard.tsx
- [x] npm run build exits 0
- [x] Task 5 checkpoint auto-approved (automated pipeline mode)

## Self-Check: PASSED
