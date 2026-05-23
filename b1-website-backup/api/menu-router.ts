import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { menuItems, inventory } from "@db/schema";
import { eq, and } from "drizzle-orm";

function parseItem(item: any) {
  return {
    ...item,
    dietary: item.dietary ? JSON.parse(item.dietary) : [],
    originTastingNotes: item.originTastingNotes ? JSON.parse(item.originTastingNotes) : [],
    price: parseFloat(item.price),
  };
}

export const menuRouter = createRouter({
  listByCategory: publicQuery
    .input(z.object({ category: z.enum(["coffee", "pastries", "bread"]) }))
    .query(async ({ input }) => {
      const db = getDb();
      const items = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.category, input.category));

      const invRecords = await db.select().from(inventory);
      const invMap = new Map(invRecords.map((r) => [r.menuItemId, r.isAvailable]));

      return items.map((item) => ({
        ...parseItem(item),
        isAvailable: invMap.get(item.id) ?? true,
      }));
    }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [item] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.slug, input.slug))
        .limit(1);
      if (!item) return null;

      const [inv] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.menuItemId, item.id))
        .limit(1);

      return {
        ...parseItem(item),
        isAvailable: inv?.isAvailable ?? true,
      };
    }),

  yourUsual: publicQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const { favourites } = await import("@db/schema");

      const favs = await db
        .select()
        .from(favourites)
        .where(eq(favourites.phone, input.phone));

      if (favs.length === 0) return [];

      const itemIds = favs.map((f) => f.menuItemId);
      const allItems = await db.select().from(menuItems);
      const invRecords = await db.select().from(inventory);
      const invMap = new Map(invRecords.map((r) => [r.menuItemId, r.isAvailable]));

      return allItems
        .filter((item) => itemIds.includes(item.id))
        .map((item) => ({
          ...parseItem(item),
          isAvailable: invMap.get(item.id) ?? true,
        }));
    }),
});
