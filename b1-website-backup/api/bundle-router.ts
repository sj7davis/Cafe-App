import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bundles, menuItems, inventory } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const bundleRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const allBundles = await db.select().from(bundles).where(eq(bundles.isActive, true));
    const allItems = await db.select().from(menuItems);
    const invRecords = await db.select().from(inventory);
    const invMap = new Map(invRecords.map((r) => [r.menuItemId, r.isAvailable]));
    const itemMap = new Map(allItems.map((i) => [i.slug, { ...i, price: parseFloat(i.price), isAvailable: invMap.get(i.id) ?? true }]));

    return allBundles.map((b) => {
      const slugs: string[] = JSON.parse(b.itemSlugs);
      const items = slugs.map((s) => itemMap.get(s)).filter(Boolean);
      const originalTotal = items.reduce((sum, i: any) => sum + i.price, 0);
      const savings = originalTotal - parseFloat(b.bundlePrice);
      return { ...b, items, bundlePrice: parseFloat(b.bundlePrice), savings: savings > 0 ? savings : 0 };
    });
  }),
});
