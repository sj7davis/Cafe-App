import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof createDb>;

function createDb() {
  const pool = mysql.createPool(env.databaseUrl);
  return drizzle(pool, { schema: fullSchema, mode: "default" });
}

export function getDb() {
  if (!instance) {
    instance = createDb();
  }
  return instance;
}
