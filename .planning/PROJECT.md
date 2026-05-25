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

## Current Milestone: v1.1 — Full Feature Build

**Goal:** Build all customer, staff, loyalty, and notification features to make B1 Platform a complete, production-ready cafe SaaS.

**Phase Progress:** All 6 phases complete (2026-05-25) — v1.1 milestone DONE

**Target features:**
- ✅ Owner login page (returning owners) — Phase 1
- ✅ Menu item image support — Phase 1
- ✅ Menu CRUD (create/edit/delete) — Phase 1
- ✅ Customer order status tracking page — Phase 2
- ✅ Real-time order notifications (staff dashboard auto-poll) — Phase 2
- ✅ Customer preferences (milk/sugar saved by phone) — Phase 3
- ✅ Gift card purchase & redemption — Phase 4
- ✅ Subscription coffee pass (10 coffees for $X) — Phase 4
- ✅ Review & rating after order completion — Phase 3
- ✅ Multi-location support UI — Phase 5
- ✅ Catering request form (public) — Phase 5
- ✅ QR code generator per venue — Phase 6
- ✅ Email notifications (order confirmation + new order alert) — Phase 6

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
*Last updated: 2026-05-25 — v1.1 milestone complete, all 6 phases shipped*
