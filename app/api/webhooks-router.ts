import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { webhookSubscriptions } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";
import { createHmac } from "crypto";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

// Export for use by other routers/event handlers
export async function triggerWebhooks(venueId: number, event: string, payload: object): Promise<void> {
  try {
    const db = getDb();
    const subscriptions = await db
      .select()
      .from(webhookSubscriptions)
      .where(and(eq(webhookSubscriptions.venueId, venueId), eq(webhookSubscriptions.isActive, true)));

    const activeSubscriptions = subscriptions.filter((sub) => {
      const events = sub.events as string[];
      return Array.isArray(events) && events.includes(event);
    });

    const body = JSON.stringify({ event, timestamp: Date.now(), venueId, data: payload });

    for (const sub of activeSubscriptions) {
      (async () => {
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (sub.secret) {
            const sig = createHmac("sha256", sub.secret).update(body).digest("hex");
            headers["X-B1-Signature"] = `sha256 ${sig}`;
          }
          await fetch(sub.url, { method: "POST", headers, body });
          await db
            .update(webhookSubscriptions)
            .set({ lastTriggeredAt: new Date() })
            .where(eq(webhookSubscriptions.id, sub.id));
        } catch {
          // Non-blocking: silently ignore errors
        }
      })();
    }
  } catch {
    // Non-blocking: silently ignore errors
  }
}

export const webhooksRouter = createRouter({
  // Owner: list all webhook subscriptions
  list: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      return db
        .select()
        .from(webhookSubscriptions)
        .where(eq(webhookSubscriptions.venueId, venueId));
    }),

  // Owner: create a webhook subscription
  create: publicQuery
    .input(
      z.object({
        token: z.string(),
        url: z.string().url(),
        events: z.array(z.string()).min(1),
        secret: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const { token, ...data } = input;
      const db = getDb();
      const [sub] = await db
        .insert(webhookSubscriptions)
        .values({ venueId, ...data, isActive: true })
        .returning();
      return sub;
    }),

  // Owner: update a webhook subscription
  update: publicQuery
    .input(
      z.object({
        token: z.string(),
        id: z.number().int().positive(),
        url: z.string().url().optional(),
        events: z.array(z.string()).optional(),
        secret: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const { token, id, ...data } = input;
      const db = getDb();
      const [sub] = await db
        .update(webhookSubscriptions)
        .set(data)
        .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.venueId, venueId)))
        .returning();
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Webhook subscription not found" });
      return sub;
    }),

  // Owner: delete a webhook subscription
  delete: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      await db
        .delete(webhookSubscriptions)
        .where(and(eq(webhookSubscriptions.id, input.id), eq(webhookSubscriptions.venueId, venueId)));
      return { success: true };
    }),

  // Owner: fire a test payload to a webhook
  test: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();

      const subResults = await db
        .select()
        .from(webhookSubscriptions)
        .where(and(eq(webhookSubscriptions.id, input.id), eq(webhookSubscriptions.venueId, venueId)))
        .limit(1);
      const sub = subResults[0];
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Webhook subscription not found" });

      const body = JSON.stringify({ event: "test", timestamp: Date.now(), venueId });
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sub.secret) {
        const sig = createHmac("sha256", sub.secret).update(body).digest("hex");
        headers["X-B1-Signature"] = `sha256 ${sig}`;
      }

      const response = await fetch(sub.url, { method: "POST", headers, body });
      return { status: response.status };
    }),
});
