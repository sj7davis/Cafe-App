import { venueRouter } from "./venue-router";
import { platformAdminRouter } from "./platform-admin-router";
import { billingRouter } from "./billing-router";
import { squareRouter } from "./square-router";
import { staffAuthRouter } from "./staff-auth-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  venue: venueRouter,
  platformAdmin: platformAdminRouter,
  billing: billingRouter,
  square: squareRouter,
  staffAuth: staffAuthRouter,
});

export type AppRouter = typeof appRouter;
