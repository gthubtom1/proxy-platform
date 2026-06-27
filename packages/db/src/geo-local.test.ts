import { describe, it, expect } from "vitest";
import { classifyHostingFromAsn, lookupLocalGeo } from "./geo-local.js";

// Pure-logic tests: classifyHostingFromAsn never touches the filesystem, and
// lookupLocalGeo must return null until a database is loaded (the worker/api
// callers rely on that to fall back to the online geo providers).
describe("classifyHostingFromAsn", () => {
  it("flags known datacenter/cloud ASNs as hosting", () => {
    expect(classifyHostingFromAsn(16509, "Amazon.com, Inc.")).toBe("hosting");
    expect(classifyHostingFromAsn(15169, null)).toBe("hosting");
  });

  it("flags hosting-like organization names as hosting", () => {
    expect(classifyHostingFromAsn(99999, "Contabo GmbH Hosting")).toBe("hosting");
    expect(classifyHostingFromAsn(null, "Some Cloud Datacenter LLC")).toBe("hosting");
  });

  it("returns unknown for residential ISPs (fail-open, never guesses residential)", () => {
    expect(classifyHostingFromAsn(7922, "Comcast Cable Communications")).toBe("unknown");
    expect(classifyHostingFromAsn(null, null)).toBe("unknown");
    expect(classifyHostingFromAsn(undefined, undefined)).toBe("unknown");
  });
});

describe("lookupLocalGeo", () => {
  it("returns null before any database is initialized", () => {
    expect(lookupLocalGeo("8.8.8.8")).toBeNull();
  });
});
