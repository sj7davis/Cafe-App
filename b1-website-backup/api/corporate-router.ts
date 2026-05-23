import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { corporateAccounts } from "@db/schema";
import { desc } from "drizzle-orm";

export const corporateRouter = createRouter({
  create: publicQuery.input(z.object({
    companyName: z.string().min(1), contactName: z.string().min(1), contactPhone: z.string().min(6),
    contactEmail: z.string().email().optional(), billingAddress: z.string().optional(),
    paymentTerms: z.enum(["prepaid", "net_7", "net_14", "net_30"]).optional(),
  })).mutation(async ({ input }) => {
    const db = getDb();
    await db.insert(corporateAccounts).values({
      companyName: input.companyName, contactName: input.contactName, contactPhone: input.contactPhone,
      contactEmail: input.contactEmail || null, billingAddress: input.billingAddress || null,
      paymentTerms: input.paymentTerms || "net_7",
    });
    return { success: true };
  }),
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(corporateAccounts).orderBy(desc(corporateAccounts.createdAt));
  }),
});
