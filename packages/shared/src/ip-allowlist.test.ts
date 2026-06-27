import { describe, it, expect } from "vitest";
import { isIpInAllowlist, normalizeSourceIpEntry } from "./ip-allowlist.js";

describe("isIpInAllowlist - empty list", () => {
  it("allows any IP when the allowlist is empty (no restriction)", () => {
    expect(isIpInAllowlist("203.0.113.5", [])).toBe(true);
    expect(isIpInAllowlist("2001:db8::1", [])).toBe(true);
  });
});

describe("isIpInAllowlist - single IPv4", () => {
  it("matches an exact IPv4 and rejects others", () => {
    expect(isIpInAllowlist("203.0.113.5", ["203.0.113.5"])).toBe(true);
    expect(isIpInAllowlist("203.0.113.6", ["203.0.113.5"])).toBe(false);
  });

  it("matches when the client is in any of several entries", () => {
    const list = ["10.0.0.1", "203.0.113.5", "198.51.100.7"];
    expect(isIpInAllowlist("198.51.100.7", list)).toBe(true);
    expect(isIpInAllowlist("8.8.8.8", list)).toBe(false);
  });
});

describe("isIpInAllowlist - IPv4 CIDR", () => {
  it("matches addresses inside the range and rejects outside", () => {
    expect(isIpInAllowlist("203.0.113.42", ["203.0.113.0/24"])).toBe(true);
    expect(isIpInAllowlist("203.0.113.255", ["203.0.113.0/24"])).toBe(true);
    expect(isIpInAllowlist("203.0.114.1", ["203.0.113.0/24"])).toBe(false);
  });

  it("handles a /32 (single host) and /0 (everything)", () => {
    expect(isIpInAllowlist("203.0.113.5", ["203.0.113.5/32"])).toBe(true);
    expect(isIpInAllowlist("203.0.113.6", ["203.0.113.5/32"])).toBe(false);
    expect(isIpInAllowlist("8.8.8.8", ["0.0.0.0/0"])).toBe(true);
  });

  it("handles a wider /16 range", () => {
    expect(isIpInAllowlist("10.5.99.1", ["10.5.0.0/16"])).toBe(true);
    expect(isIpInAllowlist("10.6.0.1", ["10.5.0.0/16"])).toBe(false);
  });
});

describe("isIpInAllowlist - IPv6", () => {
  it("matches an exact IPv6 (including compressed forms)", () => {
    expect(isIpInAllowlist("2001:db8::1", ["2001:db8::1"])).toBe(true);
    expect(isIpInAllowlist("2001:0db8:0000:0000:0000:0000:0000:0001", ["2001:db8::1"])).toBe(true);
    expect(isIpInAllowlist("2001:db8::2", ["2001:db8::1"])).toBe(false);
  });

  it("matches an IPv6 CIDR range", () => {
    expect(isIpInAllowlist("2001:db8:0:0:0:0:0:abcd", ["2001:db8::/32"])).toBe(true);
    expect(isIpInAllowlist("2001:db9::1", ["2001:db8::/32"])).toBe(false);
  });

  it("matches ::1 loopback exactly", () => {
    expect(isIpInAllowlist("::1", ["::1"])).toBe(true);
    expect(isIpInAllowlist("::2", ["::1"])).toBe(false);
  });
});

describe("isIpInAllowlist - IPv4-mapped IPv6", () => {
  it("matches a ::ffff:a.b.c.d client against a plain IPv4 entry", () => {
    // A client connecting over IPv4 to a dual-stack listener appears mapped.
    expect(isIpInAllowlist("::ffff:203.0.113.5", ["203.0.113.5"])).toBe(true);
    expect(isIpInAllowlist("::ffff:203.0.113.5", ["203.0.113.0/24"])).toBe(true);
    expect(isIpInAllowlist("::ffff:203.0.114.1", ["203.0.113.0/24"])).toBe(false);
  });
});

describe("isIpInAllowlist - fail closed / robustness", () => {
  it("rejects an unparseable client IP against a non-empty list", () => {
    expect(isIpInAllowlist("not-an-ip", ["203.0.113.5"])).toBe(false);
  });

  it("skips unparseable allowlist entries but still honors valid ones", () => {
    expect(isIpInAllowlist("203.0.113.5", ["garbage", "203.0.113.5"])).toBe(true);
    expect(isIpInAllowlist("203.0.113.5", ["garbage"])).toBe(false);
  });

  it("strips an IPv6 zone id before matching", () => {
    expect(isIpInAllowlist("fe80::1%eth0", ["fe80::1"])).toBe(true);
  });

  it("does not match an IPv4 client against an IPv6 entry and vice versa", () => {
    expect(isIpInAllowlist("203.0.113.5", ["2001:db8::/32"])).toBe(false);
    expect(isIpInAllowlist("2001:db8::1", ["203.0.113.0/24"])).toBe(false);
  });
});

describe("normalizeSourceIpEntry", () => {
  it("accepts valid single IPs and CIDRs, returning the trimmed entry", () => {
    expect(normalizeSourceIpEntry("  203.0.113.5 ")).toBe("203.0.113.5");
    expect(normalizeSourceIpEntry("203.0.113.0/24")).toBe("203.0.113.0/24");
    expect(normalizeSourceIpEntry("2001:db8::/32")).toBe("2001:db8::/32");
    expect(normalizeSourceIpEntry("::1")).toBe("::1");
  });

  it("rejects malformed entries", () => {
    expect(normalizeSourceIpEntry("203.0.113.5/33")).toBeNull();
    expect(normalizeSourceIpEntry("999.0.0.1")).toBeNull();
    expect(normalizeSourceIpEntry("203.0.113.0/abc")).toBeNull();
    expect(normalizeSourceIpEntry("not-an-ip")).toBeNull();
    expect(normalizeSourceIpEntry("")).toBeNull();
    expect(normalizeSourceIpEntry("2001:db8::/129")).toBeNull();
  });
});
