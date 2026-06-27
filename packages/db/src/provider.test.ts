import { describe, it, expect } from "vitest";
import { getDatabaseProvider } from "./index.js";

// Pure-logic test (no DB connection): getDatabaseProvider only inspects the URL
// string, so it can run in the default node test environment.
describe("getDatabaseProvider", () => {
  it("detects sqlite from a file: url and as the default", () => {
    expect(getDatabaseProvider("file:/data/app.db")).toBe("sqlite");
    expect(getDatabaseProvider("file:../../data/app.db")).toBe("sqlite");
    expect(getDatabaseProvider("")).toBe("sqlite");
    expect(getDatabaseProvider(undefined)).toBe("sqlite");
  });

  it("detects postgresql from postgres:// and postgresql:// urls", () => {
    expect(getDatabaseProvider("postgresql://user:pass@host:5432/db")).toBe("postgresql");
    expect(getDatabaseProvider("postgres://user:pass@host:5432/db")).toBe("postgresql");
    expect(getDatabaseProvider("POSTGRESQL://Host:5432/Db")).toBe("postgresql");
  });

  it("treats an unknown scheme as sqlite (safe default)", () => {
    expect(getDatabaseProvider("mysql://host/db")).toBe("sqlite");
  });
});
