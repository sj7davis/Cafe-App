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

**Target features:**
- Owner login page (returning owners)
- Customer order status tracking page
- Menu item image upload
- Real-time order notifications (staff dashboard auto-poll)
- Customer preferences (milk/sugar saved by phone)
- Gift card purchase & redemption
- Subscription coffee pass (10 coffees for $X)
- Review & rating after order completion
- Multi-location support UI
- Catering request form (public)
- QR code generator per venue
- Email notifications (order confirmation + new order alert)

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
*Last updated: 2026-05-23 after initialization*
