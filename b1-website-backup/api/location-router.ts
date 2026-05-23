import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { locations } from "@db/schema";
import { eq } from "drizzle-orm";

export const locationRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(locations);
  }),
  getDefault: publicQuery.query(async () => {
    const db = getDb();
    const [loc] = await db.select().from(locations).where(eq(locations.isDefault, true)).limit(1);
    return loc || null;
  }),
});
