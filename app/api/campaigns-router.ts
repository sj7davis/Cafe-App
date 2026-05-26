import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { campaignMessages, loyaltyAccounts, customerAccounts, venues } from "@db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";
import { sendEmail } from "./lib/email";
import { sendSms } from "./lib/sms";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const campaignsRouter = createRouter({
  // Owner: list all campaigns for venue
  list: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();
      return db
        .select()
        .from(campaignMessages)
        .where(eq(campaignMessages.venueId, venueId))
        .orderBy(desc(campaignMessages.createdAt));
    }),

  // Owner: create a campaign
  create: publicQuery
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1).max(128),
        type: z.enum(["email", "sms"]),
        subject: z.string().max(255).optional(),
        body: z.string().min(1),
        segment: z.enum(["all", "active_30d", "high_value"]),
      })
    )
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const { token, ...data } = input;
      const db = getDb();
      const [campaign] = await db
        .insert(campaignMessages)
        .values({ ...data, venueId, status: "draft" })
        .returning();
      return campaign;
    }),

  // Owner: send a campaign
  send: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();

      // Fetch campaign
      const campaignResults = await db
        .select()
        .from(campaignMessages)
        .where(and(eq(campaignMessages.id, input.id), eq(campaignMessages.venueId, venueId)))
        .limit(1);
      const campaign = campaignResults[0];
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      if (campaign.status === "sent") throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign already sent" });

      // Fetch venue name
      const venueResults = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
      const venue = venueResults[0];
      const venueName = venue?.name ?? "Cafe";

      // Determine recipients
      let allAccounts;
      if (campaign.segment === "active_30d") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        allAccounts = await db
          .select()
          .from(loyaltyAccounts)
          .where(and(eq(loyaltyAccounts.venueId, venueId), gte(loyaltyAccounts.updatedAt, thirtyDaysAgo)))
          .limit(100);
      } else if (campaign.segment === "high_value") {
        allAccounts = await db
          .select()
          .from(loyaltyAccounts)
          .where(and(eq(loyaltyAccounts.venueId, venueId), gte(loyaltyAccounts.totalLifetimePoints, 100)))
          .limit(100);
      } else {
        allAccounts = await db
          .select()
          .from(loyaltyAccounts)
          .where(eq(loyaltyAccounts.venueId, venueId))
          .limit(100);
      }

      let sentCount = 0;

      if (campaign.type === "sms") {
        for (const account of allAccounts) {
          if (account.phone) {
            try {
              await sendSms(account.phone, campaign.body);
              sentCount++;
            } catch {
              // continue on error
            }
          }
        }
      } else {
        // email — look up email via customerAccounts joined by phone+venueId
        for (const account of allAccounts) {
          if (!account.phone) continue;
          const custResults = await db
            .select()
            .from(customerAccounts)
            .where(and(eq(customerAccounts.venueId, venueId), eq(customerAccounts.phone, account.phone)))
            .limit(1);
          const email = custResults[0]?.email;
          if (!email) continue;
          try {
            await sendEmail({
              to: email,
              subject: campaign.subject ?? `Message from ${venueName}`,
              html: campaign.body,
            });
            sentCount++;
          } catch {
            // continue on error
          }
        }
      }

      // Update campaign
      await db
        .update(campaignMessages)
        .set({ status: "sent", sentAt: new Date(), recipientCount: sentCount })
        .where(eq(campaignMessages.id, input.id));

      return { sent: sentCount };
    }),

  // Owner: delete a draft campaign
  delete: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
      const venueId = payload.payload.venueId as number;
      const db = getDb();

      const campaignResults = await db
        .select()
        .from(campaignMessages)
        .where(and(eq(campaignMessages.id, input.id), eq(campaignMessages.venueId, venueId)))
        .limit(1);
      const campaign = campaignResults[0];
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      if (campaign.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft campaigns can be deleted" });

      await db
        .delete(campaignMessages)
        .where(eq(campaignMessages.id, input.id));
      return { success: true };
    }),
});
