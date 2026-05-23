# B1 Platform — Multi-Tenant SaaS for Australian Cafes

A complete multi-tenant SaaS platform for cafe owners in Australia. Each venue gets a branded online presence with menu display, online ordering, staff management, loyalty programs, and Square POS integration.

---

## Quick Start (Local Dev)

### Prerequisites

- Node.js 20+
- MySQL 8.0 running locally (or Docker)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:

```
DATABASE_URL=mysql://root:password@localhost:3306/b1_platform
```

### 3. Create the database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS b1_platform;"
```

Or with Docker (starts MySQL automatically):

```bash
docker compose up mysql -d
```

### 4. Run database migrations

```bash
npm run db:push
```

Or generate and run migration files:

```bash
npm run db:generate
npm run db:migrate
```

### 5. Seed demo data

```bash
npm run seed:platform
```

This creates:
- Platform admin: `admin@b1platform.com.au` / `admin123`
- Demo venue: B1 by Backhaus
- Venue owner: `owner@b1bybackhaus.com` / `owner123`
- Staff account: `admin` / `admin123`

### 6. Start both servers

```bash
npm run dev:all
```

Or start them separately:

```bash
# Terminal 1 — API server (port 3001)
npm run server:dev

# Terminal 2 — Frontend (port 3000, proxies /api to 3001)
npm run dev
```

### URLs

| Page | URL |
|------|-----|
| Landing | http://localhost:3000/ |
| Owner onboarding | http://localhost:3000/onboarding |
| Owner dashboard | http://localhost:3000/dashboard |
| Staff login | http://localhost:3000/staff-login |
| Staff dashboard | http://localhost:3000/staff |
| Public venue | http://localhost:3000/v/b1-backhaus |
| Platform admin | http://localhost:3000/admin |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Hono, tRPC, Drizzle ORM |
| Database | MySQL 8.0 (mysql2) |
| Auth | JWT (jose) + bcrypt |
| Deployment | Railway (or Docker) |

---

## Project Structure

```
app/
├── api/                   # Hono + tRPC backend
│   ├── boot.ts            # Server entry point
│   ├── router.ts          # Root tRPC router
│   ├── venue-router.ts    # Venue owner + ordering API
│   ├── staff-auth-router.ts
│   ├── platform-admin-router.ts
│   ├── billing-router.ts
│   ├── square-router.ts
│   ├── queries/           # DB helpers
│   └── lib/               # Env, utils
├── db/
│   ├── schema.ts          # Drizzle schema
│   ├── relations.ts       # Drizzle relations
│   ├── migrations/        # Generated migrations
│   └── seed-*.ts          # Seed scripts
├── contracts/             # Shared constants/types
├── src/                   # React frontend
│   ├── pages/             # Route pages
│   ├── hooks/             # Auth hooks
│   ├── providers/         # tRPC provider
│   └── components/ui/     # shadcn/ui components
├── .env.example
├── docker-compose.yml
├── railway.json
└── Dockerfile
```

---

## Auth System

Three separate JWT-based auth flows (all tokens stored in localStorage):

| Role | Login | Token key |
|------|-------|-----------|
| Venue Owner | `/onboarding` (register) or tRPC `venue.login` | `b1-owner-token` |
| Staff | `/staff-login` | `b1-staff-token` |
| Platform Admin | `/admin` | `b1-admin-token` |

All tokens expire in 7 days.

---

## Deployment — Railway

1. Push to GitHub
2. Create a new Railway project → connect repo
3. Add a MySQL plugin (Railway provides one)
4. Set environment variables:
   - `DATABASE_URL` — from Railway MySQL plugin
   - `JWT_SECRET` — random 32+ char string
   - `PLATFORM_ADMIN_SECRET` — random 32+ char string
   - `NODE_ENV=production`
5. Deploy — Railway auto-detects `railway.json`
6. After first deploy, run migrations:
   ```bash
   # In Railway Shell
   npm run db:push
   npm run seed:platform
   ```

---

## Square POS Integration

Square is optional. To connect:

1. Create a Square developer account at https://developer.squareup.com
2. Set `SQUARE_APP_ID` and `SQUARE_APP_SECRET` in env
3. Venue owners connect via the Integrations tab in their dashboard

Without Square credentials, the rest of the app works fully.

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `venues` | Multi-tenant root — each row is a cafe |
| `venue_owners` | Owners who manage their venue |
| `platform_admins` | B1 Platform staff |
| `staff_accounts` | Per-venue staff (admin/manager/staff) |
| `menu_items` | Per-venue menu (coffee/pastries/bread) |
| `orders` / `order_items` | Customer orders |
| `inventory` | Real-time item availability |
| `loyalty_accounts` / `loyalty_transactions` | Customer loyalty |
| `locations` | Multiple locations per venue |
| `bundles` | Item bundles |
| `gift_cards` | Gift card system |
| `referral_codes` | Customer referrals |
| `subscription_passes` | Coffee pass subscriptions |
| `corporate_accounts` | B2B accounts |
| `catering_requests` | Catering enquiries |
