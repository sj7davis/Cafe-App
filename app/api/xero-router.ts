// Note: See boot.ts for /api/xero/callback Hono route (OAuth redirect handler)

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { xeroConnections, orders } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

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

      if (!process.env.XERO_CLIENT_ID) {
        return { url: null, configured: false };
      }

      const state = Buffer.from(JSON.stringify({ venueId })).toString("base64");
      const appUrl = (env as any).appUrl ?? process.env.APP_URL ?? "http://localhost:3000";
      const redirectUri = `${appUrl}/api/xero/callback`;

      const url =
        `https://login.xero.com/identity/connect/authorize` +
        `?response_type=code` +
        `&client_id=${process.env.XERO_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent("openid profile email accounting.transactions accounting.contacts")}` +
        `&state=${encodeURIComponent(state)}`;

      return { url, configured: true };
    }),

  // Owner: sync revenue to Xero
  syncRevenue: publicQuery
    .input(
      z.object({
        token: z.string(),
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();

      const connectionResults = await db
        .select()
        .from(xeroConnections)
        .where(eq(xeroConnections.venueId, venueId))
        .limit(1);
      const connection = connectionResults[0];

      if (!connection || !connection.isConnected || !connection.accessToken) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Xero is not connected. Please connect your Xero account first." });
      }

      // Stub: full Xero API sync implementation pending
      return { synced: 0, message: "Xero sync not fully configured" };
    }),
});
