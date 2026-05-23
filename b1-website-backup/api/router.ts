import { authRouter } from "./auth-router";
import { menuRouter } from "./menu-router";
import { inventoryRouter } from "./inventory-router";
import { bundleRouter } from "./bundle-router";
import { preferencesRouter } from "./preferences-router";
import { subscriptionRouter } from "./subscription-router";
import { referralRouter } from "./referral-router";
import { orderRouter } from "./order-router";
import { staffRouter } from "./staff-router";
import { loyaltyRouter } from "./loyalty-router";
import { favouritesRouter } from "./favourites-router";
import { reviewsRouter } from "./reviews-router";
import { giftCardRouter } from "./gift-card-router";
import { cateringRouter } from "./catering-router";
import { corporateRouter } from "./corporate-router";
import { pushRouter } from "./push-router";
import { locationRouter } from "./location-router";
import { analyticsRouter } from "./analytics-router";
import { staffAuthRouter } from "./staff-auth-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  menu: menuRouter,
  inventory: inventoryRouter,
  bundle: bundleRouter,
  preferences: preferencesRouter,
  subscription: subscriptionRouter,
  referral: referralRouter,
  order: orderRouter,
  staff: staffRouter,
  loyalty: loyaltyRouter,
  favourites: favouritesRouter,
  reviews: reviewsRouter,
  giftCard: giftCardRouter,
  catering: cateringRouter,
  corporate: corporateRouter,
  push: pushRouter,
  location: locationRouter,
  analytics: analyticsRouter,
  staffAuth: staffAuthRouter,
});

export type AppRouter = typeof appRouter;
