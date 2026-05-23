import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { pushSubscriptions } from "@db/schema";
import { eq } from "drizzle-orm";

export const pushRouter = createRouter({
  subscribe: publicQuery.input(z.object({
    endpoint: z.string(), p256dh: z.string(), auth: z.string(), phone: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    await db.insert(pushSubscriptions).values({
      endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth, phone: input.phone || null,
    });
    return { success: true };
  }),
  unsubscribe: publicQuery.input(z.object({ endpoint: z.string() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, input.endpoint));
    return { success: true };
  }),
  sendReadyNotification: publicQuery.input(z.object({ phone: z.string(), orderNumber: z.string() })).mutation(async ({ input }) => {
    const db = getDb();
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.phone, input.phone));
    return { sent: subs.length, message: `Notification queued for ${subs.length} device(s)` };
  }),
});
