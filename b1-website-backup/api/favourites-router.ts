import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { favourites } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const favouritesRouter = createRouter({
  list: publicQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(favourites).where(eq(favourites.phone, input.phone));
    }),

  toggle: publicQuery
    .input(z.object({ phone: z.string(), menuItemId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(favourites)
        .where(and(eq(favourites.phone, input.phone), eq(favourites.menuItemId, input.menuItemId)))
        .limit(1);

      if (existing) {
        await db.delete(favourites).where(eq(favourites.id, existing.id));
        return { isFavourite: false };
      } else {
        await db.insert(favourites).values({
          phone: input.phone,
          menuItemId: input.menuItemId,
        });
        return { isFavourite: true };
      }
    }),
});
