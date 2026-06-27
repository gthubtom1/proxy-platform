// In-memory sliding-window rate limiter. Keeps deployments free of an extra
// dependency (Redis etc.) while bounding abusive request rates. State is
// per-process, which is enough for the single-instance local/VPS deployment this
// project targets. Lives in @proxy-platform/shared so both the API (login
// throttle) and the gateway (proxy-auth brute-force throttle) reuse one tested
// implementation, and so it can be unit-tested with an injectable clock.

export type SlidingWindowRateLimiterOptions = {
  /** Max attempts allowed within the window before requests are throttled. */
  maxAttempts: number;
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** Clock source, injectable for tests. Defaults to Date.now. */
  now?: () => number;
  /**
   * Number of distinct keys after which an opportunistic sweep prunes expired
   * timestamps so the map does not grow unbounded over time.
   */
  cleanupThreshold?: number;
};

export class SlidingWindowRateLimiter {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly cleanupThreshold: number;
  private readonly attempts = new Map<string, number[]>();

  constructor(options: SlidingWindowRateLimiterOptions) {
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
    this.cleanupThreshold = options.cleanupThreshold ?? 5_000;
  }

  private liveAttempts(key: string, windowStart: number): number[] {
    return (this.attempts.get(key) ?? []).filter((ts) => ts > windowStart);
  }

  /**
   * Read-only check: returns the number of seconds the caller must wait if the
   * key is currently over the limit, or 0 if a further attempt would be allowed.
   * Does NOT record anything. Use this to reject before doing expensive work
   * (DB lookup, password hashing), then call record() only on a real failure.
   */
  peek(key: string): number {
    const now = this.now();
    const windowStart = now - this.windowMs;
    const recent = this.liveAttempts(key, windowStart);
    // Prune the (now filtered) list back so an expired key does not linger.
    if (recent.length === 0) this.attempts.delete(key);
    else this.attempts.set(key, recent);

    if (recent.length >= this.maxAttempts) {
      return Math.max(1, Math.ceil((recent[0]! + this.windowMs - now) / 1000));
    }
    return 0;
  }

  /**
   * Record one attempt against the key (e.g. one failed authentication). Runs the
   * opportunistic cleanup sweep when the map grows past the threshold.
   */
  record(key: string): void {
    const now = this.now();
    const windowStart = now - this.windowMs;
    const recent = this.liveAttempts(key, windowStart);
    recent.push(now);
    this.attempts.set(key, recent);

    if (this.attempts.size > this.cleanupThreshold) {
      for (const [mapKey, timestamps] of this.attempts) {
        const live = timestamps.filter((ts) => ts > windowStart);
        if (live.length === 0) this.attempts.delete(mapKey);
        else this.attempts.set(mapKey, live);
      }
    }
  }

  /**
   * Combined check-and-record used by the "N requests per window" model (every
   * call counts toward the window): returns seconds to wait, or 0 if allowed and
   * the attempt has been recorded.
   */
  retryAfter(key: string): number {
    const blockedFor = this.peek(key);
    if (blockedFor > 0) {
      return blockedFor;
    }
    this.record(key);
    return 0;
  }

  /** Number of keys currently tracked. Exposed for tests/observability. */
  size(): number {
    return this.attempts.size;
  }
}
