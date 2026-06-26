/**
 * Frontend ↔ API contract tests.
 *
 * Each entry replays the exact input shape the frontend sends for a tRPC
 * procedure and asserts it parses against that procedure's zod input schema.
 * This is the regression net for the 2026-06 cleanup, where ~40 UI calls had
 * silently drifted from their router contracts (wrong param names, missing
 * tokens) and failed at runtime.
 *
 * No DB or network needed — schemas are validated in isolation.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./router";

type AnyProc = { _def: { inputs?: unknown[] } };

function getInputSchema(path: string): { safeParse: (v: unknown) => { success: boolean; error?: unknown } } {
  const procedures = (appRouter as unknown as { _def: { procedures: Record<string, unknown> } })._def.procedures;
  let proc = procedures[path] as AnyProc | undefined;
  if (!proc) {
    // fall back to walking nested router records
    let node: unknown = appRouter;
    for (const seg of path.split(".")) {
      node = (node as { _def?: { record?: Record<string, unknown> } })?._def?.record?.[seg] ?? (node as Record<string, unknown>)?.[seg];
      if (!node) throw new Error(`procedure not found: ${path}`);
    }
    proc = node as AnyProc;
  }
  const input = proc._def.inputs?.[0];
  if (!input || typeof (input as { safeParse?: unknown }).safeParse !== "function") {
    throw new Error(`no zod input schema on: ${path}`);
  }
  return input as ReturnType<typeof getInputSchema>;
}

const T = "jwt-token";

/** [procedure path, payload the frontend actually sends] */
const validCalls: [string, Record<string, unknown>][] = [
  // ── venue ──────────────────────────────────────────────────────────────────
  ["venue.getBySlug", { slug: "b1-backhaus" }],
  ["venue.getById", { id: 1 }],
  ["venue.listMenu", { venueId: 1 }],
  ["venue.menuItemCosts", { token: T }],
  ["venue.createMenuItem", { venueId: 1, slug: "flat-white", name: "Flat White", price: "5.00", cost: "1.80", category: "coffee" }],
  ["venue.getInventoryLevels", { token: T }],
  ["venue.setInventoryQuantity", { token: T, menuItemId: 2, quantity: 5, quantityAlert: 2 }],
  ["venue.toggleInventoryItem", { token: T, venueId: 1, menuItemId: 2, isAvailable: false }],
  ["venue.listBundles", { token: T }],
  ["venue.createBundle", { token: T, name: "Breakfast", itemSlugs: "flat-white,croissant", bundlePrice: "12.00" }],
  ["venue.updateBundle", { token: T, id: 3, name: "Breakfast", itemSlugs: "flat-white", bundlePrice: "10.00", isActive: true }],
  ["venue.deleteBundle", { token: T, id: 3 }],
  ["venue.listMenuModifiers", { venueId: 1, menuItemId: 2 }],
  ["venue.addMenuModifier", { token: T, menuItemId: 2, name: "Milk", options: [{ name: "Oat", priceAdj: 0.5 }], required: false }],
  ["venue.deleteMenuModifier", { token: T, modifierId: 4 }],
  ["venue.setHappyHour", { token: T, enabled: true, startTime: "15:00", endTime: "17:00", discountPercent: 20, label: "Happy Hour" }],
  ["venue.saveTable", { token: T, tableNumber: "12", capacity: 4, shape: "round", section: "Indoor" }],
  ["venue.deleteTable", { token: T, id: 7 }],
  ["venue.getOrdersByPhone", { venueId: 1, phone: "0400000000", limit: 20 }],
  ["venue.saveAbandonedCart", { venueId: 1, phone: "0400000000", itemsJson: "[]", totalAmount: "12.50" }],
  ["venue.getGroupSession", { sessionCode: "ABC123" }],

  // ── customerAuth ───────────────────────────────────────────────────────────
  ["customerAuth.me", { token: T }],
  ["customerAuth.updateProfile", { token: T, name: "Sam", phone: "0400000000", birthday: "07-25", allergies: "nuts", marketingOptIn: true }],
  ["customerAuth.changePassword", { token: T, currentPassword: "old-pass", newPassword: "new-pass" }],

  // ── loyaltyRewards ─────────────────────────────────────────────────────────
  ["loyaltyRewards.listAll", { token: T }],
  ["loyaltyRewards.create", { token: T, name: "Free Coffee", pointsCost: 100, rewardType: "free_item" }],
  ["loyaltyRewards.update", { token: T, id: 1, pointsCost: 120, rewardType: "discount_percent" }],
  ["loyaltyRewards.delete", { token: T, id: 1 }],

  // ── delivery ───────────────────────────────────────────────────────────────
  ["delivery.list", { token: T, platform: "all", days: 30 }],
  ["delivery.create", { token: T, platform: "uber_eats", customerName: "Sam", itemsJson: "2x latte", subtotal: "18.00", platformFee: "3.00" }],
  ["delivery.logManualOrder", { token: T, platform: "doordash", itemsJson: "1x toastie", subtotal: "9.50", platformFee: "0" }],
  ["delivery.updateStatus", { token: T, id: 5, status: "picked_up" }],

  // ── waitlist ───────────────────────────────────────────────────────────────
  ["waitlist.getQueue", { token: T }],
  ["waitlist.notify", { token: T, id: 9 }],
  ["waitlist.seat", { token: T, id: 9 }],
  ["waitlist.cancel", { token: T, id: 9 }],

  // ── scheduling / shift management ──────────────────────────────────────────
  ["scheduling.addShift", { token: T, staffId: 2, shiftDate: "2026-06-16", startTime: "08:00", endTime: "14:00", role: "Barista" }],
  ["shiftManagement.setAvailability", { token: T, dayOfWeek: 1, available: true, preferredStartTime: "08:00" }],
  ["shiftManagement.requestTimeOff", { token: T, startDate: "2026-07-01", endDate: "2026-07-03", leaveType: "annual" }],
  ["shiftManagement.reviewTimeOff", { token: T, requestId: 4, status: "approved" }],

  // ── waste ──────────────────────────────────────────────────────────────────
  ["waste.list", { token: T }],
  ["waste.log", { token: T, itemName: "Croissant", quantity: 2, reason: "Spoiled", costEstimate: "8.00" }],
  ["waste.delete", { token: T, id: 3 }],

  // ── xero ───────────────────────────────────────────────────────────────────
  ["xero.getConnection", { token: T }],
  ["xero.getAuthUrl", { token: T }],
  ["xero.syncRevenue", { token: T, fromDate: "2026-06-01", toDate: "2026-06-30" }],
  ["xero.disconnect", { token: T }],

  // ── integrations (OAuth auth-url + status; signed state built server-side) ──
  ["square.getOAuthUrl", { token: T }],
  ["square.status", { token: T }],
  ["lightspeed.getAuthUrl", { token: T }],
  ["lightspeed.getConnection", { token: T }],
  ["venue.gmbGetAuthUrl", { token: T }],
  ["venue.gmbGetConnection", { token: T }],
  // API-key providers (vendor has no OAuth server) — keys never leave the server
  ["impos.connect", { token: T, apiKey: "k_123", siteId: "site_9" }],
  ["tyro.connect", { token: T, apiKey: "k_123", merchantId: "m_9" }],

  // ── franchisee / reservations / nps ────────────────────────────────────────
  ["franchisee.setup", { token: T, platformFeePercent: 3, payoutSchedule: "monthly" }],
  ["reservations.create", { venueId: 1, customerName: "Sam", customerPhone: "0400000000", partySize: 2, reservationDate: "2026-06-20", reservationTime: "12:30" }],
  ["nps.getStats", { token: T }],

  // ── stripeCheckout (incl. post-purchase metadata) ──────────────────────────
  ["stripeCheckout.createCheckoutSession", {
    venueId: 1,
    items: [{ menuItemId: 2, name: "Flat White", itemName: "Flat White", quantity: 1, unitPrice: 4.5 }],
    tipAmount: 1,
    discountAmount: 0,
    customerName: "Sam",
    customerPhone: "0400000000",
    pickupTime: "ASAP",
    loyaltyPointsRedeemed: 0,
    metadata: { prefMilk: "Oat", prefSugar: "1", passId: "3" },
  }],
  ["stripeCheckout.verifySession", { sessionId: "cs_test_123", venueSlug: "b1-backhaus" }],
];

/** Payloads that MUST be rejected — the drifted shapes the old UI used to send. */
const driftedCalls: [string, Record<string, unknown>][] = [
  ["venue.deleteBundle", { token: T, bundleId: 3 }],            // wrong key: bundleId vs id
  ["venue.deleteTable", { token: T, tableId: 7 }],              // wrong key: tableId vs id
  ["loyaltyRewards.delete", { token: T, rewardId: 1 }],         // wrong key: rewardId vs id
  ["delivery.updateStatus", { token: T, orderId: 5, status: "picked_up" }], // wrong key: orderId vs id
  ["delivery.logManualOrder", { token: T, platform: "uber_eats", items: "x", subtotal: 9.5 }], // itemsJson missing, subtotal not string
  ["scheduling.addShift", { token: T, staffId: 2, date: "2026-06-16", startTime: "08:00", endTime: "14:00" }], // date vs shiftDate
  ["xero.syncRevenue", { token: T, from: "2026-06-01", to: "2026-06-30" }], // from/to vs fromDate/toDate
  ["waitlist.notify", { id: 9 }],                               // missing token
  ["customerAuth.me", {}],                                      // missing token
];

describe("frontend payloads parse against router input schemas", () => {
  it.each(validCalls)("%s accepts the frontend payload", (path, payload) => {
    const result = getInputSchema(path).safeParse(payload);
    if (!result.success) console.error(path, JSON.stringify(result.error, null, 2));
    expect(result.success).toBe(true);
  });
});

describe("known-drifted payloads are rejected (contract net works)", () => {
  it.each(driftedCalls)("%s rejects the drifted payload", (path, payload) => {
    expect(getInputSchema(path).safeParse(payload).success).toBe(false);
  });
});
