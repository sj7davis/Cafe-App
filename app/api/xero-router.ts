// Note: See boot.ts for /api/xero/callback Hono route (OAuth redirect handler)

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { xeroConnections, orders, venues } from "@db/schema";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";

// ─── Token refresh helper ───────────────────────────────────────────────────
async function getValidXeroToken(venueId: number): Promise<{ accessToken: string; tenantId: string }> {
  const db = getDb();
  const rows = await db
    .select()
    .from(xeroConnections)
    .where(eq(xeroConnections.venueId, venueId))
    .limit(1);

  const connection = rows[0];
  if (!connection || !connection.isConnected || !connection.accessToken || !connection.refreshToken || !connection.tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Xero is not connected. Please connect your Xero account first." });
  }

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  const tokenExpiresSoon = !connection.tokenExpiresAt || connection.tokenExpiresAt < fiveMinutesFromNow;

  if (!tokenExpiresSoon) {
    return { accessToken: connection.accessToken, tenantId: connection.tenantId };
  }

  // Refresh the token
  if (!env.xeroClientId || !env.xeroClientSecret) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Xero OAuth credentials are not configured on the server." });
  }

  const refreshRes = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(`${env.xeroClientId}:${env.xeroClientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    }).toString(),
  });

  if (!refreshRes.ok) {
    const errText = await refreshRes.text();
    console.error("Xero token refresh failed:", errText);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to refresh Xero access token. Please reconnect Xero." });
  }

  const tokenData = await refreshRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 1800) * 1000);

  await db.update(xeroConnections).set({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tokenExpiresAt: expiresAt,
  }).where(eq(xeroConnections.venueId, venueId));

  return { accessToken: tokenData.access_token, tenantId: connection.tenantId };
}

// ─── POST a manual journal to Xero, retrying once on 401 ───────────────────
async function postManualJournal(
  accessToken: string,
  tenantId: string,
  venueId: number,
  body: object,
): Promise<Response> {
  const doPost = (token: string) =>
    fetch(`${XERO_API_BASE}/ManualJournals`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Xero-Tenant-Id": tenantId,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

  let res = await doPost(accessToken);

  if (res.status === 401) {
    // Token may have just expired — force refresh and retry
    const refreshed = await getValidXeroToken(venueId);
    res = await doPost(refreshed.accessToken);
  }

  return res;
}

export const xeroRouter = createRouter({
  // Owner: get current Xero connection for this venue
  getConnection: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      const results = await db
        .select()
        .from(xeroConnections)
        .where(eq(xeroConnections.venueId, venueId))
        .limit(1);
      const connection = results[0];
      if (!connection) return null;
      // Strip sensitive tokens from response
      const { accessToken, refreshToken, ...safe } = connection;
      return safe;
    }),

  // Owner: disconnect Xero
  disconnect: publicQuery
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      await db
        .update(xeroConnections)
        .set({ isConnected: false, accessToken: null, refreshToken: null, tenantId: null })
        .where(eq(xeroConnections.venueId, venueId));
      return { success: true };
    }),

  // Owner: get Xero OAuth authorization URL
  getAuthUrl: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;

      if (!env.xeroClientId) {
        return { url: null, configured: false };
      }

      const state = Buffer.from(JSON.stringify({ venueId })).toString("base64");
      const redirectUri = `${env.appUrl}/api/xero/callback`;

      const url =
        `https://login.xero.com/identity/connect/authorize` +
        `?response_type=code` +
        `&client_id=${encodeURIComponent(env.xeroClientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent("openid profile email accounting.transactions accounting.settings offline_access")}` +
        `&state=${encodeURIComponent(state)}`;

      return { url, configured: true };
    }),

  // Owner: sync revenue to Xero as daily manual journal entries
  syncRevenue: publicQuery
    .input(
      z.object({
        token: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(),   // YYYY-MM-DD
      })
    )
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();

      // Ensure connected
      const connectionRows = await db
        .select()
        .from(xeroConnections)
        .where(eq(xeroConnections.venueId, venueId))
        .limit(1);
      const connection = connectionRows[0];

      if (!connection || !connection.isConnected || !connection.accessToken) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Xero is not connected. Please connect your Xero account first." });
      }

      // Get valid token (refreshes if needed)
      const { accessToken, tenantId } = await getValidXeroToken(venueId);

      // Get venue name for journal narration
      const venueRows = await db
        .select({ name: venues.name })
        .from(venues)
        .where(eq(venues.id, venueId))
        .limit(1);
      const venueName = venueRows[0]?.name ?? `Venue #${venueId}`;

      // Fetch all non-cancelled orders in the date range
      const fromStart = new Date(`${input.fromDate}T00:00:00.000Z`);
      const toEnd = new Date(`${input.toDate}T23:59:59.999Z`);

      const rangeOrders = await db
        .select({
          id: orders.id,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.venueId, venueId),
            gte(orders.createdAt, fromStart),
            lte(orders.createdAt, toEnd),
            ne(orders.status, "cancelled"),
          )
        );

      if (rangeOrders.length === 0) {
        return { synced: 0, fromDate: input.fromDate, toDate: input.toDate, totalRevenue: 0 };
      }

      // Group orders by date (YYYY-MM-DD)
      const byDay = new Map<string, { count: number; total: number }>();
      for (const order of rangeOrders) {
        // Use local-date portion of the UTC timestamp
        const dayKey = order.createdAt.toISOString().slice(0, 10);
        const existing = byDay.get(dayKey) ?? { count: 0, total: 0 };
        existing.count += 1;
        existing.total += Number(order.totalAmount);
        byDay.set(dayKey, existing);
      }

      let journalsCreated = 0;
      let totalRevenue = 0;

      for (const [day, { count, total }] of byDay.entries()) {
        const roundedTotal = Math.round(total * 100) / 100;
        totalRevenue += roundedTotal;

        const journalBody = {
          Narration: `B1 Cafe daily sales — ${day} — ${venueName}`,
          Date: `${day}T00:00:00`,
          JournalLines: [
            {
              LineAmount: roundedTotal,
              AccountCode: "200",
              Description: `${count} order${count !== 1 ? "s" : ""} totalling $${roundedTotal.toFixed(2)}`,
              TaxType: "OUTPUT2",
            },
            {
              LineAmount: -roundedTotal,
              AccountCode: "090",
              Description: "Cash/online receipts",
            },
          ],
        };

        const res = await postManualJournal(accessToken, tenantId, venueId, journalBody);

        if (res.ok) {
          journalsCreated += 1;
        } else {
          const errText = await res.text();
          console.error(`Xero manual journal creation failed for ${day}:`, res.status, errText);
          // Continue with other days rather than aborting entirely
        }
      }

      // Update lastSyncAt
      await db
        .update(xeroConnections)
        .set({ lastSyncAt: new Date() })
        .where(eq(xeroConnections.venueId, venueId));

      return {
        synced: journalsCreated,
        fromDate: input.fromDate,
        toDate: input.toDate,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      };
    }),
});
