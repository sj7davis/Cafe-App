// ─── Tenant lifecycle: data export ────────────────────────────────────────────
//
// Produces a portable JSON snapshot of everything belonging to one venue — the
// venue row plus every row in every venue-scoped table — for data-portability
// requests and pre-offboarding archival. Runs on the system connection so it
// sees all of the tenant's rows regardless of RLS.
//
// Secrets (encrypted tokens, password hashes, Stripe ids, reset tokens, clock
// PINs) are redacted: an export is for the tenant's business data, not their
// credentials.
import { sql } from "drizzle-orm";
import { getSystemDb } from "../queries/connection";

// Column names (snake_case, as returned by raw SQL) that must never leave in an
// export. Matched case-insensitively as a substring.
const REDACT_PATTERNS = [
  "access_token", "refresh_token", "password_hash", "reset_token",
  "clock_pin", "stripe_customer_id", "stripe_subscription_id", "secret",
];

function redactRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const lower = key.toLowerCase();
    if (REDACT_PATTERNS.some((p) => lower.includes(p))) {
      out[key] = value == null ? null : "[redacted]";
    } else if (key === "settings_json" && value && typeof value === "object") {
      // Strip the GMB OAuth tokens that live inside the settings blob.
      const settings = { ...(value as Record<string, unknown>) };
      for (const k of Object.keys(settings)) {
        if (/token/i.test(k)) settings[k] = "[redacted]";
      }
      out[key] = settings;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function redact(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => redactRow(r as Record<string, unknown>));
}

export interface VenueExport {
  exportedAt: string;
  venueId: number;
  tables: Record<string, Record<string, unknown>[]>;
}

/** Full, secret-redacted JSON snapshot of a venue's data. */
export async function exportVenue(venueId: number): Promise<VenueExport> {
  const db = getSystemDb();
  const tables: Record<string, Record<string, unknown>[]> = {};

  const venueRows = await db.execute(sql`SELECT * FROM venues WHERE id = ${venueId}`);
  if (venueRows.rows.length === 0) {
    throw new Error(`Venue ${venueId} not found`);
  }
  tables.venues = redact(venueRows.rows);

  // Every venue-scoped table (discovered, so new tables are covered automatically).
  const tableList = await db.execute(
    sql`SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'venue_id' ORDER BY table_name`,
  );
  for (const t of tableList.rows) {
    const name = (t as { table_name: string }).table_name;
    const rows = await db.execute(sql.raw(`SELECT * FROM "${name}" WHERE venue_id = ${venueId}`));
    tables[name] = redact(rows.rows);
  }

  // Child tables without a venue_id column, reached via their parent.
  const orderItems = await db.execute(
    sql`SELECT oi.* FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.venue_id = ${venueId}`,
  );
  tables.order_items = redact(orderItems.rows);
  const participants = await db.execute(
    sql`SELECT p.* FROM group_order_participants p JOIN group_orders g ON g.id = p.group_order_id WHERE g.venue_id = ${venueId}`,
  );
  tables.group_order_participants = redact(participants.rows);

  return { exportedAt: new Date().toISOString(), venueId, tables };
}
