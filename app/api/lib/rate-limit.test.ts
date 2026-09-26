import { describe, it, expect } from "vitest";
import type { IncomingMessage } from "http";
import { checkRateLimit, getClientIp } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it("blocks once the limit is hit", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });

  it("tracks distinct keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    expect(checkRateLimit(keyA, 1, 60_000)).toBe(true);
    expect(checkRateLimit(keyA, 1, 60_000)).toBe(false);
    expect(checkRateLimit(keyB, 1, 60_000)).toBe(true);
  });

  it("resets once the window has passed", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 1, 10)).toBe(true);
    expect(checkRateLimit(key, 1, 10)).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit(key, 1, 10)).toBe(true);
        resolve();
      }, 20);
    });
  });
});

function mockReq(headers: Record<string, string | string[] | undefined>, remoteAddress?: string): IncomingMessage {
  return { headers, socket: { remoteAddress } } as unknown as IncomingMessage;
}

describe("getClientIp", () => {
  it("prefers X-Forwarded-For, taking the first hop", () => {
    const req = mockReq({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("handles a single X-Forwarded-For value", () => {
    const req = mockReq({ "x-forwarded-for": "203.0.113.5" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("handles X-Forwarded-For arriving as an array", () => {
    const req = mockReq({ "x-forwarded-for": ["203.0.113.5", "198.51.100.9"] });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to the socket address when the header is absent", () => {
    const req = mockReq({}, "127.0.0.1");
    expect(getClientIp(req)).toBe("127.0.0.1");
  });

  it("falls back to \"unknown\" when nothing is available", () => {
    const req = mockReq({});
    expect(getClientIp(req)).toBe("unknown");
  });
});
