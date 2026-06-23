import { describe, it, expect } from "vitest";
import { PLANS, effectiveTier, planFor } from "./plans";

describe("subscription plans", () => {
  it("maps tiers to entitlements", () => {
    expect(PLANS.starter.features).toHaveLength(0);
    expect(PLANS.pro.features).toContain("pos_sync");
    expect(PLANS.pro.features).toContain("analytics");
    expect(PLANS.enterprise.features).toContain("multi_venue");
    expect(PLANS.starter.maxStaff).toBe(2);
    expect(PLANS.pro.maxStaff).toBe(10);
    expect(PLANS.enterprise.maxStaff).toBe(Number.POSITIVE_INFINITY);
  });

  it("falls back to starter for unknown/missing tiers", () => {
    expect(effectiveTier(null, "active")).toBe("starter");
    expect(effectiveTier("bogus", "active")).toBe("starter");
    expect(planFor(undefined).label).toBe("Starter");
  });

  it("drops a cancelled subscription to starter entitlements", () => {
    expect(effectiveTier("pro", "cancelled")).toBe("starter");
    expect(planFor("pro", "cancelled").features).toHaveLength(0);
  });

  it("keeps the paid tier while active, trialing, or past_due", () => {
    expect(effectiveTier("pro", "active")).toBe("pro");
    expect(effectiveTier("pro", "trial")).toBe("pro");
    expect(effectiveTier("enterprise", "past_due")).toBe("enterprise");
  });
});
