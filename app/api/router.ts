import { venueRouter } from "./venue-router";
import { platformAdminRouter } from "./platform-admin-router";
import { billingRouter } from "./billing-router";
import { squareRouter } from "./square-router";
import { staffAuthRouter } from "./staff-auth-router";
import { loyaltyRouter } from "./loyalty-router";
import { analyticsRouter } from "./analytics-router";
import { promoRouter } from "./promo-router";
import { stripeCheckoutRouter } from "./stripe-checkout-router";
import { customerAuthRouter } from "./customer-auth-router";
import { schedulingRouter } from "./scheduling-router";
import { campaignsRouter } from "./campaigns-router";
import { loyaltyRewardsRouter } from "./loyalty-rewards-router";
import { npsRouter } from "./nps-router";
import { wasteRouter } from "./waste-router";
import { waitlistRouter } from "./waitlist-router";
import { webhooksRouter } from "./webhooks-router";
import { xeroRouter } from "./xero-router";
import { reservationsRouter } from "./reservations-router";
import { lightspeedRouter } from "./lightspeed-router";
import { tyroRouter } from "./tyro-router";
import { imposRouter } from "./impos-router";
import { deliveryRouter } from "./delivery-router";
import { clockRouter } from "./clock-router";
import { auditRouter } from "./audit-router";
import { multiVenueRouter } from "./multi-venue-router";
import { smsMarketingRouter } from "./sms-marketing-router";
import { trainingRouter } from "./training-router";
import { franchiseeRouter } from "./franchisee-router";
import { shiftManagementRouter } from "./shift-management-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  venue: venueRouter,
  platformAdmin: platformAdminRouter,
  billing: billingRouter,
  square: squareRouter,
  staffAuth: staffAuthRouter,
  loyalty: loyaltyRouter,
  analytics: analyticsRouter,
  promo: promoRouter,
  stripeCheckout: stripeCheckoutRouter,
  customerAuth: customerAuthRouter,
  scheduling: schedulingRouter,
  campaigns: campaignsRouter,
  loyaltyRewards: loyaltyRewardsRouter,
  nps: npsRouter,
  waste: wasteRouter,
  waitlist: waitlistRouter,
  webhooks: webhooksRouter,
  xero: xeroRouter,
  reservations: reservationsRouter,
  lightspeed: lightspeedRouter,
  tyro: tyroRouter,
  impos: imposRouter,
  delivery: deliveryRouter,
  clock: clockRouter,
  audit: auditRouter,
  multiVenue: multiVenueRouter,
  smsMarketing: smsMarketingRouter,
  training: trainingRouter,
  franchisee: franchiseeRouter,
  shiftManagement: shiftManagementRouter,
});

export type AppRouter = typeof appRouter;
