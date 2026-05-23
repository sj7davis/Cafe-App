import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { reviews } from "@db/schema";
import { desc } from "drizzle-orm";

export const reviewsRouter = createRouter({
  create: publicQuery
    .input(z.object({
      orderId: z.number(),
      customerName: z.string().min(1),
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(reviews).values({
        orderId: input.orderId,
        customerName: input.customerName,
        rating: input.rating,
        comment: input.comment || null,
      });
      return { success: true };
    }),

  listRecent: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(20);
  }),
});
