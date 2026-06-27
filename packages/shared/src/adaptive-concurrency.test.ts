import { describe, it, expect } from "vitest";
import { AdaptiveConcurrencyController, shouldBackoffOnThrottle } from "./index.js";

describe("shouldBackoffOnThrottle (ratio-based cross-batch signal)", () => {
  it("does NOT back off on a single 402 in a large sweep (the old bug)", () => {
    // 1 throttled out of 900 = 0.1% — must not persistently halve the budget.
    expect(shouldBackoffOnThrottle(1, 900, 0.3)).toBe(false);
  });

  it("does NOT back off on the steady retry tail (~19%) below threshold", () => {
    expect(shouldBackoffOnThrottle(190, 1000, 0.3)).toBe(false);
  });

  it("backs off only when the throttled fraction crosses the threshold", () => {
    expect(shouldBackoffOnThrottle(300, 1000, 0.3)).toBe(true); // 30% == threshold
    expect(shouldBackoffOnThrottle(500, 1000, 0.3)).toBe(true); // severe overload
  });

  it("never backs off on an empty sweep", () => {
    expect(shouldBackoffOnThrottle(0, 0, 0.3)).toBe(false);
  });
});

describe("AdaptiveConcurrencyController", () => {
  it("starts low (at min by default), not at the configured max", () => {
    const c = new AdaptiveConcurrencyController({ min: 3, max: 50 });
    expect(c.current()).toBe(3);
  });

  it("honors an explicit start, clamped into [min, max]", () => {
    expect(new AdaptiveConcurrencyController({ min: 3, max: 50, start: 10 }).current()).toBe(10);
    expect(new AdaptiveConcurrencyController({ min: 3, max: 50, start: 999 }).current()).toBe(50);
    expect(new AdaptiveConcurrencyController({ min: 3, max: 50, start: 1 }).current()).toBe(3);
  });

  it("ramps up additively on clean batches and never exceeds max", () => {
    const c = new AdaptiveConcurrencyController({ min: 1, max: 5, start: 1, increaseStep: 1 });
    expect(c.record(false)).toBe(2);
    expect(c.record(false)).toBe(3);
    expect(c.record(false)).toBe(4);
    expect(c.record(false)).toBe(5);
    expect(c.record(false)).toBe(5); // capped at max
  });

  it("backs off multiplicatively on a throttled batch and never drops below min", () => {
    const c = new AdaptiveConcurrencyController({ min: 3, max: 50, start: 40, decreaseFactor: 0.5 });
    expect(c.record(true)).toBe(20);
    expect(c.record(true)).toBe(10);
    expect(c.record(true)).toBe(5);
    expect(c.record(true)).toBe(3); // floor(5*0.5)=2 -> clamped to min 3
    expect(c.record(true)).toBe(3);
  });

  it("recovers slowly after a throttle (AIMD: additive up, multiplicative down)", () => {
    const c = new AdaptiveConcurrencyController({ min: 2, max: 50, start: 32, increaseStep: 1, decreaseFactor: 0.5 });
    expect(c.record(true)).toBe(16); // 402 burst -> halve
    expect(c.record(false)).toBe(17); // clean -> +1
    expect(c.record(false)).toBe(18);
    expect(c.record(true)).toBe(9); // another 402 -> halve again
  });

  it("re-clamps the learned level when bounds tighten", () => {
    const c = new AdaptiveConcurrencyController({ min: 3, max: 50, start: 40 });
    c.setBounds(3, 10); // admin lowers the ceiling to 10
    expect(c.current()).toBe(10);
    c.setBounds(20, 50); // admin raises the floor to 20
    expect(c.current()).toBe(20);
  });
});
