import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyUberEatsSignature, verifyDoorDashAuth, verifyMenulogSecret } from "./webhook-auth";

describe("verifyUberEatsSignature", () => {
  const secret = "uber-client-secret";
  const rawBody = JSON.stringify({ id: "order_123", meta: { status: "order.notification" } });
  const validSig = createHmac("sha256", secret).update(rawBody).digest("hex");

  it("accepts a correctly signed body", () => {
    expect(verifyUberEatsSignature(rawBody, validSig, secret)).toBe(true);
  });

  it("is case-insensitive on the hex digest", () => {
    expect(verifyUberEatsSignature(rawBody, validSig.toUpperCase(), secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const tampered = rawBody.replace("order_123", "order_999");
    expect(verifyUberEatsSignature(tampered, validSig, secret)).toBe(false);
  });

  it("rejects a wrong signature", () => {
    expect(verifyUberEatsSignature(rawBody, "0".repeat(64), secret)).toBe(false);
  });

  it("rejects when the secret isn't configured (fail closed)", () => {
    expect(verifyUberEatsSignature(rawBody, validSig, "")).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyUberEatsSignature(rawBody, undefined, secret)).toBe(false);
  });
});

describe("verifyDoorDashAuth", () => {
  const expected = "Basic " + Buffer.from("b1platform:s3cret").toString("base64");

  it("accepts a matching Authorization header", () => {
    expect(verifyDoorDashAuth(expected, expected)).toBe(true);
  });

  it("rejects a mismatched header", () => {
    expect(verifyDoorDashAuth("Basic d3Jvbmc6d3Jvbmc=", expected)).toBe(false);
  });

  it("rejects when not configured (fail closed)", () => {
    expect(verifyDoorDashAuth(expected, "")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifyDoorDashAuth(undefined, expected)).toBe(false);
  });
});

describe("verifyMenulogSecret", () => {
  const expected = "menulog-shared-secret";

  it("accepts a matching secret", () => {
    expect(verifyMenulogSecret(expected, expected)).toBe(true);
  });

  it("rejects a mismatched secret", () => {
    expect(verifyMenulogSecret("wrong-secret", expected)).toBe(false);
  });

  it("rejects when not configured (fail closed)", () => {
    expect(verifyMenulogSecret(expected, "")).toBe(false);
  });

  it("rejects a missing secret", () => {
    expect(verifyMenulogSecret(undefined, expected)).toBe(false);
  });
});
