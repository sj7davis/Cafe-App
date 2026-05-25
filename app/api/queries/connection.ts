import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof createDb>;

function createDb() {
  const pool = new Pool({ connectionString: env.databaseUrl });
  return drizzle(pool, { schema: fullSchema });
}

export function getDb() {
  if (!instance) {
    instance = createDb();
  }
  return instance;
}
