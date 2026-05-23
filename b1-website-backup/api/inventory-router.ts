import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { inventory } from "@db/schema";
import { eq } from "drizzle-orm";

export const inventoryRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(inventory);
  }),

  toggle: publicQuery
    .input(z.object({ menuItemId: z.number(), isAvailable: z.boolean(), staffNote: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [existing] = await db.select().from(inventory).where(eq(inventory.menuItemId, input.menuItemId)).limit(1);

      if (existing) {
        await db.update(inventory).set({
          isAvailable: input.isAvailable,
          soldOutAt: input.isAvailable ? null : new Date(),
          restockedAt: input.isAvailable ? new Date() : null,
          staffNote: input.staffNote || null,
        }).where(eq(inventory.id, existing.id));
      } else {
        await db.insert(inventory).values({
          menuItemId: input.menuItemId,
          isAvailable: input.isAvailable,
          soldOutAt: input.isAvailable ? null : new Date(),
          restockedAt: input.isAvailable ? new Date() : null,
          staffNote: input.staffNote || null,
        });
      }
      return { success: true };
    }),
});
