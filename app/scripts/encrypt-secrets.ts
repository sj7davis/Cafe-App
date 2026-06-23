/**
 * One-time backfill: encrypt third-party secrets that were stored as plaintext
 * before secrets-at-rest landed. Idempotent (skips already-sealed values), so
 * it is safe to run repeatedly. Run once per environment after deploying:
 *
 *   npm run db:encrypt-secrets
 *
 * Uses the system (owner) connection, so it sees every tenant's rows regardless
 * of RLS. Reads work fine without this — open() passes plaintext through — but
 * running it is what actually encrypts the data on disk.
 */
import { getDb } from "../api/queries/connection";
import { posIntegrations, venues, xeroConnections } from "@db/schema";
import { eq } from "drizzle-orm";
import { seal, isSealed } from "../api/lib/crypto";

function toSeal(value: string | null): string | null | undefined {
  return value && !isSealed(value) ? seal(value) : undefined;
}

async function main() {
  const db = getDb();
  let rows = 0;

  for (const row of await db.select().from(posIntegrations)) {
    const accessToken = toSeal(row.accessToken);
    const refreshToken = toSeal(row.refreshToken);
    if (accessToken !== undefined || refreshToken !== undefined) {
      await db.update(posIntegrations).set({
        ...(accessToken !== undefined ? { accessToken } : {}),
        ...(refreshToken !== undefined ? { refreshToken } : {}),
      }).where(eq(posIntegrations.id, row.id));
      rows++;
    }
  }

  for (const v of await db.select().from(venues)) {
    const squareAccessToken = toSeal(v.squareAccessToken);
    const squareRefreshToken = toSeal(v.squareRefreshToken);
    const settings = (v.settingsJson as Record<string, unknown> | null) ?? {};
    let settingsChanged = false;
    for (const k of ["gmbAccessToken", "gmbRefreshToken"]) {
      const cur = settings[k];
      if (typeof cur === "string" && cur && !isSealed(cur)) {
        settings[k] = seal(cur);
        settingsChanged = true;
      }
    }
    if (squareAccessToken !== undefined || squareRefreshToken !== undefined || settingsChanged) {
      await db.update(venues).set({
        ...(squareAccessToken !== undefined ? { squareAccessToken } : {}),
        ...(squareRefreshToken !== undefined ? { squareRefreshToken } : {}),
        ...(settingsChanged ? { settingsJson: settings } : {}),
      }).where(eq(venues.id, v.id));
      rows++;
    }
  }

  for (const c of await db.select().from(xeroConnections)) {
    const accessToken = toSeal(c.accessToken);
    const refreshToken = toSeal(c.refreshToken);
    if (accessToken !== undefined || refreshToken !== undefined) {
      await db.update(xeroConnections).set({
        ...(accessToken !== undefined ? { accessToken } : {}),
        ...(refreshToken !== undefined ? { refreshToken } : {}),
      }).where(eq(xeroConnections.id, c.id));
      rows++;
    }
  }

  console.log(`Encrypted plaintext secrets in ${rows} row(s).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
