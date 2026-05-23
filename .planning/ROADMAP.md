# B1 Platform — Fix & Deploy Roadmap

## Milestone v1.0 — Fully Working & Deployable

### Phase 1: Server Infrastructure
**Goal:** Replace Kimi platform scaffolding with standalone server; fix database connection.

Plans:
- 1-PLAN.md: Fix env, connection, boot, context (remove Kimi OAuth dependencies)
- 2-PLAN.md: Add server scripts, tsx, tsconfig-paths for server-side path aliases
- 3-PLAN.md: Fix vite.config.ts proxy + path aliases for frontend

Success criteria:
1. `npm run server:dev` starts Hono server without Kimi credentials
2. `npm run dev` (Vite) proxies `/api/*` to backend
3. `npm run build` produces a production bundle

---

### Phase 2: API Bug Fixes
**Goal:** Fix runtime bugs that would crash the running app.

Plans:
- 1-PLAN.md: Fix addLoyaltyPoints db.$executeRaw bug
- 2-PLAN.md: Fix useStaffAuth logout URL, fix seed file
- 3-PLAN.md: Fix billing/square routers that use db.query relational API incorrectly

Success criteria:
1. Loyalty points update without runtime error
2. Staff logout navigates correctly
3. All tRPC routes return expected shapes

---

### Phase 3: Database & Deployment
**Goal:** Generate migrations, update .env docs, add Railway deploy config.

Plans:
- 1-PLAN.md: Generate Drizzle migrations from schema
- 2-PLAN.md: Update .env.example, create Railway config, add Dockerfile
- 3-PLAN.md: Final package.json scripts (build, start, seed)

Success criteria:
1. `npx drizzle-kit generate` produces migration files
2. `npm run seed` populates demo venue
3. railway.json exists with correct config
4. README documents local dev setup end-to-end

---

## Requirements Traceability

| REQ | Phase | Status |
|-----|-------|--------|
| Server starts without Kimi credentials | 1 | planned |
| Database connects via standard MySQL | 1 | planned |
| All tRPC routes work | 2 | planned |
| Loyalty points fix | 2 | planned |
| Frontend API proxy | 1 | planned |
| npm scripts | 1 | planned |
| Railway config | 3 | planned |
| .env.example | 3 | planned |
| DB migrations | 3 | planned |
| Seed script | 3 | planned |
