import { describe, it, expect } from "vitest";
import { classifyScanError } from "./index.js";

// Pure-logic test: classifyScanError maps a thrown error's message to a stable
// ScanErrorType. It is exported so the worker can reuse it instead of keeping its
// own duplicate copy. Order matters — "reset"/"aborted" is checked before the
// generic "connect"/"refused" bucket.
describe("classifyScanError", () => {
  it("maps timeouts", () => {
    expect(classifyScanError(new Error("Scanner timeout"))).toBe("timeout");
  });

  it("maps proxy auth failures (407 / authentication)", () => {
    expect(classifyScanError(new Error("Upstream proxy authentication failed"))).toBe("auth_failed");
    expect(classifyScanError(new Error("407 Proxy Authentication Required"))).toBe("auth_failed");
  });

  it("maps provider throttle/quota (402/429/503) to rate_limited", () => {
    expect(classifyScanError(new Error("HTTP/1.1 402 Payment Required"))).toBe("rate_limited");
    expect(classifyScanError(new Error("HTTP/1.1 429 Too Many Requests"))).toBe("rate_limited");
    expect(classifyScanError(new Error("HTTP/1.1 503 Service Unavailable"))).toBe("rate_limited");
  });

  it("maps DNS failures", () => {
    expect(classifyScanError(new Error("getaddrinfo ENOTFOUND up.example"))).toBe("dns_failed");
  });

  it("maps empty replies", () => {
    expect(classifyScanError(new Error("Empty reply from upstream proxy"))).toBe("empty_reply");
  });

  it("maps connection resets/aborts before generic connect failures", () => {
    expect(classifyScanError(new Error("socket hang up ECONNRESET"))).toBe("connect_aborted");
    expect(classifyScanError(new Error("connect ECONNREFUSED 1.2.3.4:8080"))).toBe("connect_failed");
  });

  it("falls back to unknown_error for anything unrecognized", () => {
    expect(classifyScanError(new Error("something weird happened"))).toBe("unknown_error");
    expect(classifyScanError("not an error object")).toBe("unknown_error");
  });
});
