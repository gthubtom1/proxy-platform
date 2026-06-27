import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Two tiers of tests live next to the code, both matched here:
    //  - *.test.ts: pure-logic unit tests (no database, no network).
    //  - *.integration.test.ts: real DB-layer tests that provision their OWN
    //    throwaway SQLite file per file (DATABASE_URL is set inside beforeAll),
    //    so files stay isolated even though Vitest runs separate files in
    //    parallel workers. They still do no network I/O (no upstream scanning).
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node"
  }
});
