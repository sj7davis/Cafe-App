import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { customerAccounts, orders, campaignMessages } from "@db/schema";
import { eq, and, gte, desc, isNotNull, sql } from "drizzle-orm";
import { jwtVerify } from "jose";
import { env } from "./lib/env";
import { sendSms } from "./lib/sms";

const JWT_SECRET = new TextEncoder().encode(env.jwtSecret);

export const smsMarketingRouter = createRouter({
  // Get customer counts for each segment
  getSegments: publicQuery.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const currentMonth = now.getMonth() + 1;

    // All opted-in customers with a phone number
    const allCustomers = await db.select({ id: customerAccounts.id, phone: customerAccounts.phone })
      .from(customerAccounts)
      .where(and(
        eq(customerAccounts.venueId, venueId),
        eq(customerAccounts.marketingOptIn, true),
        isNotNull(customerAccounts.phone)
      ));

    if (allCustomers.length === 0) {
      return {
        segments: [
          { key: "all", label: "All opted-in customers", count: 0 },
          { key: "lapsed_30d", label: "Lapsed 30+ days", count: 0 },
          { key: "lapsed_60d", label: "Lapsed 60+ days", count: 0 },
          { key: "birthday_month", label: "Birthday this month", count: 0 },
          { key: "top_spenders", label: "Top spenders (>$200)", count: 0 },
        ]
      };
    }

    // Lapsed: phone has not appeared in orders in the last 30 days
    const recentPhones30 = await db.selectDistinct({ phone: orders.customerPhone })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, thirtyDaysAgo)
      ));
    const recentPhoneSet30 = new Set(recentPhones30.map(r => r.phone));
    const lapsed30 = allCustomers.filter(c => c.phone && !recentPhoneSet30.has(c.phone));

    const recentPhones60 = await db.selectDistinct({ phone: orders.customerPhone })
      .from(orders)
      .where(and(
        eq(orders.venueId, venueId),
        gte(orders.createdAt, sixtyDaysAgo)
      ));
    const recentPhoneSet60 = new Set(recentPhones60.map(r => r.phone));
    const lapsed60 = allCustomers.filter(c => c.phone && !recentPhoneSet60.has(c.phone));

    // Birthday this month — birthday stored as "MM-DD" varchar(5)
    const birthdayCustomers = await db.select({ id: customerAccounts.id })
      .from(customerAccounts)
      .where(and(
        eq(customerAccounts.venueId, venueId),
        eq(customerAccounts.marketingOptIn, true),
        isNotNull(customerAccounts.phone),
        sql`CAST(SPLIT_PART(${customerAccounts.birthday}, '-', 1) AS INTEGER) = ${currentMonth}`
      )).catch(() => [] as { id: number }[]);

    // Top spenders: customers whose phone has total spend > $200 across all their orders
    const spendRows = await db.select({
      phone: orders.customerPhone,
      total: sql<number>`SUM(${orders.totalAmount}::numeric)`,
    }).from(orders)
      .where(eq(orders.venueId, venueId))
      .groupBy(orders.customerPhone)
      .having(sql`SUM(${orders.totalAmount}::numeric) > 200`);
    const topPhoneSet = new Set(spendRows.map(r => r.phone));
    const topSpenders = allCustomers.filter(c => c.phone && topPhoneSet.has(c.phone));

    return {
      segments: [
        { key: "all", label: "All opted-in customers", count: allCustomers.length },
        { key: "lapsed_30d", label: "Lapsed 30+ days", count: lapsed30.length },
        { key: "lapsed_60d", label: "Lapsed 60+ days", count: lapsed60.length },
        { key: "birthday_month", label: `Birthday in ${now.toLocaleString("en-AU", { month: "long" })}`, count: birthdayCustomers.length },
        { key: "top_spenders", label: "Top spenders (>$200 lifetime)", count: topSpenders.length },
      ]
    };
  }),

  // Send bulk SMS to a segment
  sendBulkSms: publicQuery.input(z.object({
    token: z.string(),
    segment: z.enum(["all", "lapsed_30d", "lapsed_60d", "birthday_month", "top_spenders"]),
    message: z.string().min(1).max(160),
  })).mutation(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const currentMonth = now.getMonth() + 1;

    let customers: { id: number; phone: string | null }[] = [];

    const base = await db.select({ id: customerAccounts.id, phone: customerAccounts.phone })
      .from(customerAccounts)
      .where(and(
        eq(customerAccounts.venueId, venueId),
        eq(customerAccounts.marketingOptIn, true),
        isNotNull(customerAccounts.phone)
      ));

    if (input.segment === "all") {
      customers = base;
    } else if (input.segment === "lapsed_30d") {
      const recent = await db.selectDistinct({ phone: orders.customerPhone })
        .from(orders)
        .where(and(
          eq(orders.venueId, venueId),
          gte(orders.createdAt, thirtyDaysAgo)
        ));
      const recentPhones = new Set(recent.map(r => r.phone));
      customers = base.filter(c => c.phone && !recentPhones.has(c.phone));
    } else if (input.segment === "lapsed_60d") {
      const recent = await db.selectDistinct({ phone: orders.customerPhone })
        .from(orders)
        .where(and(
          eq(orders.venueId, venueId),
          gte(orders.createdAt, sixtyDaysAgo)
        ));
      const recentPhones = new Set(recent.map(r => r.phone));
      customers = base.filter(c => c.phone && !recentPhones.has(c.phone));
    } else if (input.segment === "birthday_month") {
      const bday = await db.select({ id: customerAccounts.id, phone: customerAccounts.phone })
        .from(customerAccounts)
        .where(and(
          eq(customerAccounts.venueId, venueId),
          eq(customerAccounts.marketingOptIn, true),
          isNotNull(customerAccounts.phone),
          sql`CAST(SPLIT_PART(${customerAccounts.birthday}, '-', 1) AS INTEGER) = ${currentMonth}`
        )).catch(() => [] as { id: number; phone: string | null }[]);
      customers = bday;
    } else if (input.segment === "top_spenders") {
      const spendRows = await db.select({ phone: orders.customerPhone })
        .from(orders)
        .where(eq(orders.venueId, venueId))
        .groupBy(orders.customerPhone)
        .having(sql`SUM(${orders.totalAmount}::numeric) > 200`);
      const topPhones = new Set(spendRows.map(r => r.phone));
      customers = base.filter(c => c.phone && topPhones.has(c.phone));
    }

    if (customers.length === 0) return { sent: 0, failed: 0, total: 0 };

    let sent = 0;
    let failed = 0;
    for (const customer of customers) {
      if (!customer.phone) continue;
      try {
        await sendSms(customer.phone, input.message);
        sent++;
        // Small delay to avoid Twilio rate limits
        await new Promise(r => setTimeout(r, 100));
      } catch {
        failed++;
      }
    }

    // Log the campaign — don't fail if logging fails
    await db.insert(campaignMessages).values({
      venueId,
      name: `SMS Campaign — ${input.segment}`,
      type: "sms",
      subject: "SMS Campaign",
      body: input.message,
      segment: input.segment as "all" | "active_30d" | "high_value",
      recipientCount: customers.length,
      sentAt: new Date(),
      status: "sent",
    }).catch(() => {});

    return { sent, failed, total: customers.length };
  }),

  // Get campaign history
  getCampaignHistory: publicQuery.input(z.object({
    token: z.string(),
    limit: z.number().default(20),
  })).query(async ({ input }) => {
    const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
    const venueId = payload.payload.venueId as number;
    const db = getDb();

    return db.select().from(campaignMessages)
      .where(and(
        eq(campaignMessages.venueId, venueId),
        eq(campaignMessages.type, "sms")
      ))
      .orderBy(desc(campaignMessages.sentAt))
      .limit(input.limit);
  }),
});
