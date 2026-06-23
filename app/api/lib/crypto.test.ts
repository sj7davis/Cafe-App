import { describe, it, expect } from "vitest";
import { seal, open, isSealed } from "./crypto";

describe("secrets encryption", () => {
  it("round-trips a secret", () => {
    const secret = "sq0atp-abc123_TOKEN.value";
    const sealed = seal(secret);
    expect(sealed).not.toBe(secret);
    expect(isSealed(sealed)).toBe(true);
    expect(open(sealed)).toBe(secret);
  });

  it("uses a fresh IV each time (ciphertexts differ, both decrypt)", () => {
    const a = seal("same-token");
    const b = seal("same-token");
    expect(a).not.toBe(b);
    expect(open(a)).toBe("same-token");
    expect(open(b)).toBe("same-token");
  });

  it("passes through null/empty unchanged", () => {
    expect(seal(null)).toBeNull();
    expect(seal("")).toBeNull();
    expect(open(null)).toBeNull();
    expect(open(undefined)).toBeNull();
  });

  it("treats non-sealed input as legacy plaintext on read", () => {
    expect(open("legacy-plaintext-token")).toBe("legacy-plaintext-token");
  });

  it("is idempotent — re-sealing a sealed value is a no-op", () => {
    const once = seal("token");
    expect(seal(once)).toBe(once);
  });

  it("detects tampering (auth tag) and throws", () => {
    const sealed = seal("token")!;
    const tampered = sealed.slice(0, -2) + (sealed.endsWith("AA") ? "BB" : "AA");
    expect(() => open(tampered)).toThrow();
  });
});
