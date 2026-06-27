import { describe, it, expect } from "vitest";
import { resolveGeoForExitIp } from "./index.js";
import type { LocalGeoResult } from "./geo-local.js";

// Pure-logic tests for the local-first geo resolver. They inject the local and
// online lookups (the resolver's two dependency seams) so the routing — local
// hit vs online fallback vs offline-only — is verified without touching the
// MaxMind files, the network, or the database.
describe("resolveGeoForExitIp", () => {
  const supportedLocal: LocalGeoResult = {
    country: "us",
    region: "California",
    city: "Los Angeles",
    isp: "Comcast Cable",
    asn: "AS7922",
    ipType: "unknown"
  };

  it("uses the local database for a supported country without going online", async () => {
    let onlineCalls = 0;
    const result = await resolveGeoForExitIp("203.0.113.10", {
      localLookup: () => supportedLocal,
      onlineLookup: async () => {
        onlineCalls += 1;
        return { ok: false, errorType: "ip_lookup_failed", message: "should not be called" };
      }
    });

    expect(onlineCalls).toBe(0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.provider).toBe("local-mmdb");
    expect(result.value.country).toBe("us");
    // region/city are normalized by the resolver (lowercased, spaces stripped).
    expect(result.value.region).toBe("california");
    expect(result.value.city).toBe("losangeles");
    expect(result.value.ipType).toBe("unknown");
    expect(result.value.asn).toBe("AS7922");
  });

  it("re-checks a local 'unsupported country' online and uses the online supported result", async () => {
    // Real case: local MaxMind registers the IP in Seychelles ("sc") because the
    // datacenter ASN is offshore, but the IP actually routes through London, so
    // the online providers resolve it to GB. The resolver must trust the online
    // verdict instead of wrongly rejecting a supported-country IP.
    let onlineCalls = 0;
    const result = await resolveGeoForExitIp("203.0.113.11", {
      localLookup: () => ({ ...supportedLocal, country: "sc", city: "London" }),
      onlineLookup: async () => {
        onlineCalls += 1;
        return {
          ok: true,
          value: { country: "gb", region: null, city: "london", isp: "x", asn: "AS1", provider: "ip-api.com", ipType: "proxy" }
        };
      }
    });

    expect(onlineCalls).toBe(1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.country).toBe("gb");
    expect(result.value.provider).toBe("ip-api.com");
  });

  it("still reports unsupported when BOTH local and online say a non-supported country", async () => {
    let onlineCalls = 0;
    const result = await resolveGeoForExitIp("203.0.113.14", {
      localLookup: () => ({ ...supportedLocal, country: "de" }),
      onlineLookup: async () => {
        onlineCalls += 1;
        return { ok: false, errorType: "unsupported_country", message: "Unsupported country: de", country: "de" };
      }
    });

    expect(onlineCalls).toBe(1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorType).toBe("unsupported_country");
  });

  it("uses the local 'unsupported country' verdict without going online when allowOnline is false", async () => {
    let onlineCalls = 0;
    const result = await resolveGeoForExitIp("203.0.113.11", {
      allowOnline: false,
      localLookup: () => ({ ...supportedLocal, country: "xy" }),
      onlineLookup: async () => {
        onlineCalls += 1;
        return { ok: true, value: { country: "us", region: null, city: null, isp: null, asn: null, provider: "x", ipType: "unknown" } };
      }
    });

    expect(onlineCalls).toBe(0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorType).toBe("unsupported_country");
    expect(result.country).toBe("xy");
  });

  it("falls back to the online providers when the IP is not in the local database", async () => {
    let onlineCalls = 0;
    const result = await resolveGeoForExitIp("203.0.113.12", {
      localLookup: () => null,
      onlineLookup: async () => {
        onlineCalls += 1;
        return {
          ok: true,
          value: {
            country: "gb",
            region: null,
            city: null,
            isp: "BT",
            asn: "AS2856",
            provider: "ip-api.com",
            ipType: "residential"
          }
        };
      }
    });

    expect(onlineCalls).toBe(1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.provider).toBe("ip-api.com");
    // The online providers keep their richer ipType (residential), unlike local.
    expect(result.value.ipType).toBe("residential");
  });

  it("does not go online on a local miss when allowOnline is false", async () => {
    let onlineCalls = 0;
    const result = await resolveGeoForExitIp("203.0.113.13", {
      allowOnline: false,
      localLookup: () => null,
      onlineLookup: async () => {
        onlineCalls += 1;
        return { ok: true, value: { country: "us", region: null, city: null, isp: null, asn: null, provider: "x", ipType: "unknown" } };
      }
    });

    expect(onlineCalls).toBe(0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorType).toBe("ip_lookup_failed");
  });
});
