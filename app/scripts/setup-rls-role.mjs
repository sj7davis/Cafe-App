/**
 * Provision the restricted, RLS-subject application role.
 *
 * RLS is bypassed by the table owner, so the runtime must connect as a separate
 * non-owner role for the tenant_isolation policies to actually apply. Run this
 * once per database as an admin/owner, then point APP_DATABASE_URL at the role:
 *
 *   DATABASE_URL=<admin url> APP_DB_PASSWORD=<secret> node scripts/setup-rls-role.mjs
 *   # then set APP_DATABASE_URL=postgres://b1_app:<secret>@host:5432/<db>
 *
 * The role gets only DML (no DDL, no ownership, no BYPASSRLS), so it is fully
 * governed by RLS. Idempotent.
 */
import pg from "pg";

const ADMIN = process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/b1_platform";
const ROLE = process.env.APP_DB_ROLE || "b1_app";
const PASS = process.env.APP_DB_PASSWORD || "b1_app_local";

const c = new pg.Client({ connectionString: ADMIN });
await c.connect();
const db = (await c.query("SELECT current_database() AS d")).rows[0].d;

const exists = await c.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [ROLE]);
if (exists.rowCount === 0) {
  await c.query(`CREATE ROLE ${ROLE} LOGIN PASSWORD '${PASS}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
} else {
  await c.query(`ALTER ROLE ${ROLE} LOGIN PASSWORD '${PASS}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
}

await c.query(`GRANT CONNECT ON DATABASE ${db} TO ${ROLE}`);
await c.query(`GRANT USAGE ON SCHEMA public TO ${ROLE}`);
await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE}`);
await c.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE}`);
// Future tables created by the migration owner (admin) auto-grant to the role.
await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ROLE}`);
await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${ROLE}`);

console.log(`Role "${ROLE}" ready on database "${db}" (NOSUPERUSER, NOBYPASSRLS).`);
console.log(`Set APP_DATABASE_URL=postgres://${ROLE}:<password>@<host>:5432/${db}`);
await c.end();
