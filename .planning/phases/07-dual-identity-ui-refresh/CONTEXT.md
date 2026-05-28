# Phase 7 Context: Dual Identity UI Refresh

## Origin

Emerged from gsd-explore session on 2026-05-28. User requested a full SaaS-style UI refresh
of all pages. After Socratic exploration, the "Dual Identity" direction was chosen.

## Design Direction Chosen: Dual Identity

Two distinct design languages, one product:

### Operator Side (OwnerDashboard, StaffDashboard, StaffLogin, KitchenDisplay, TabletPos, SuperAdmin)
- Collapsible left sidebar navigation (icon + label, collapses to icon-only)
- White/slate content area with clean card shadows
- Dark mode toggle persisted to localStorage
- Dense data tables with sort/filter affordances
- Card-based analytics with recharts line/bar charts
- Activity feed in sidebar or header area
- Design feel: Linear, Vercel Dashboard, Stripe

### Customer-Facing Side (VenuePublic, VenueApp, OrderStatus, Review, GiftCardLanding, BookingPage, GroupOrder, CustomerPortal)
- Warm aesthetic preserved — tan backgrounds, venue accentColor
- Sharper type hierarchy (Geist Sans headings, proper size scale)
- Mobile-first layouts (375px baseline)
- Sticky floating cart button on mobile VenuePublic
- Animated order progress steps on OrderStatus
- Better empty states and loading skeletons

### Marketing/Auth (Landing, Login, Onboarding)
- Modern SaaS landing: hero + feature grid + social proof sections
- Clean auth forms — no decorative excess, just trust and clarity
- Login / Onboarding: centered card with clear CTAs

## Design Tokens

### Operator (light)
- Background: `#FAFAFA`
- Sidebar: `#18181B`
- Sidebar text: `#A1A1AA` (inactive), `#FAFAFA` (active)
- Card bg: `#FFFFFF`
- Card border: `#E4E4E7`
- Primary accent: `#5E8B8B` (teal)
- Text primary: `#09090B`
- Text secondary: `#71717A`

### Operator (dark)
- Background: `#111111`
- Sidebar: `#0A0A0A`
- Card bg: `#18181B`
- Card border: `#27272A`
- Text primary: `#FAFAFA`
- Text secondary: `#A1A1AA`

### Customer
- Background: `#F3F2EE`
- Card bg: `#FFFFFF`
- Accent: venue `accentColor` (dynamic)
- Text primary: `#1A1A1A`

### Shared
- Radius: 4px base, 8px inputs, 12px cards, 16px modals
- Font: Geist Sans (headings, body), Geist Mono (labels, stats, codes)
- Shadows: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`

## New Features (Woven In)

1. **Analytics Tab** (OwnerDashboard): revenue line chart 7d/30d, top items by orders, daily order count bar chart, avg order value stat card
2. **Activity Feed**: sidebar widget showing last 5 orders + unread review badge
3. **Sticky Cart** (VenuePublic mobile): floating cart button showing item count + total, fixed bottom on mobile
4. **Order Progress Animation** (OrderStatus): horizontal step indicator with CSS transition between states
5. **Empty State Illustrations**: SVG-based empty states for orders list, reviews, menu items

## Technical Constraints

- All existing tRPC procedures remain unchanged — UI layer only (except Analytics tab which needs a new `getAnalytics` procedure)
- Dark mode: CSS custom properties + data-theme attribute on `<html>`, toggled via context + localStorage
- Charts: recharts (already in most React setups) or lightweight alternative — confirm package availability
- Sidebar: fixed-width 240px expanded / 56px collapsed, persisted to localStorage

## Plan Split

| Plan | Scope |
|------|-------|
| 07-01 | Design system + operator shell (tokens, dark mode context, SidebarNav component, AppShell wrapper) |
| 07-02 | OwnerDashboard rebuild (sidebar layout, Analytics tab with recharts, activity feed, all tabs refreshed) |
| 07-03 | Customer-facing refresh (VenuePublic mobile sticky cart, VenueApp cards, OrderStatus animation, Review, CustomerPortal) |
| 07-04 | Marketing + auth refresh (Landing hero/features/social proof, Login/Onboarding/StaffLogin clean forms, SuperAdmin table) |
