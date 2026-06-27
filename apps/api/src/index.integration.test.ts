import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import request from "supertest";
import type { Express } from "express";

// HTTP end-to-end tests that drive the real Express app with supertest against a
// throwaway SQLite database. They exercise the wiring the DB-layer tests cannot:
// auth tokens, status codes, request validation, the login rate limiter at the
// HTTP boundary, the admin user CRUD (incl. the P3 source-IP allowlist field),
// and the U1 atomic batch-extract endpoint.
//
// The app module runs DB init on import and binds a port unless API_DISABLE_LISTEN
// is set, so env is wired up (temp DB + admin creds + no-listen) BEFORE the
// dynamic import.

const ENCRYPTION_KEY = "api-itest-encryption-key";
const ADMIN_USERNAME = "itest-admin";
const ADMIN_PASSWORD = "itest-admin-password";
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCHEMA_PATH = join(REPO_ROOT, "packages", "db", "prisma", "schema.prisma");

let tmpDir: string;
let dbFile: string;
let app: Express;
let db: typeof import("@proxy-platform/db");

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pp-api-itest-"));
  dbFile = join(tmpDir, "test.db");

  process.env.DATABASE_URL = `file:${dbFile}`;
  process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;
  process.env.APP_SECRET = "api-itest-app-secret";
  process.env.ADMIN_USERNAME = ADMIN_USERNAME;
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  process.env.API_DISABLE_LISTEN = "1";
  // A high cap so the many legitimate logins across these tests never trip the
  // limiter incidentally; the dedicated rate-limit test below drives past the cap
  // explicitly and runs last so the resulting block does not affect other tests.
  process.env.LOGIN_RATE_MAX = "30";
  process.env.LOGIN_RATE_WINDOW_MS = "60000";

  const prismaCli = join(REPO_ROOT, "node_modules", "prisma", "build", "index.js");
  execFileSync(
    process.execPath,
    [prismaCli, "db", "push", "--schema", SCHEMA_PATH, "--skip-generate", "--accept-data-loss"],
    { cwd: REPO_ROOT, env: process.env, stdio: "pipe" }
  );

  // Import AFTER env is set: this runs configureSqlite/ensureIndexes/
  // ensureInitialAdmin against the temp DB and registers all routes, but skips
  // app.listen because API_DISABLE_LISTEN=1.
  const apiModule = await import("./index.js");
  app = apiModule.app;
  db = await import("@proxy-platform/db");
}, 60_000);

afterAll(async () => {
  if (db) await db.prisma.$disconnect();
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

async function adminToken(): Promise<string> {
  const res = await request(app)
    .post("/api/admin/login")
    .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

async function seedFreeUsUpstream(ip: string): Promise<void> {
  await db.prisma.upstreamProxy.create({
    data: {
      host: `up-${ip}`,
      port: 10000 + Math.floor(Math.random() * 50000),
      username: `u-${Math.random().toString(36).slice(2, 10)}`,
      passwordEncrypted: db.encryptSecret("upstream-secret", undefined),
      status: "free",
      currentIp: ip,
      country: "us",
      latencyMs: 100,
      score: 90,
      lastCheckedAt: new Date()
    }
  });
}

describe("health", () => {
  it("reports ok with a connected database", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.database.ok).toBe(true);
  });
});

describe("admin login", () => {
  it("issues a token for the seeded admin and rejects a wrong password", async () => {
    const ok = await request(app).post("/api/admin/login").send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
    expect(ok.status).toBe(200);
    expect(typeof ok.body.token).toBe("string");

    const bad = await request(app).post("/api/admin/login").send({ username: ADMIN_USERNAME, password: "nope" });
    expect(bad.status).toBe(401);
  });
});

describe("admin user CRUD with source-IP allowlist (P3)", () => {
  it("rejects an invalid source-IP entry on create", async () => {
    const token = await adminToken();
    const res = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "ip-bad-create", password: "password123", allowedSourceIps: ["not-an-ip"] });
    expect(res.status).toBe(400);
  });

  it("creates a user with a normalized allowlist and round-trips it", async () => {
    const token = await adminToken();
    const create = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        username: "ip-allow-user",
        password: "password123",
        allowedCountries: ["us"],
        allowedSourceIps: ["203.0.113.5", "10.0.0.0/24"]
      });
    expect(create.status).toBe(201);
    expect(create.body.user.allowedSourceIps).toEqual(["203.0.113.5", "10.0.0.0/24"]);

    // The list endpoint also returns the field.
    const list = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    const created = (list.body.users as Array<{ username: string; allowedSourceIps: string[] }>).find(
      (u) => u.username === "ip-allow-user"
    );
    expect(created?.allowedSourceIps).toEqual(["203.0.113.5", "10.0.0.0/24"]);
  });

  it("clears the allowlist when updated with an empty array, and rejects a bad PATCH", async () => {
    const token = await adminToken();
    const create = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "ip-update-user", password: "password123", allowedSourceIps: ["203.0.113.9"] });
    expect(create.status).toBe(201);
    const id = create.body.user.id as number;

    const bad = await request(app)
      .patch(`/api/admin/users/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ allowedSourceIps: ["10.0.0.0/40"] });
    expect(bad.status).toBe(400);

    const cleared = await request(app)
      .patch(`/api/admin/users/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ allowedSourceIps: [] });
    expect(cleared.status).toBe(200);
    expect(cleared.body.user.allowedSourceIps).toEqual([]);
  });

  it("requires admin auth for the users endpoint", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });
});

describe("U1 atomic batch extract (HTTP)", () => {
  it("creates N entries via the batch endpoint when enough upstreams exist", async () => {
    const token = await adminToken();
    // Create a user that can log in and extract.
    const create = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "batch-user", password: "password123", allowedCountries: ["us"], maxProxyEntries: 10 });
    expect(create.status).toBe(201);

    for (let i = 0; i < 3; i++) await seedFreeUsUpstream(`203.0.113.${200 + i}`);

    const login = await request(app).post("/api/user/login").send({ username: "batch-user", password: "password123" });
    expect(login.status).toBe(200);
    const userToken = login.body.token as string;

    const batch = await request(app)
      .post("/api/user/proxy-entries/batch")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ count: 3, targetCountry: "us" });

    expect(batch.status).toBe(201);
    expect(batch.body.ok).toBe(true);
    expect(batch.body.count).toBe(3);
    expect(batch.body.clientProxies).toHaveLength(3);
    // Each entry carries a ready-to-paste proxy string.
    expect(batch.body.clientProxies[0].copyText).toContain(":");
  });

  it("rolls back the batch and returns 409 when fewer upstreams are available", async () => {
    const token = await adminToken();
    const create = await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "batch-short", password: "password123", allowedCountries: ["us"], maxProxyEntries: 10 });
    expect(create.status).toBe(201);

    await seedFreeUsUpstream("203.0.113.210");
    await seedFreeUsUpstream("203.0.113.211");

    const login = await request(app).post("/api/user/login").send({ username: "batch-short", password: "password123" });
    const userToken = login.body.token as string;

    const before = await db.prisma.proxyEntry.count();
    const batch = await request(app)
      .post("/api/user/proxy-entries/batch")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ count: 3, targetCountry: "us" });

    expect(batch.status).toBe(409);
    expect(batch.body.code).toBe("not_enough_upstreams");
    // All-or-nothing: nothing created.
    expect(await db.prisma.proxyEntry.count()).toBe(before);
  });

  it("rejects an out-of-range count with 400", async () => {
    const token = await adminToken();
    await request(app)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "batch-badcount", password: "password123", allowedCountries: ["us"] });
    const login = await request(app).post("/api/user/login").send({ username: "batch-badcount", password: "password123" });
    const userToken = login.body.token as string;

    const res = await request(app)
      .post("/api/user/proxy-entries/batch")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ count: 99, targetCountry: "us" });
    expect(res.status).toBe(400);
  });
});

// MUST be the last describe: it deliberately drives the per-IP login limiter past
// its cap, which leaves user:127.0.0.1 blocked for the rest of the window. Any
// login-using test after this would then fail, so nothing must follow it.
describe("login rate limit (HTTP boundary)", () => {
  it("eventually returns 429 with Retry-After once the per-IP cap is exceeded", async () => {
    const attempt = () => request(app).post("/api/user/login").send({ username: "rl-ghost", password: "x" });

    let saw429 = false;
    let retryAfter: string | undefined;
    // Cap is 30; allow generous headroom for logins other tests already consumed.
    for (let i = 0; i < 60; i++) {
      const res = await attempt();
      if (res.status === 429) {
        saw429 = true;
        retryAfter = res.headers["retry-after"];
        break;
      }
      // Until throttled, a wrong-credentials login returns 401.
      expect(res.status).toBe(401);
    }

    expect(saw429).toBe(true);
    expect(retryAfter).toBeDefined();
  });
});
