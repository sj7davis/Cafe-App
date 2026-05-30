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

## Previous Milestone: v2.1 — Revenue & Operations (Phase 8 complete; Phases 9-11 absorbed into v2.2)

---

## Current Milestone: v2.2 — Full Operations Suite

**Goal:** Deliver the complete real-time operations layer — KDS, SSE live orders, dine-in QR, tipping, smart upsells, Deputy-style staff clock-in/out, PWA, and customer order history — plus absorb v2.1 Phases 9-11 (scheduling, bookings, automated marketing, Square).

**Target features:**
- Full KDS — swimlane kitchen display at /kitchen/:slug, real-time via SSE, tap-to-advance
- Real-time orders via SSE — replace 20s polling; SSE auth gap fixed
- Table ordering / dine-in QR — table pre-fill, KDS table tagging, per-table QR generator
- Staff scheduling — shifts, availability, swap requests, time-off (v2.1 carry-over)
- Staff clock-in/clock-out — PIN tablet clock-in, break tracking, timesheet export (Deputy-style)
- Tipping prompts — unselected presets before checkout (ACCC-compliant), hidden for dine-in
- Upsell engine — co-purchase suggestions before Stripe session, max 3, no cart duplicates
- Customer order history — phone-based last-10-orders, one-tap reorder, phone normalisation
- PWA + add to home screen — manifest, service worker, deferred install prompt
- Automated marketing triggers — re-engagement, birthday, pass-expiry (v2.1 carry-over)
- Square POS sync — OAuth + menu import (v2.1 carry-over)

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
