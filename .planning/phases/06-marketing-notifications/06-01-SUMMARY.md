---
phase: 06-marketing-notifications
plan: "01"
subsystem: email-infrastructure
tags: [email, resend, qrcode, schema, migration, env]
dependency_graph:
  requires: []
  provides: [sendEmail-helper, resendApiKey-env, customerEmail-column, drizzle-migration]
  affects: [app/api/lib/email.ts, app/api/lib/env.ts, app/db/schema.ts]
tech_stack:
  added: [resend@6.12.3, qrcode@1.5.4, "@types/qrcode@1.5.6"]
  patterns: [graceful-skip-on-missing-key, non-throwing-email-dispatch, nullable-column-no-default]
key_files:
  created:
    - app/api/lib/email.ts
    - app/db/migrations/0000_huge_rachel_grey.sql
    - app/db/migrations/meta/0000_snapshot.json
    - app/db/migrations/meta/_journal.json
  modified:
    - app/api/lib/env.ts
    - app/db/schema.ts
    - app/package.json
    - app/package-lock.json
decisions:
  - resendApiKey uses `|| ""` not required() — server never crashes without the key
  - sendEmail catches all errors without rethrowing — order/status mutations are unaffected by email failures
  - customerEmail is nullable with no default — historical orders pre-dating email collection have NULL
  - Resend instance created inside sendEmail() not at module level — avoids constructor error on import when key absent
metrics:
  duration_minutes: 12
  completed_date: "2026-05-25"
  tasks_completed: 4
  files_modified: 8
---

# Phase 6 Plan 1: Email Infrastructure Foundation Summary

Email infrastructure foundation — resend/qrcode packages, env key, non-throwing sendEmail helper, nullable customerEmail column on orders with Drizzle migration.

## What Was Built

This plan laid the backend-only groundwork for Phase 6 email features:

1. **npm packages installed** — `resend@6.12.3`, `qrcode@1.5.4`, `@types/qrcode@1.5.6` added to `app/package.json` dependencies.

2. **env.ts extended** — Two new optional fields added after `port`:
   - `resendApiKey: process.env.RESEND_API_KEY || ""` — empty string when unset, never crashes
   - `appUrl: process.env.APP_URL || "https://b1platform.com"` — used in email links

3. **email.ts created** — `app/api/lib/email.ts` exports `sendEmail({ to, subject, html })`:
   - Returns immediately (no-op) when `env.resendApiKey` is falsy
   - Catches and logs all Resend errors without rethrowing
   - Instantiates `new Resend(env.resendApiKey)` inside the function body (not at module level)

4. **Schema column added** — `customerEmail: varchar("customer_email", { length: 320 })` inserted into the `orders` table between `squareOrderId` and `createdAt`. Nullable, no default.

5. **Migration generated** — `app/db/migrations/0000_huge_rachel_grey.sql` created by `npm run db:generate`. Migration not applied — developer runs `npm run db:migrate` against their database.

## Key Facts for Downstream Plans

- Import path: `import { sendEmail } from "@/api/lib/email"` (or relative `../lib/email` from routers)
- Migration file: `app/db/migrations/0000_huge_rachel_grey.sql` — contains `customer_email varchar(320)` nullable column
- `env.resendApiKey` is `""` in dev environments without the key — no config required to run locally
- `env.appUrl` defaults to `"https://b1platform.com"` — used to construct email links

## Verification Results

| Check | Result |
|-------|--------|
| `grep "resend" app/package.json` | resend@6.12.3 |
| `grep "qrcode" app/package.json` | qrcode@1.5.4 |
| `grep "@types/qrcode" app/package.json` | @types/qrcode@1.5.6 |
| `grep "resendApiKey" app/api/lib/env.ts` | Matches — uses `\|\| ""` |
| `grep "required.*RESEND" app/api/lib/env.ts` | No matches (correct) |
| `grep "sendEmail" app/api/lib/email.ts` | Matches |
| `grep "if (!env.resendApiKey)" app/api/lib/email.ts` | Matches |
| `grep "customer_email" app/db/schema.ts` | Matches |
| Migration file exists | `0000_huge_rachel_grey.sql` |
| `grep "customer_email" migration.sql` | `customer_email` varchar(320) |
| `npm run build` | Success (4.30s) |

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | fd6f166 | chore(06-01): install resend, qrcode, @types/qrcode packages |
| Task 2 | 60dbd9f | chore(06-01): extend env.ts with resendApiKey and appUrl |
| Task 3 | 3ad5c35 | feat(06-01): create sendEmail helper with graceful-skip pattern |
| Task 4 | 314eb0f | feat(06-01): add customerEmail column to orders table + generate migration |

## Self-Check: PASSED

All files verified present. All 4 task commits verified in git log.
