import { describe, it, expect } from "vitest";
import {
  buildAvailableFreeUpstreamWhere,
  entryPromisesRegion,
  normalizeIpTypeChoice,
  upstreamMatchesEntryTarget
} from "./index.js";

// Pure-logic tests for the "extract by line type" pool filter.
describe("normalizeIpTypeChoice", () => {
  it("maps datacenter aliases to hosting", () => {
    expect(normalizeIpTypeChoice("hosting")).toBe("hosting");
    expect(normalizeIpTypeChoice("datacenter")).toBe("hosting");
    expect(normalizeIpTypeChoice("DC")).toBe("hosting");
  });

  it("defaults everything else to residential", () => {
    expect(normalizeIpTypeChoice("residential")).toBe("residential");
    expect(normalizeIpTypeChoice("")).toBe("residential");
    expect(normalizeIpTypeChoice(null)).toBe("residential");
    expect(normalizeIpTypeChoice(undefined)).toBe("residential");
    expect(normalizeIpTypeChoice("anything")).toBe("residential");
  });
});

describe("buildAvailableFreeUpstreamWhere ipType pool", () => {
  it("excludes datacenter by default (residential pool)", () => {
    expect(buildAvailableFreeUpstreamWhere({ country: "us" }).ipType).toEqual({ not: "hosting" });
    expect(buildAvailableFreeUpstreamWhere({ country: "us", ipType: "residential" }).ipType).toEqual({
      not: "hosting"
    });
  });

  it("selects only datacenter when ipType is hosting", () => {
    expect(buildAvailableFreeUpstreamWhere({ country: "us", ipType: "hosting" }).ipType).toBe("hosting");
  });
});

// The six user-facing extraction grades must map to mutually exclusive pools so
// picking one never overlaps another's upstreams.
describe("buildAvailableFreeUpstreamWhere extraction grades (mutually exclusive)", () => {
  it("resi_premium = clean residential (no datacenter, no proxy) + static", () => {
    const w = buildAvailableFreeUpstreamWhere({ country: "us", grade: "resi_premium" });
    expect(w.ipType).toEqual({ notIn: ["hosting", "proxy"] });
    expect(w.stabilityTier).toBe("static");
  });

  it("resi_normal = clean residential + quasi", () => {
    const w = buildAvailableFreeUpstreamWhere({ country: "us", grade: "resi_normal" });
    expect(w.ipType).toEqual({ notIn: ["hosting", "proxy"] });
    expect(w.stabilityTier).toBe("quasi");
  });

  it("resi_dynamic = clean residential + dynamic", () => {
    const w = buildAvailableFreeUpstreamWhere({ country: "us", grade: "resi_dynamic" });
    expect(w.ipType).toEqual({ notIn: ["hosting", "proxy"] });
    expect(w.stabilityTier).toBe("dynamic");
  });

  it("proxy_flagged = ip_type proxy, no tier filter (static-first via orderBy)", () => {
    const w = buildAvailableFreeUpstreamWhere({ country: "us", grade: "proxy_flagged" });
    expect(w.ipType).toBe("proxy");
    expect(w.stabilityTier).toBeUndefined();
  });

  it("dc_static = hosting + static", () => {
    const w = buildAvailableFreeUpstreamWhere({ country: "us", grade: "dc_static" });
    expect(w.ipType).toBe("hosting");
    expect(w.stabilityTier).toBe("static");
  });

  it("dc_dynamic = hosting + non-static (quasi or dynamic)", () => {
    const w = buildAvailableFreeUpstreamWhere({ country: "us", grade: "dc_dynamic" });
    expect(w.ipType).toBe("hosting");
    expect(w.stabilityTier).toEqual({ not: "static" });
  });

  it("grade takes precedence over legacy ipType/stabilityTier", () => {
    const w = buildAvailableFreeUpstreamWhere({
      country: "us",
      ipType: "hosting",
      stabilityTier: "static",
      grade: "resi_premium"
    });
    expect(w.ipType).toEqual({ notIn: ["hosting", "proxy"] });
    expect(w.stabilityTier).toBe("static");
  });

  it("falls back to legacy filters when grade is absent or unknown (back-compat)", () => {
    const legacyStatic = buildAvailableFreeUpstreamWhere({ country: "us", stabilityTier: "static" });
    expect(legacyStatic.ipType).toEqual({ notIn: ["hosting", "proxy"] });
    expect(legacyStatic.stabilityTier).toBe("static");

    const unknownGrade = buildAvailableFreeUpstreamWhere({ country: "us", grade: "nope" });
    expect(unknownGrade.ipType).toEqual({ not: "hosting" });
    expect(unknownGrade.stabilityTier).toBeUndefined();
  });
});

// REQ-114: the survey guarantee is COUNTRY + STATE. City is a best-effort
// preference at bind time (with a city->state fallback), not an ongoing match
// requirement — otherwise same-state rebinds would churn as "mismatch".
describe("upstreamMatchesEntryTarget (country + state, city best-effort)", () => {
  it("matches the same country+state even when the city differs", () => {
    expect(
      upstreamMatchesEntryTarget(
        { targetCountry: "us", targetRegion: "florida", targetCity: "orlando" },
        { country: "us", region: "florida", city: "tampa" }
      )
    ).toBe(true);
  });

  it("does not match a different state", () => {
    expect(
      upstreamMatchesEntryTarget(
        { targetCountry: "us", targetRegion: "florida", targetCity: "orlando" },
        { country: "us", region: "georgia", city: "atlanta" }
      )
    ).toBe(false);
  });

  it("does not match a different country", () => {
    expect(
      upstreamMatchesEntryTarget(
        { targetCountry: "us", targetRegion: null, targetCity: null },
        { country: "gb", region: "england", city: "london" }
      )
    ).toBe(false);
  });

  it("matches any region in the country when no region is pinned", () => {
    expect(
      upstreamMatchesEntryTarget(
        { targetCountry: "us", targetRegion: null, targetCity: null },
        { country: "us", region: "texas", city: "dallas" }
      )
    ).toBe(true);
  });
});

// Only static-class products promised a fixed state, so only they enforce region
// drift on scan (the rest let residential IPs roam states without churning a
// rebind every cycle). Country is always enforced separately by the caller.
describe("entryPromisesRegion (grade-aware state enforcement)", () => {
  it("enforces region for static-class grades", () => {
    expect(entryPromisesRegion({ targetGrade: "resi_premium", targetStabilityTier: null })).toBe(true);
    expect(entryPromisesRegion({ targetGrade: "resi_normal", targetStabilityTier: null })).toBe(true);
    expect(entryPromisesRegion({ targetGrade: "dc_static", targetStabilityTier: null })).toBe(true);
  });

  it("does not enforce region for dynamic / roaming grades", () => {
    expect(entryPromisesRegion({ targetGrade: "resi_dynamic", targetStabilityTier: null })).toBe(false);
    expect(entryPromisesRegion({ targetGrade: "proxy_flagged", targetStabilityTier: null })).toBe(false);
    expect(entryPromisesRegion({ targetGrade: "dc_dynamic", targetStabilityTier: null })).toBe(false);
  });

  it("still enforces region for legacy entries that chose the static stability tier", () => {
    expect(entryPromisesRegion({ targetGrade: null, targetStabilityTier: "static" })).toBe(true);
  });

  it("does not enforce region for legacy non-static entries (no grade, no static tier)", () => {
    expect(entryPromisesRegion({ targetGrade: null, targetStabilityTier: null })).toBe(false);
    expect(entryPromisesRegion({ targetGrade: null, targetStabilityTier: "dynamic" })).toBe(false);
  });
});
