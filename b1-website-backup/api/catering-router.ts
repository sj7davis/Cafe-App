import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cateringRequests } from "@db/schema";
import { desc } from "drizzle-orm";

export const cateringRouter = createRouter({
  create: publicQuery
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(6),
      email: z.string().email().optional(),
      eventDate: z.string(),
      guestCount: z.number().min(6),
      details: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(cateringRequests).values({
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        eventDate: input.eventDate,
        guestCount: input.guestCount,
        details: input.details || null,
      });
      return { success: true };
    }),

  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(cateringRequests).orderBy(desc(cateringRequests.createdAt));
  }),
});
