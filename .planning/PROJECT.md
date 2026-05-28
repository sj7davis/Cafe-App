# B1 Platform — Cafe SaaS

## Overview

Multi-tenant SaaS for Australian cafes. Built by Kimi AI, needs to be made fully working and deployable standalone (without Kimi platform dependency).

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Hono + tRPC + Drizzle ORM + MySQL (mysql2)
- **Auth**: JWT tokens (jose) + bcrypt — one JWT system per user type (venue owner, staff, platform admin)
- **Deployment**: Railway (Node.js + MySQL)

## Core Value

Every cafe gets a branded online ordering site, real-time Square POS sync, staff management, and loyalty programs — all from one deployable app.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remove Kimi OAuth | App must be standalone, not locked to Kimi platform | JWT auth only |
| Standard mysql2 pool | PlanetScale mode was incorrectly used with mysql2 | Fixed connection |
| Railway deployment | Simple managed hosting with MySQL add-on | railway.json config |
| Local MySQL for dev | Developer-friendly, no cloud dependency | .env.example updated |

## Previous Milestone: v1.1 — Full Feature Build (COMPLETE 2026-05-25)

All 6 phases shipped. v2.0 (Dual Identity UI/UX Overhaul) also complete 2026-05-28.

---

## Current Milestone: v2.1 — Revenue & Operations

**Goal:** Close the revenue loop with real payments and complete the operations suite — scheduling, live orders, loyalty redemption, dine-in, and automated engagement.

**Target features:**
- Stripe payments — pre-paid online orders, gift card purchases, subscription pass payments
- Discount codes at checkout — code entry field in VenuePublic checkout flow
- Staff scheduling UI — shifts calendar, availability, swap requests, time-off requests
- Loyalty redemption at checkout — redeem points for rewards/discounts at order time
- Real-time orders via SSE — replace 20s polling with live push (broadcastToVenue exists)
- Bookings dashboard — owner view and manage reservations in OwnerDashboard
- Automated marketing triggers — event-driven email/SMS (re-engagement, birthday, pass expiry)
- Square POS sync — menu + order sync with existing Square OAuth infrastructure
- Table ordering / dine-in — QR at table → order placed → sent to kitchen display

---

## Requirements

### Active (v1 — make existing code work)

- [ ] Server starts without Kimi platform credentials
- [ ] Database connects via standard MySQL URL (mysql2 pool)
- [ ] All tRPC routes function correctly
- [ ] Loyalty points update correctly (fix db.$executeRaw bug)
- [ ] Frontend dev server proxies API calls to backend
- [ ] npm scripts to run both frontend and backend
- [ ] Railway deployment config
- [ ] .env.example covers all required vars
- [ ] DB migrations generated and runnable
- [ ] Seed script works standalone

### Out of Scope

- Stripe billing integration (stub already in place)
- Square POS OAuth callback (endpoint structure in place, credentials optional)
- Mobile push notifications

---
### Validated in Phase 1: Owner Access & Menu Management (2026-05-23)

- AUTH-01: Owner `/login` page with email/password form
- AUTH-02: Successful login redirects to `/dashboard`
- AUTH-03: `/login` page links to `/onboarding` for new registrations
- MENU-01: Owner can create, edit, and delete menu items from dashboard
- MENU-02: Owner can set image URL; renders on public venue page; hidden cleanly when absent
- MENU-03: `updateMenuItem` + `deleteMenuItem` mutations with JWT auth and FK conflict guard

---
## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-28 — v2.1 Revenue & Operations milestone started*
