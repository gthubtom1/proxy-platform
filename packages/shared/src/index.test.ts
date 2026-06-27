import { describe, it, expect } from "vitest";
import {
  resolveExtractGrade,
  isStaticExtractGrade,
  isRegionDrift,
  normalizeCountry,
  normalizeRegion,
  normalizeCity,
  isValidIpv4,
  parseUpstreamProxyLine,
  parseUpstreamProxyText,
  normalizeAppSettings,
  DEFAULT_APP_SETTINGS,
  APP_SETTING_BOUNDS,
  mapAdaptive,
  computeStabilityScore,
  isProviderThrottleStatus,
  PROVIDER_THROTTLE_RETRY_AFTER_SECONDS,
  createConcurrencyLimiter
} from "./index.js";

describe("normalizeCountry", () => {
  it("maps known aliases to the supported code", () => {
    expect(normalizeCountry("United States")).toBe("us");
    expect(normalizeCountry("USA")).toBe("us");
    expect(normalizeCountry("uk")).toBe("gb");
    expect(normalizeCountry("Great Britain")).toBe("gb");
    expect(normalizeCountry("France")).toBe("fr");
    expect(normalizeCountry("canada")).toBe("ca");
    expect(normalizeCountry("AU")).toBe("au");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(normalizeCountry("  United   States ")).toBe("us");
    expect(normalizeCountry("GB")).toBe("gb");
  });

  it("returns null for unsupported input", () => {
    expect(normalizeCountry("germany")).toBeNull();
    expect(normalizeCountry("")).toBeNull();
  });
});

describe("normalizeRegion / normalizeCity", () => {
  it("lowercases and strips spaces and punctuation", () => {
    expect(normalizeRegion("New South Wales")).toBe("newsouthwales");
    expect(normalizeCity("St. Helena (East)")).toBe("sthelenaeast");
  });

  it("returns null for empty-ish input", () => {
    expect(normalizeRegion(null)).toBeNull();
    expect(normalizeRegion(undefined)).toBeNull();
    expect(normalizeCity("   ")).toBeNull();
  });
});

describe("isValidIpv4", () => {
  it("accepts valid addresses", () => {
    expect(isValidIpv4("127.0.0.1")).toBe(true);
    expect(isValidIpv4("0.0.0.0")).toBe(true);
    expect(isValidIpv4("255.255.255.255")).toBe(true);
    expect(isValidIpv4(" 8.8.8.8 ")).toBe(true);
  });

  it("rejects out-of-range, malformed, and leading-zero values", () => {
    expect(isValidIpv4("256.0.0.1")).toBe(false);
    expect(isValidIpv4("1.2.3")).toBe(false);
    expect(isValidIpv4("1.2.3.4.5")).toBe(false);
    expect(isValidIpv4("01.2.3.4")).toBe(false);
    expect(isValidIpv4("a.b.c.d")).toBe(false);
    expect(isValidIpv4("")).toBe(false);
  });
});

describe("parseUpstreamProxyLine", () => {
  it("parses host:port:user:password (colon form)", () => {
    const result = parseUpstreamProxyLine("proxy.example.com:10080:user:pass", 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("colon");
      expect(result.value).toEqual({
        host: "proxy.example.com",
        port: 10080,
        username: "user",
        password: "pass"
      });
    }
  });

  it("keeps extra colons as part of the password in colon form", () => {
    const result = parseUpstreamProxyLine("h:10080:user:pa:ss:word", 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.password).toBe("pa:ss:word");
    }
  });

  it("parses http://user:pass@host:port (url form)", () => {
    const result = parseUpstreamProxyLine("http://user:pass@proxy.example.com:8080", 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("url");
      expect(result.value.host).toBe("proxy.example.com");
      expect(result.value.port).toBe(8080);
      expect(result.value.username).toBe("user");
      expect(result.value.password).toBe("pass");
    }
  });

  it("parses geolocation://user:pass@host:port:Country (geolocation form)", () => {
    const result = parseUpstreamProxyLine(
      "geolocation://user:pass@geo.example.com:10080:United States",
      3
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("geolocation");
      expect(result.value.host).toBe("geo.example.com");
      expect(result.value.port).toBe(10080);
    }
  });

  it("rejects an empty line and an incomplete colon form", () => {
    const empty = parseUpstreamProxyLine("   ", 1);
    expect(empty.ok).toBe(false);
    const incomplete = parseUpstreamProxyLine("host:10080:user", 1);
    expect(incomplete.ok).toBe(false);
  });
});

describe("parseUpstreamProxyText", () => {
  it("skips blank lines and reports per-line numbers", () => {
    const text = ["proxy.example.com:10080:user:pass", "", "   ", "bad-line"].join("\n");
    const results = parseUpstreamProxyText(text);
    // blank lines are filtered out, so only two entries remain
    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    // line numbers reflect the original position (1-based)
    expect(results[0].lineNumber).toBe(1);
    expect(results[1].lineNumber).toBe(4);
  });
});

describe("normalizeAppSettings", () => {
  it("clamps scan concurrency to a single-provider-safe ceiling and batch size high", () => {
    // Every upstream here is one provider account (FloppyData), so a huge
    // concurrency is self-inflicted throttle (HTTP 402), not speed: the
    // configurable ceiling is capped low (the adaptive controller ramps toward it
    // only while the provider stays clean). Batch size can still be large because
    // local geo removed the online rate-limit ceiling.
    expect(APP_SETTING_BOUNDS.scanConcurrency.max).toBe(50);
    expect(APP_SETTING_BOUNDS.scanBatchSize.max).toBeGreaterThanOrEqual(5000);

    const high = normalizeAppSettings({ scanConcurrency: 999_999, scanBatchSize: 999_999 });
    expect(high.scanConcurrency).toBe(APP_SETTING_BOUNDS.scanConcurrency.max);
    expect(high.scanBatchSize).toBe(APP_SETTING_BOUNDS.scanBatchSize.max);
  });

  it("defaults and clamps the dedicated provider-throttle (rate_limited) cooldown", () => {
    // A 402 means the provider is quota/concurrency limiting us; it gets a longer,
    // separate backoff than the generic cooldown so we stop re-burning its quota.
    const defaults = normalizeAppSettings({});
    expect(defaults.rateLimitedCooldownMs).toBe(5 * 60_000);
    const low = normalizeAppSettings({ rateLimitedCooldownMs: 1 });
    expect(low.rateLimitedCooldownMs).toBe(APP_SETTING_BOUNDS.rateLimitedCooldownMs.min);
    const high = normalizeAppSettings({ rateLimitedCooldownMs: 999_999_999 });
    expect(high.rateLimitedCooldownMs).toBe(APP_SETTING_BOUNDS.rateLimitedCooldownMs.max);
  });

  it("provides and clamps the locked (fast-lane) scan interval", () => {
    expect(DEFAULT_APP_SETTINGS.lockedScanIntervalMs).toBeGreaterThan(0);

    const tooLow = normalizeAppSettings({ lockedScanIntervalMs: 1 });
    expect(tooLow.lockedScanIntervalMs).toBe(APP_SETTING_BOUNDS.lockedScanIntervalMs.min);

    const inRange = normalizeAppSettings({ lockedScanIntervalMs: 120_000 });
    expect(inRange.lockedScanIntervalMs).toBe(120_000);
  });

  it("returns all defaults for an empty patch", () => {
    expect(normalizeAppSettings({})).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("provides geo-first grading knobs with sane defaults (3-day window, 99%/90%)", () => {
    expect(DEFAULT_APP_SETTINGS.stabilityWindowMs).toBe(3 * 24 * 60 * 60_000);
    expect(DEFAULT_APP_SETTINGS.geoPremiumSharePct).toBe(99);
    expect(DEFAULT_APP_SETTINGS.geoNormalSharePct).toBe(90);
    expect(DEFAULT_APP_SETTINGS.geoMinSamples).toBeGreaterThan(0);
  });

  it("clamps the geo-first grading knobs to their bounds", () => {
    const low = normalizeAppSettings({ geoPremiumSharePct: -5, geoNormalSharePct: -5, stabilityWindowMs: 1, geoMinSamples: 0 });
    expect(low.geoPremiumSharePct).toBe(APP_SETTING_BOUNDS.geoPremiumSharePct.min);
    expect(low.geoNormalSharePct).toBe(APP_SETTING_BOUNDS.geoNormalSharePct.min);
    expect(low.stabilityWindowMs).toBe(APP_SETTING_BOUNDS.stabilityWindowMs.min);
    expect(low.geoMinSamples).toBe(APP_SETTING_BOUNDS.geoMinSamples.min);

    const high = normalizeAppSettings({ geoPremiumSharePct: 999, geoNormalSharePct: 999, stabilityWindowMs: 9_999_999_999, geoMinSamples: 999_999 });
    expect(high.geoPremiumSharePct).toBe(APP_SETTING_BOUNDS.geoPremiumSharePct.max);
    expect(high.geoNormalSharePct).toBe(APP_SETTING_BOUNDS.geoNormalSharePct.max);
    expect(high.stabilityWindowMs).toBe(APP_SETTING_BOUNDS.stabilityWindowMs.max);
    expect(high.geoMinSamples).toBe(APP_SETTING_BOUNDS.geoMinSamples.max);
  });
});

describe("mapAdaptive", () => {
  const noSleep = async () => {};

  it("processes every item in order and never exceeds maxConcurrency", async () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    let inFlight = 0;
    let peak = 0;
    const result = await mapAdaptive(
      items,
      async (n) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        return n * 2;
      },
      () => false,
      { maxConcurrency: 6, sleep: noSleep }
    );
    expect(result).toEqual(items.map((n) => n * 2));
    expect(peak).toBeLessThanOrEqual(6);
  });

  it("backs off (sleeps) when chunks are throttled, and still finishes every item", async () => {
    const items = Array.from({ length: 40 }, (_, i) => i);
    let backoffs = 0;
    const result = await mapAdaptive(
      items,
      async (n) => ({ n, throttled: true }),
      (r) => r.throttled,
      {
        maxConcurrency: 8,
        backoffMs: 1234,
        sleep: async (ms) => {
          if (ms === 1234) backoffs += 1;
        }
      }
    );
    expect(result).toHaveLength(40);
    expect(result.map((r) => r.n)).toEqual(items);
    expect(backoffs).toBeGreaterThan(0);
  });

  it("never sleeps when nothing is throttled", async () => {
    let sleeps = 0;
    await mapAdaptive([1, 2, 3, 4], async (n) => n, () => false, {
      maxConcurrency: 2,
      sleep: async () => {
        sleeps += 1;
      }
    });
    expect(sleeps).toBe(0);
  });

  it("returns an empty array for no items", async () => {
    expect(await mapAdaptive([], async (n: number) => n, () => false, { maxConcurrency: 4, sleep: noSleep })).toEqual([]);
  });
});

describe("computeStabilityScore (geo-first)", () => {
  it("scores a state-locked upstream (>=99% dominant state) as static/premium", () => {
    const r = computeStabilityScore({ sampleCount: 50, dominantRegionShare: 1, successRate: 1 });
    expect(r.score).toBe(100);
    expect(r.tier).toBe("static");
  });

  it("keeps a mostly-same-state upstream (90-99%) as quasi/normal", () => {
    const r = computeStabilityScore({ sampleCount: 50, dominantRegionShare: 0.95, successRate: 1 });
    expect(r.tier).toBe("quasi");
    expect(r.score).toBe(95);
  });

  it("marks a cross-state upstream (<90% dominant) as dynamic", () => {
    const r = computeStabilityScore({ sampleCount: 50, dominantRegionShare: 0.6, successRate: 1 });
    expect(r.tier).toBe("dynamic");
  });

  it("ignores IP rotation speed: a fast-rotating but state-locked upstream is still static", () => {
    // Geo-first: a high sample count (= the IP rotated a lot) does NOT lower the
    // tier as long as it stayed in one state.
    const r = computeStabilityScore({ sampleCount: 300, dominantRegionShare: 1, successRate: 1 });
    expect(r.tier).toBe("static");
  });

  it("does not promote a low-sample upstream to static even at 100% (must earn it)", () => {
    const r = computeStabilityScore({ sampleCount: 2, dominantRegionShare: 1, successRate: 1 });
    expect(r.tier).not.toBe("static");
    expect(r.tier).toBe("quasi"); // share>=normal but not enough history yet
  });

  it("score increases with dominant-state share (geo-lock ordering)", () => {
    const low = computeStabilityScore({ sampleCount: 50, dominantRegionShare: 0.6 });
    const mid = computeStabilityScore({ sampleCount: 50, dominantRegionShare: 0.9 });
    const high = computeStabilityScore({ sampleCount: 50, dominantRegionShare: 1 });
    expect(high.score).toBeGreaterThan(mid.score);
    expect(mid.score).toBeGreaterThan(low.score);
  });

  it("handles missing/zero samples without producing NaN", () => {
    const r = computeStabilityScore({ sampleCount: 0, dominantRegionShare: 0 });
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.tier).toBe("dynamic");
  });

  it("availability gate: a state-locked but flaky upstream drops out of static", () => {
    const base = { sampleCount: 50, dominantRegionShare: 1 };
    expect(computeStabilityScore({ ...base, successRate: 1 }).tier).toBe("static");
    expect(computeStabilityScore({ ...base, successRate: 0.95 }).tier).toBe("static");
    expect(computeStabilityScore({ ...base, successRate: 0.85 }).tier).toBe("quasi"); // 0.7-0.9 -> quasi
    expect(computeStabilityScore({ ...base, successRate: 0.5 }).tier).toBe("dynamic"); // <0.7 -> dynamic
  });

  it("defaults successRate to 1 when omitted (no penalty without samples)", () => {
    const r = computeStabilityScore({ sampleCount: 50, dominantRegionShare: 1 });
    expect(r.tier).toBe("static");
  });

  it("honors custom share thresholds (e.g. relaxed 95% premium)", () => {
    const s = { sampleCount: 50, dominantRegionShare: 0.96, successRate: 1 };
    expect(computeStabilityScore(s).tier).toBe("quasi"); // default 99% premium -> quasi
    expect(computeStabilityScore(s, { premiumShare: 0.95 }).tier).toBe("static"); // relaxed -> static
  });

  it("honors a custom minSamples floor", () => {
    const s = { sampleCount: 3, dominantRegionShare: 1, successRate: 1 };
    expect(computeStabilityScore(s).tier).toBe("quasi"); // default minSamples=6 -> not enough
    expect(computeStabilityScore(s, { minSamples: 2 }).tier).toBe("static"); // lowered -> qualifies
  });
});

describe("resolveExtractGrade", () => {
  it("maps each grade to its pool + tier", () => {
    expect(resolveExtractGrade("resi_premium")).toEqual({ pool: "residential", tier: "static" });
    expect(resolveExtractGrade("resi_normal")).toEqual({ pool: "residential", tier: "quasi" });
    expect(resolveExtractGrade("resi_dynamic")).toEqual({ pool: "residential", tier: "dynamic" });
    expect(resolveExtractGrade("proxy_flagged")).toEqual({ pool: "proxy", tier: null });
    expect(resolveExtractGrade("dc_static")).toEqual({ pool: "hosting", tier: "static" });
    expect(resolveExtractGrade("dc_dynamic")).toEqual({ pool: "hosting", tier: "not_static" });
  });

  it("returns null for unknown/empty grade (caller falls back to legacy)", () => {
    expect(resolveExtractGrade("")).toBeNull();
    expect(resolveExtractGrade(null)).toBeNull();
    expect(resolveExtractGrade(undefined)).toBeNull();
    expect(resolveExtractGrade("nope")).toBeNull();
  });
});

describe("isStaticExtractGrade", () => {
  it("true only for premium/normal residential + static datacenter", () => {
    expect(isStaticExtractGrade("resi_premium")).toBe(true);
    expect(isStaticExtractGrade("resi_normal")).toBe(true);
    expect(isStaticExtractGrade("dc_static")).toBe(true);
  });

  it("false for dynamic / proxy-flagged / unknown grades", () => {
    expect(isStaticExtractGrade("resi_dynamic")).toBe(false);
    expect(isStaticExtractGrade("proxy_flagged")).toBe(false);
    expect(isStaticExtractGrade("dc_dynamic")).toBe(false);
    expect(isStaticExtractGrade(null)).toBe(false);
    expect(isStaticExtractGrade("nope")).toBe(false);
  });
});

describe("isRegionDrift", () => {
  it("no drift when detected matches expected (case/space-insensitive)", () => {
    expect(isRegionDrift("California", "california")).toBe(false);
    expect(isRegionDrift("  Texas ", "texas")).toBe(false);
  });

  it("drift when detected region differs from expected", () => {
    expect(isRegionDrift("Nevada", "California")).toBe(true);
  });

  it("no expectation => never drift", () => {
    expect(isRegionDrift("California", null)).toBe(false);
    expect(isRegionDrift(null, undefined)).toBe(false);
  });

  it("expected but no detected region => drift (cannot confirm)", () => {
    expect(isRegionDrift(null, "California")).toBe(true);
  });
});

describe("isProviderThrottleStatus", () => {
  it("flags provider billing/throttle statuses (402, 429)", () => {
    expect(isProviderThrottleStatus(402)).toBe(true);
    expect(isProviderThrottleStatus(429)).toBe(true);
  });

  it("does not flag success or other upstream statuses", () => {
    for (const code of [0, 200, 204, 301, 403, 404, 407, 500, 502, 503]) {
      expect(isProviderThrottleStatus(code)).toBe(false);
    }
  });
});

describe("PROVIDER_THROTTLE_RETRY_AFTER_SECONDS", () => {
  it("is a short positive backoff", () => {
    expect(PROVIDER_THROTTLE_RETRY_AFTER_SECONDS).toBeGreaterThan(0);
    expect(PROVIDER_THROTTLE_RETRY_AFTER_SECONDS).toBeLessThanOrEqual(120);
  });
});

describe("createConcurrencyLimiter", () => {
  it("never runs more than the configured number of tasks at once", async () => {
    const limit = createConcurrencyLimiter(3);
    let active = 0;
    let peak = 0;
    const make = () =>
      limit(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 10));
        active -= 1;
        return peak;
      });
    await Promise.all(Array.from({ length: 12 }, make));
    expect(peak).toBe(3);
  });

  it("returns each task's resolved value and propagates rejections", async () => {
    const limit = createConcurrencyLimiter(2);
    await expect(limit(async () => 42)).resolves.toBe(42);
    await expect(
      limit(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
  });

  it("keeps draining the queue after a task rejects", async () => {
    const limit = createConcurrencyLimiter(1);
    const order: number[] = [];
    await Promise.allSettled([
      limit(async () => {
        throw new Error("x");
      }),
      limit(async () => {
        order.push(1);
        return 1;
      }),
      limit(async () => {
        order.push(2);
        return 2;
      })
    ]);
    expect(order).toEqual([1, 2]);
  });

  it("treats a non-positive limit as 1 (serialized)", async () => {
    const limit = createConcurrencyLimiter(0);
    let active = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 4 }, () =>
        limit(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((r) => setTimeout(r, 5));
          active -= 1;
        })
      )
    );
    expect(peak).toBe(1);
  });
});
