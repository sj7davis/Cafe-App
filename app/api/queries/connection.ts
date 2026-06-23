import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

type Db = ReturnType<typeof createDb>;

let instance: Db;

// Per-request, transaction-bound db. When set, getDb() returns it so every query
// in the request runs on the same connection with `app.venue_id` configured,
// which is what Postgres RLS policies read to scope rows to the tenant.
const tenantStore = new AsyncLocalStorage<Db>();

function createDb() {
  const pool = new Pool({
    connectionString: env.databaseUrl,
    max: 20,                           // max simultaneous connections
    min: 2,                            // keep 2 warm so first requests don't wait for handshake
    idleTimeoutMillis: 30_000,         // release idle connections after 30s
    connectionTimeoutMillis: 5_000,    // fail fast if DB unreachable
    keepAlive: true,                   // TCP keepalive prevents connection drops on Railway
    keepAliveInitialDelayMillis: 10_000,
  });
  return drizzle(pool, { schema: fullSchema });
}

function rootDb(): Db {
  if (!instance) {
    instance = createDb();
  }
  return instance;
}

/**
 * Returns the active database handle: the request's tenant-scoped transaction
 * when inside `runWithTenant`, otherwise the shared pool. Resolvers call this
 * exactly as before — the tenant scoping is transparent.
 */
export function getDb(): Db {
  return tenantStore.getStore() ?? rootDb();
}

/**
 * Run `fn` inside a transaction with the Postgres session variable
 * `app.venue_id` set transaction-locally (so it auto-resets at COMMIT/ROLLBACK
 * and never leaks across pooled connections). RLS policies read this value to
 * restrict every table to the tenant. `venueId === null` leaves the scope empty
 * — used for genuinely public, non-tenant reads (e.g. resolving a venue by slug,
 * which only touches the public `venues` table).
 */
export async function runWithTenant<T>(venueId: number | null, fn: () => Promise<T>): Promise<T> {
  return rootDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.venue_id', ${venueId === null ? "" : String(venueId)}, true)`);
    return tenantStore.run(tx as unknown as Db, fn);
  });
}
