import { describe, it, expect } from "vitest";
import { stackDiscounts, type PricedLine } from "./cart-pricing";

const line = (name: string, unitCents: number, quantity = 1, category = "coffee"): PricedLine =>
  ({ menuItemId: 1, name, note: null, quantity, unitCents, category });

const base = { pass: null, promo: null, giftCard: null, loyalty: null, surchargePercent: null, tipCents: 0 };

describe("stackDiscounts", () => {
  it("totals lines with no discounts", () => {
    const q = stackDiscounts({ ...base, lines: [line("Latte", 550, 2), line("Croissant", 600, 1, "pastries")] });
    expect(q.subtotalCents).toBe(1700);
    expect(q.totalCents).toBe(1700);
  });

  it("applies a percentage code then a gift card, capped at the subtotal", () => {
    const q = stackDiscounts({
      ...base,
      lines: [line("Latte", 1000)],
      promo: { kind: "code", label: "10% off", code: "TEN", percent: 10 },
      giftCard: { id: 1, code: "GIFT", balanceCents: 5000 },
    });
    expect(q.promo?.cents).toBe(100);
    expect(q.giftCard?.cents).toBe(900); // only what's left, not the whole $50
    expect(q.discountCents).toBe(1000);
    expect(q.totalCents).toBe(0);
  });

  it("never lets a fixed code exceed the order", () => {
    const q = stackDiscounts({ ...base, lines: [line("Latte", 500)], promo: { kind: "code", label: "$20 off", fixedCents: 2000 } });
    expect(q.promo?.cents).toBe(500);
    expect(q.totalCents).toBe(0);
  });

  it("makes the dearest coffee free with a pass credit", () => {
    const q = stackDiscounts({
      ...base, pass: { id: 9 },
      lines: [line("Flat white", 500), line("Large latte", 650), line("Muffin", 450, 1, "pastries")],
    });
    expect(q.pass).toEqual({ id: 9, cents: 650 });
    expect(q.totalCents).toBe(950);
  });

  it("spends only the loyalty points needed and available", () => {
    const q = stackDiscounts({
      ...base, lines: [line("Latte", 550)],
      loyalty: { phone: "0400", points: 200, availablePoints: 200 },
    });
    expect(q.loyalty).toEqual({ phone: "0400", points: 55, cents: 550 }); // 200 pts = $20, but order is $5.50
    expect(q.totalCents).toBe(0);
  });

  it("adds the holiday surcharge on the subtotal and the tip on top, separately", () => {
    const q = stackDiscounts({
      ...base, lines: [line("Latte", 1000)],
      promo: { kind: "happy_hour", label: "Happy Hour", percent: 50 },
      surchargePercent: 10, surchargeLabel: "Christmas Day surcharge (10%)",
      tipCents: 200,
    });
    expect(q.surcharge?.cents).toBe(100);
    expect(q.tipCents).toBe(200);
    expect(q.totalCents).toBe(500 + 100 + 200);
  });
});
