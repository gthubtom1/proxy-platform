import { describe, it, expect } from "vitest";
import { nextRateLimitedCooldownMs } from "./index.js";

const MIN = 60_000; // 1 min for readable assertions
const CAP = 8 * MIN; // 8x base -> caps the doubling at the 4th step

describe("nextRateLimitedCooldownMs (exponential 402 backoff)", () => {
  it("first throttle (no prior cooldown) uses the base", () => {
    expect(nextRateLimitedCooldownMs(MIN, 0, CAP)).toBe(MIN);
  });

  it("doubles on each consecutive throttle, capped", () => {
    expect(nextRateLimitedCooldownMs(MIN, MIN, CAP)).toBe(2 * MIN);
    expect(nextRateLimitedCooldownMs(MIN, 2 * MIN, CAP)).toBe(4 * MIN);
    expect(nextRateLimitedCooldownMs(MIN, 4 * MIN, CAP)).toBe(8 * MIN); // hits cap
    expect(nextRateLimitedCooldownMs(MIN, 8 * MIN, CAP)).toBe(8 * MIN); // stays at cap
  });

  it("never returns below the base even if prev is tiny", () => {
    expect(nextRateLimitedCooldownMs(MIN, 1000, CAP)).toBe(MIN);
  });

  it("cap is at least the base (defensive)", () => {
    expect(nextRateLimitedCooldownMs(5 * MIN, 5 * MIN, MIN)).toBe(5 * MIN);
  });
});
