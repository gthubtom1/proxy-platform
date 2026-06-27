import { describe, it, expect } from "vitest";
import { SlidingWindowRateLimiter } from "./rate-limit.js";

// A controllable clock so the sliding window is deterministic (no real timers).
function fakeClock(start = 1_000_000) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    }
  };
}

describe("SlidingWindowRateLimiter.retryAfter (check + record)", () => {
  it("allows up to maxAttempts within the window, then throttles", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({ maxAttempts: 3, windowMs: 60_000, now: clock.now });

    expect(limiter.retryAfter("ip-a")).toBe(0);
    expect(limiter.retryAfter("ip-a")).toBe(0);
    expect(limiter.retryAfter("ip-a")).toBe(0);
    expect(limiter.retryAfter("ip-a")).toBeGreaterThan(0);
  });

  it("reports a retry-after that counts down and never drops below 1s", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({ maxAttempts: 2, windowMs: 60_000, now: clock.now });

    limiter.retryAfter("ip");
    limiter.retryAfter("ip");
    expect(limiter.retryAfter("ip")).toBe(60);

    clock.advance(59_200);
    expect(limiter.retryAfter("ip")).toBe(1);
  });

  it("releases the caller once the oldest attempt slides out of the window", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({ maxAttempts: 2, windowMs: 60_000, now: clock.now });

    limiter.retryAfter("ip");
    limiter.retryAfter("ip");
    expect(limiter.retryAfter("ip")).toBeGreaterThan(0);

    clock.advance(60_001);
    expect(limiter.retryAfter("ip")).toBe(0);
  });

  it("treats the window as a true sliding window, not a fixed bucket", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({ maxAttempts: 2, windowMs: 10_000, now: clock.now });

    limiter.retryAfter("ip"); // t=0
    clock.advance(6_000);
    limiter.retryAfter("ip"); // t=6000 -> at limit
    expect(limiter.retryAfter("ip")).toBeGreaterThan(0);

    clock.advance(4_001); // t=10001, first attempt expired
    expect(limiter.retryAfter("ip")).toBe(0);
  });

  it("keeps separate counters per key (per-IP / per-role isolation)", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({ maxAttempts: 1, windowMs: 60_000, now: clock.now });

    expect(limiter.retryAfter("admin:1.1.1.1")).toBe(0);
    expect(limiter.retryAfter("admin:1.1.1.1")).toBeGreaterThan(0);
    expect(limiter.retryAfter("admin:2.2.2.2")).toBe(0);
    expect(limiter.retryAfter("user:1.1.1.1")).toBe(0);
  });

  it("prunes expired keys once the cleanup threshold is exceeded", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({
      maxAttempts: 5,
      windowMs: 1_000,
      now: clock.now,
      cleanupThreshold: 3
    });

    limiter.retryAfter("k1");
    limiter.retryAfter("k2");
    limiter.retryAfter("k3");
    limiter.retryAfter("k4");
    expect(limiter.size()).toBe(4);

    clock.advance(2_000);
    limiter.retryAfter("k5");
    expect(limiter.size()).toBe(1);
  });
});

describe("SlidingWindowRateLimiter.peek / record (failure-only model)", () => {
  it("peek never records, so repeated peeks alone never throttle", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({ maxAttempts: 2, windowMs: 60_000, now: clock.now });

    for (let i = 0; i < 10; i++) {
      expect(limiter.peek("ip")).toBe(0);
    }
    expect(limiter.size()).toBe(0);
  });

  it("blocks only after enough recorded failures, and peek reflects the block", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({ maxAttempts: 3, windowMs: 60_000, now: clock.now });

    // Simulate the gateway flow: peek (allowed) then record one failed auth.
    expect(limiter.peek("ip")).toBe(0);
    limiter.record("ip");
    expect(limiter.peek("ip")).toBe(0);
    limiter.record("ip");
    expect(limiter.peek("ip")).toBe(0);
    limiter.record("ip"); // 3rd failure reaches the limit

    // Now further attempts are blocked, reported by the read-only peek.
    expect(limiter.peek("ip")).toBeGreaterThan(0);
  });

  it("recorded failures expire from the window, unblocking the key", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({ maxAttempts: 2, windowMs: 60_000, now: clock.now });

    limiter.record("ip");
    limiter.record("ip");
    expect(limiter.peek("ip")).toBeGreaterThan(0);

    clock.advance(60_001);
    expect(limiter.peek("ip")).toBe(0);
  });

  it("records per key so one abusive IP does not throttle another", () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter({ maxAttempts: 1, windowMs: 60_000, now: clock.now });

    limiter.record("1.1.1.1");
    expect(limiter.peek("1.1.1.1")).toBeGreaterThan(0);
    expect(limiter.peek("2.2.2.2")).toBe(0);
  });
});
