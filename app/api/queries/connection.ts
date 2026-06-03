import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof createDb>;

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

export function getDb() {
  if (!instance) {
    instance = createDb();
  }
  return instance;
}
