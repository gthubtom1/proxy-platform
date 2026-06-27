import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Integration tests that exercise the real DB-layer business logic against a
// throwaway SQLite database. They cover the P1 core chains: create user +
// extract proxy (single + atomic batch), traffic-quota disconnect, and the
// per-user concurrent-connection limit.
//
// Isolation strategy: a unique temp .db per test file, schema applied via
// `prisma db push`, env wired up BEFORE importing the db module so its
// PrismaClient singleton binds to the temp database. Tables are truncated
// between tests so each case starts from a known state. No network: scanning is
// never invoked; upstreams are seeded directly as already-scanned "free" rows.

const ENCRYPTION_KEY = "integration-test-encryption-key";
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCHEMA_PATH = join(REPO_ROOT, "packages", "db", "prisma", "schema.prisma");

let tmpDir: string;
let dbFile: string;

// Bound after the dynamic import in beforeAll.
type DbModule = typeof import("./index.js");
let db: DbModule;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pp-db-itest-"));
  dbFile = join(tmpDir, "test.db");

  process.env.DATABASE_URL = `file:${dbFile}`;
  process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;

  // Create the schema in the throwaway DB. Invoke the Prisma CLI entry directly
  // with the current Node binary (no shell, no npx/.cmd shim) so a space in the
  // repo path is passed through correctly. --skip-generate avoids touching the
  // generated client; --accept-data-loss is a no-op on a brand-new file.
  const prismaCli = join(REPO_ROOT, "node_modules", "prisma", "build", "index.js");
  execFileSync(
    process.execPath,
    [prismaCli, "db", "push", "--schema", SCHEMA_PATH, "--skip-generate", "--accept-data-loss"],
    { cwd: REPO_ROOT, env: process.env, stdio: "pipe" }
  );

  // Import AFTER env is set so the module-level PrismaClient targets the temp DB.
  db = await import("./index.js");
  const configured = await db.configureSqlite();
  expect(configured.ok).toBe(true);
}, 60_000);

afterAll(async () => {
  if (db) {
    await db.prisma.$disconnect();
  }
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  // FK-safe truncation order: children before parents.
  await db.prisma.trafficDaily.deleteMany();
  await db.prisma.operationLog.deleteMany();
  await db.prisma.scanLog.deleteMany();
  // Break the ProxyEntry <-> UpstreamProxy lock cycle before deleting either.
  await db.prisma.upstreamProxy.updateMany({ data: { lockedByEntryId: null, status: "free" } });
  await db.prisma.proxyEntry.deleteMany();
  await db.prisma.upstreamProxy.deleteMany();
  await db.prisma.user.deleteMany();
  await db.prisma.ipGeoCache.deleteMany();
});

// Seed an already-scanned, free upstream that matches a target location so the
// matcher (status=free, lockedByEntryId=null, currentIp/country set, cooldown
// clear) will pick it. Returns the created upstream id.
async function seedFreeUpstream(opts: {
  country: string;
  region?: string;
  city?: string;
  ip: string;
  host?: string;
  port?: number;
  ipType?: string;
}): Promise<number> {
  const created = await db.prisma.upstreamProxy.create({
    data: {
      host: opts.host ?? `up-${opts.ip}`,
      port: opts.port ?? 10000 + Math.floor(Math.random() * 50000),
      username: `u-${Math.random().toString(36).slice(2, 10)}`,
      passwordEncrypted: db.encryptSecret("upstream-secret", undefined),
      status: "free",
      currentIp: opts.ip,
      country: opts.country,
      region: opts.region ?? null,
      city: opts.city ?? null,
      latencyMs: 100,
      score: 90,
      lastCheckedAt: new Date(),
      // Defaults to the schema's "unknown" when not provided.
      ...(opts.ipType ? { ipType: opts.ipType } : {})
    }
  });
  return created.id;
}

async function createActiveUser(opts: {
  username: string;
  maxProxyEntries?: number;
  maxConcurrentConnections?: number;
  trafficQuotaBytes?: bigint;
  trafficUsedBytes?: bigint;
  trafficQuotaHostingBytes?: bigint;
  trafficUsedHostingBytes?: bigint;
  allowedCountries?: string[];
  allowedSourceIps?: string[];
}): Promise<number> {
  const user = await db.prisma.user.create({
    data: {
      username: opts.username,
      passwordHash: db.hashPassword("user-password"),
      role: "user",
      status: "active",
      maxProxyEntries: opts.maxProxyEntries ?? 10,
      maxConcurrentConnections: opts.maxConcurrentConnections ?? 1,
      trafficQuotaBytes: opts.trafficQuotaBytes ?? 0n,
      trafficUsedBytes: opts.trafficUsedBytes ?? 0n,
      trafficQuotaHostingBytes: opts.trafficQuotaHostingBytes ?? 0n,
      trafficUsedHostingBytes: opts.trafficUsedHostingBytes ?? 0n,
      allowedCountriesJson: JSON.stringify(opts.allowedCountries ?? []),
      allowedSourceIpsJson: JSON.stringify(opts.allowedSourceIps ?? [])
    }
  });
  return user.id;
}

describe("createBoundProxyEntry (extract a single proxy)", () => {
  it("creates an entry and locks the matching free upstream", async () => {
    const userId = await createActiveUser({ username: "extract-single" });
    const upstreamId = await seedFreeUpstream({ country: "us", region: "california", city: "losangeles", ip: "203.0.113.10" });

    const result = await db.createBoundProxyEntry({
      userId,
      targetCountry: "us",
      targetRegion: "California",
      targetCity: "Los Angeles"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.proxyEntry.currentUpstreamId).toBe(upstreamId);
    expect(result.proxyEntry.status).toBe("active");
    expect(result.proxyEntry.username).toMatch(/^resi-us-/);

    // The chosen upstream is now locked to this entry.
    const upstream = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upstreamId } });
    expect(upstream.status).toBe("locked");
    expect(upstream.lockedByEntryId).toBe(result.proxyEntry.id);
  });

  it("rejects an unsupported target country without creating anything", async () => {
    const userId = await createActiveUser({ username: "bad-country" });
    const result = await db.createBoundProxyEntry({ userId, targetCountry: "atlantis" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_country");
    expect(await db.prisma.proxyEntry.count()).toBe(0);
  });

  it("returns no_matching_upstream when no free upstream matches the location", async () => {
    const userId = await createActiveUser({ username: "no-match" });
    // Only a GB upstream exists; request US.
    await seedFreeUpstream({ country: "gb", ip: "198.51.100.5" });

    const result = await db.createBoundProxyEntry({ userId, targetCountry: "us" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("no_matching_upstream");
    expect(await db.prisma.proxyEntry.count()).toBe(0);
  });

});

// REQ-114: this provider's residential IPs roam cities within a state, so a
// pinned city's free pool is usually empty. City pinning is best-effort with a
// same-state fallback so the proxy never ends up unbindable ("dead") after its
// first idle release.
describe("createBoundProxyEntry - city-pinned falls back to the same state", () => {
  it("binds a same-state upstream when the pinned city has no free upstream", async () => {
    const userId = await createActiveUser({ username: "city-fallback" });
    // Pinned city = orlando, but only a tampa (same florida) upstream is free.
    const tampaId = await seedFreeUpstream({ country: "us", region: "florida", city: "tampa", ip: "203.0.113.60" });

    const result = await db.createBoundProxyEntry({
      userId,
      targetCountry: "us",
      targetRegion: "Florida",
      targetCity: "Orlando"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proxyEntry.currentUpstreamId).toBe(tampaId);
  });

  it("still fails when no upstream exists in the pinned state at all", async () => {
    const userId = await createActiveUser({ username: "city-fallback-none" });
    // Only a georgia upstream; request florida/orlando -> no same-state fallback.
    await seedFreeUpstream({ country: "us", region: "georgia", city: "atlanta", ip: "203.0.113.61" });

    const result = await db.createBoundProxyEntry({
      userId,
      targetCountry: "us",
      targetRegion: "Florida",
      targetCity: "Orlando"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("no_matching_upstream");
  });
});

describe("createBoundProxyEntry - extract by line type (residential vs datacenter)", () => {
  it("binds a datacenter (hosting) upstream and remembers the choice when targetIpType=hosting", async () => {
    const userId = await createActiveUser({ username: "type-dc" });
    await seedFreeUpstream({ country: "us", ip: "203.0.113.150", ipType: "residential" });
    const dcId = await seedFreeUpstream({ country: "us", ip: "203.0.113.151", ipType: "hosting" });

    const result = await db.createBoundProxyEntry({ userId, targetCountry: "us", targetIpType: "hosting" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proxyEntry.currentUpstreamId).toBe(dcId);

    const entry = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: result.proxyEntry.id } });
    expect(entry.targetIpType).toBe("hosting");
  });

  it("excludes datacenter by default (residential pool) when no type is given", async () => {
    const userId = await createActiveUser({ username: "type-default" });
    await seedFreeUpstream({ country: "us", ip: "203.0.113.152", ipType: "hosting" });
    const resiId = await seedFreeUpstream({ country: "us", ip: "203.0.113.153", ipType: "residential" });

    const result = await db.createBoundProxyEntry({ userId, targetCountry: "us" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proxyEntry.currentUpstreamId).toBe(resiId);
  });

  it("reports no_matching_upstream for hosting when only residential upstreams exist", async () => {
    const userId = await createActiveUser({ username: "type-none" });
    await seedFreeUpstream({ country: "us", ip: "203.0.113.154", ipType: "residential" });

    const result = await db.createBoundProxyEntry({ userId, targetCountry: "us", targetIpType: "hosting" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("no_matching_upstream");
  });

  it("regenerate keeps the datacenter pool (stays hosting, never falls back to residential)", async () => {
    const userId = await createActiveUser({ username: "type-regen", maxConcurrentConnections: 1 });
    const dc1 = await seedFreeUpstream({ country: "us", ip: "203.0.113.160", ipType: "hosting" });
    const dc2 = await seedFreeUpstream({ country: "us", ip: "203.0.113.161", ipType: "hosting" });
    await seedFreeUpstream({ country: "us", ip: "203.0.113.162", ipType: "residential" });

    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us", targetIpType: "hosting" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const firstUpstream = created.proxyEntry.currentUpstreamId;

    const regen = await db.regenerateProxyEntryUpstream(created.proxyEntry.id, userId);
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;
    // Landed on the OTHER datacenter upstream, not the residential one.
    expect([dc1, dc2]).toContain(regen.proxyEntry.currentUpstreamId);
    expect(regen.proxyEntry.currentUpstreamId).not.toBe(firstUpstream);
  });
});

describe("createBoundProxyEntries (atomic batch extract)", () => {
  it("creates N entries when enough free upstreams exist, each bound to a distinct upstream", async () => {
    const userId = await createActiveUser({ username: "batch-ok", maxProxyEntries: 10 });
    for (let i = 0; i < 3; i++) {
      await seedFreeUpstream({ country: "us", ip: `203.0.113.${30 + i}` });
    }

    const result = await db.createBoundProxyEntries(3, { userId, targetCountry: "us" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(3);

    const boundUpstreamIds = await db.prisma.upstreamProxy.findMany({
      where: { status: "locked" },
      select: { id: true, lockedByEntryId: true }
    });
    expect(boundUpstreamIds).toHaveLength(3);
    // All locks point at distinct entries (no double-binding).
    const entryIds = new Set(boundUpstreamIds.map((u) => u.lockedByEntryId));
    expect(entryIds.size).toBe(3);
  });

  it("rolls the whole batch back when fewer free upstreams are available", async () => {
    const userId = await createActiveUser({ username: "batch-rollback", maxProxyEntries: 10 });
    // Only 2 free upstreams, but ask for 3.
    await seedFreeUpstream({ country: "us", ip: "203.0.113.40" });
    await seedFreeUpstream({ country: "us", ip: "203.0.113.41" });

    const result = await db.createBoundProxyEntries(3, { userId, targetCountry: "us" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("not_enough_upstreams");
    expect(result.available).toBe(2);

    // All-or-nothing: nothing created, both upstreams still free.
    expect(await db.prisma.proxyEntry.count()).toBe(0);
    const stillFree = await db.prisma.upstreamProxy.count({ where: { status: "free", lockedByEntryId: null } });
    expect(stillFree).toBe(2);
  });

  it("rejects an out-of-range count before touching the database", async () => {
    const userId = await createActiveUser({ username: "batch-bad-count" });
    await seedFreeUpstream({ country: "us", ip: "203.0.113.50" });

    const tooMany = await db.createBoundProxyEntries(51, { userId, targetCountry: "us" });
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) expect(tooMany.code).toBe("invalid_count");

    const zero = await db.createBoundProxyEntries(0, { userId, targetCountry: "us" });
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.code).toBe("invalid_count");

    expect(await db.prisma.proxyEntry.count()).toBe(0);
  });

});

describe("resolveGatewayBoundProxy (gateway auth + quota + concurrency)", () => {
  // Build a user with one active, locked proxy entry and return the proxy
  // credentials the gateway would receive over HTTP Basic.
  async function provisionConnectableEntry(userOpts: Parameters<typeof createActiveUser>[0]): Promise<{
    userId: number;
    entryId: number;
    username: string;
    password: string;
  }> {
    const userId = await createActiveUser(userOpts);
    await seedFreeUpstream({ country: "us", ip: "203.0.113.100" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    if (!created.ok) throw new Error(`setup failed: ${created.error}`);
    return { userId, entryId: created.proxyEntry.id, username: created.proxyEntry.username, password: created.proxyEntry.password };
  }

  it("authenticates a valid entry and returns the decrypted upstream credentials", async () => {
    const { username, password } = await provisionConnectableEntry({ username: "gw-ok" });

    const result = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.upstream.password).toBe("upstream-secret");
    expect(result.proxyEntry.username).toBe(username);
  });

  it("rejects a wrong proxy password with a 407", async () => {
    const { username } = await provisionConnectableEntry({ username: "gw-badpass" });

    const result = await db.resolveGatewayBoundProxy({ username, password: "wrong-password", encryptionKey: ENCRYPTION_KEY });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_auth");
    expect(result.statusCode).toBe(407);
  });

  it("rejects an unknown username with a 407", async () => {
    const result = await db.resolveGatewayBoundProxy({ username: "does-not-exist", password: "x", encryptionKey: ENCRYPTION_KEY });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("entry_not_found");
    expect(result.statusCode).toBe(407);
  });

  it("blocks a connection once the user is over their traffic quota (403)", async () => {
    const { username, password } = await provisionConnectableEntry({
      username: "gw-quota",
      trafficQuotaBytes: 1_000n,
      trafficUsedBytes: 1_000n
    });

    const result = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("quota_exceeded");
    expect(result.statusCode).toBe(403);
  });

  it("enforces the per-user concurrent-connection limit (403)", async () => {
    const { username, password } = await provisionConnectableEntry({
      username: "gw-concurrency",
      maxConcurrentConnections: 1
    });

    // First connection succeeds and increments activeConnections to 1.
    const first = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY });
    expect(first.ok).toBe(true);

    // Second concurrent connection is rejected because the single slot is taken.
    const second = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe("concurrent_limit_exceeded");
    expect(second.statusCode).toBe(403);
  });

  it("frees the slot after the connection completes, allowing a new connection", async () => {
    const { userId, entryId, username, password } = await provisionConnectableEntry({
      username: "gw-release",
      maxConcurrentConnections: 1
    });

    const first = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY });
    expect(first.ok).toBe(true);

    // Connection ends: record usage with connectionCompleted to release the slot.
    await db.recordGatewayTrafficUsage({
      userId,
      proxyEntryId: entryId,
      bytesUp: 10n,
      bytesDown: 20n,
      connectionCompleted: true
    });

    const entryAfter = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: entryId } });
    expect(entryAfter.activeConnections).toBe(0);

    // A fresh connection is allowed again.
    const second = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY });
    expect(second.ok).toBe(true);
  });
});

describe("tiered rebind keeps the exit geo stable", () => {
  // Simulate floppydata rotating the previously-bound IP away and that upstream
  // leaving the free pool, then the entry's idle lock being released. The
  // preferred geo (city/region) + preferred exit IP survive the release, so the
  // next rebind should land back in the same city — never on a "better-scored"
  // upstream in a different city/state.
  async function unbindAfterRotation(entryId: number, upstreamId: number) {
    await db.prisma.upstreamProxy.update({
      where: { id: upstreamId },
      data: {
        lockedByEntryId: null,
        status: "cooldown",
        cooldownUntil: new Date(Date.now() + 600_000)
      }
    });
    await db.prisma.proxyEntry.update({
      where: { id: entryId },
      data: {
        currentUpstreamId: null,
        currentIp: null,
        currentCountry: null,
        currentRegion: null,
        currentCity: null
      }
    });
  }

  it("rebinds to a same-city upstream over a higher-scored different city", async () => {
    const userId = await createActiveUser({ username: "rebind-city", maxConcurrentConnections: 100 });

    const p1 = await seedFreeUpstream({ country: "us", region: "arizona", city: "phoenix", ip: "1.1.1.1" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { id: entryId, username, password } = created.proxyEntry;

    const bound = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: entryId } });
    expect(bound.currentUpstreamId).toBe(p1);
    expect(bound.preferredCity).toBe("phoenix");
    expect(bound.preferredExitIp).toBe("1.1.1.1");

    await unbindAfterRotation(entryId, p1);

    // A different city (Seattle) scores higher; a same-city Phoenix upstream with
    // a fresh IP is also free. The city tier must keep us in Phoenix.
    const seattle = await seedFreeUpstream({ country: "us", region: "washington", city: "seattle", ip: "3.3.3.3" });
    await db.prisma.upstreamProxy.update({ where: { id: seattle }, data: { score: 100 } });
    const p2 = await seedFreeUpstream({ country: "us", region: "arizona", city: "phoenix", ip: "2.2.2.2" });

    const result = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.upstream.id).toBe(p2);

    const rebound = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: entryId } });
    expect(rebound.currentCity).toBe("phoenix");
    expect(rebound.currentIp).toBe("2.2.2.2");
  });

  it("falls back to the same region when no same-city upstream is free", async () => {
    const userId = await createActiveUser({ username: "rebind-region", maxConcurrentConnections: 100 });

    const p1 = await seedFreeUpstream({ country: "us", region: "arizona", city: "phoenix", ip: "1.1.1.10" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { id: entryId, username, password } = created.proxyEntry;

    await unbindAfterRotation(entryId, p1);

    // No free Phoenix upstream. A different state (California) scores higher; a
    // same-state (Arizona) different-city upstream is free. The region tier must
    // prefer the Arizona one.
    const california = await seedFreeUpstream({ country: "us", region: "california", city: "losangeles", ip: "4.4.4.4" });
    await db.prisma.upstreamProxy.update({ where: { id: california }, data: { score: 100 } });
    const arizona = await seedFreeUpstream({ country: "us", region: "arizona", city: "tucson", ip: "5.5.5.5" });

    const result = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.upstream.id).toBe(arizona);
  });
});

// REQ-114: a geo-mismatched idle binding must actually MOVE off the wrong upstream
// (or release it), not re-log a no-op "rebind" every scan (which churned 2 entries
// ~240x/day in production because hasValidUpstreamLock short-circuited the rebind).
describe("rebindProxyEntryToMatchingUpstream (drift heal, no churn)", () => {
  it("releases the mismatched upstream and rebinds to an in-target one", async () => {
    const userId = await createActiveUser({ username: "heal-ok", maxConcurrentConnections: 100 });
    const upA = await seedFreeUpstream({ country: "us", region: "california", city: "losangeles", ip: "9.8.7.1" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us", targetRegion: "California" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const entryId = created.proxyEntry.id;
    expect(created.proxyEntry.currentUpstreamId).toBe(upA);

    // Upstream A drifts out of California -> the entry is now geo-mismatched.
    await db.prisma.upstreamProxy.update({ where: { id: upA }, data: { region: "texas", city: "dallas" } });
    const upC = await seedFreeUpstream({ country: "us", region: "california", city: "sandiego", ip: "9.8.7.2" });

    await db.rebindProxyEntryToMatchingUpstream(entryId);

    const entry = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: entryId } });
    expect(entry.currentUpstreamId).toBe(upC);
    expect(entry.status).toBe("active");
    const a = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upA } });
    expect(a.lockedByEntryId).toBeNull();
  });

  it("releases the mismatched upstream and stays recoverable when none match", async () => {
    const userId = await createActiveUser({ username: "heal-none", maxConcurrentConnections: 100 });
    const upA = await seedFreeUpstream({ country: "us", region: "california", city: "losangeles", ip: "9.8.7.11" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us", targetRegion: "California" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const entryId = created.proxyEntry.id;

    await db.prisma.upstreamProxy.update({ where: { id: upA }, data: { region: "texas", city: "dallas" } });

    await db.rebindProxyEntryToMatchingUpstream(entryId);

    const entry = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: entryId } });
    // Unbound but still "active" (lazily re-bindable at connect), not frozen in mismatch.
    expect(entry.currentUpstreamId).toBeNull();
    expect(entry.status).toBe("active");
    const a = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upA } });
    expect(a.lockedByEntryId).toBeNull();
    expect(a.status).toBe("free");
  });
});

describe("regenerateProxyEntryUpstream (换一个 IP)", () => {
  it("swaps to a different free upstream, releases the old one, and changes the exit IP", async () => {
    const userId = await createActiveUser({ username: "regen-ok", maxConcurrentConnections: 100 });
    const oldUp = await seedFreeUpstream({ country: "us", region: "texas", city: "dallas", ip: "9.9.9.1" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const entryId = created.proxyEntry.id;
    expect(created.proxyEntry.currentUpstreamId).toBe(oldUp);

    // A second free upstream in the same country with a different IP.
    const newUp = await seedFreeUpstream({ country: "us", region: "texas", city: "dallas", ip: "9.9.9.2" });

    const result = await db.regenerateProxyEntryUpstream(entryId, userId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proxyEntry.currentUpstreamId).toBe(newUp);
    expect(result.proxyEntry.oldIp).toBe("9.9.9.1");
    expect(result.proxyEntry.currentIp).toBe("9.9.9.2");

    // Old upstream released back to the pool, new one locked to the entry.
    const old = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: oldUp } });
    expect(old.status).toBe("free");
    expect(old.lockedByEntryId).toBeNull();
    const fresh = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: newUp } });
    expect(fresh.status).toBe("locked");
    expect(fresh.lockedByEntryId).toBe(entryId);

    // The entry now exits via the new IP, preference moved to it, credentials unchanged.
    const entry = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: entryId } });
    expect(entry.currentIp).toBe("9.9.9.2");
    expect(entry.preferredExitIp).toBe("9.9.9.2");
    expect(entry.username).toBe(created.proxyEntry.username);
  });

  it("keeps the original binding when no other upstream is available", async () => {
    const userId = await createActiveUser({ username: "regen-none", maxConcurrentConnections: 100 });
    const onlyUp = await seedFreeUpstream({ country: "us", ip: "9.9.9.10" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const entryId = created.proxyEntry.id;

    const result = await db.regenerateProxyEntryUpstream(entryId, userId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("no_other_upstream");

    // The original upstream is still locked to the entry — nothing was lost.
    const up = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: onlyUp } });
    expect(up.status).toBe("locked");
    expect(up.lockedByEntryId).toBe(entryId);
    const entry = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: entryId } });
    expect(entry.currentUpstreamId).toBe(onlyUp);
    expect(entry.currentIp).toBe("9.9.9.10");
  });

  it("refuses to regenerate an entry that belongs to a different user", async () => {
    const ownerId = await createActiveUser({ username: "regen-owner", maxConcurrentConnections: 100 });
    const otherId = await createActiveUser({ username: "regen-other", maxConcurrentConnections: 100 });
    await seedFreeUpstream({ country: "us", ip: "9.9.9.20" });
    await seedFreeUpstream({ country: "us", ip: "9.9.9.21" });
    const created = await db.createBoundProxyEntry({ userId: ownerId, targetCountry: "us" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await db.regenerateProxyEntryUpstream(created.proxyEntry.id, otherId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("forbidden");

    // The real owner's binding is untouched.
    const entry = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: created.proxyEntry.id } });
    expect(entry.currentUpstreamId).toBe(created.proxyEntry.currentUpstreamId);
  });

  it("returns entry_not_found for an unknown entry id", async () => {
    const userId = await createActiveUser({ username: "regen-missing" });
    const result = await db.regenerateProxyEntryUpstream(999_999, userId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("entry_not_found");
  });

  it("stays consistent under concurrent regenerate of the same entry (no orphan lock, no double-bind)", async () => {
    const userId = await createActiveUser({ username: "regen-concurrent", maxConcurrentConnections: 100 });
    const oldUp = await seedFreeUpstream({ country: "us", region: "texas", city: "dallas", ip: "9.9.9.30" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const entryId = created.proxyEntry.id;
    expect(created.proxyEntry.currentUpstreamId).toBe(oldUp);

    // Two alternative free upstreams so both concurrent calls have something to swap to.
    await seedFreeUpstream({ country: "us", region: "texas", city: "dallas", ip: "9.9.9.31" });
    await seedFreeUpstream({ country: "us", region: "texas", city: "dallas", ip: "9.9.9.32" });

    // Fire two regenerate calls for the SAME entry at once. The @unique constraint on
    // lockedByEntryId guarantees at most one upstream is ever locked to the entry, so
    // the worst case is the losing call returns a clean error — never an orphan lock.
    const [a, b] = await Promise.all([
      db.regenerateProxyEntryUpstream(entryId, userId),
      db.regenerateProxyEntryUpstream(entryId, userId)
    ]);
    expect(a.ok || b.ok).toBe(true);
    for (const r of [a, b]) {
      if (!r.ok) expect(["regenerate_failed", "no_other_upstream"]).toContain(r.code);
    }

    // Invariant: exactly one upstream is locked to the entry, and the entry points to it.
    const locked = await db.prisma.upstreamProxy.findMany({ where: { lockedByEntryId: entryId } });
    expect(locked).toHaveLength(1);
    expect(locked[0].status).toBe("locked");
    const entry = await db.prisma.proxyEntry.findUniqueOrThrow({ where: { id: entryId } });
    expect(entry.currentUpstreamId).toBe(locked[0].id);
  });
});

describe("ipType quality pool (datacenter exclusion + auto-recovery)", () => {
  it("excludes datacenter (hosting) upstreams from extraction, allows residential", async () => {
    const userId = await createActiveUser({ username: "q-dc-excl", maxConcurrentConnections: 100 });
    await seedFreeUpstream({ country: "us", ip: "9.9.9.40", ipType: "hosting" });

    const blocked = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.code).toBe("no_matching_upstream");

    const resUp = await seedFreeUpstream({ country: "us", ip: "9.9.9.41", ipType: "residential" });
    const ok = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.proxyEntry.currentUpstreamId).toBe(resUp);
  });

  it("keeps unknown / not-yet-classified upstreams extractable (fail-open)", async () => {
    const userId = await createActiveUser({ username: "q-unknown", maxConcurrentConnections: 100 });
    const up = await seedFreeUpstream({ country: "us", ip: "9.9.9.42" });
    const ok = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.proxyEntry.currentUpstreamId).toBe(up);
  });

  it("auto-recovers a datacenter upstream once a re-scan reclassifies it residential", async () => {
    const userId = await createActiveUser({ username: "q-recover", maxConcurrentConnections: 100 });
    const up = await seedFreeUpstream({ country: "us", ip: "9.9.9.43", ipType: "hosting" });

    const blocked = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(blocked.ok).toBe(false);

    await db.recordUpstreamScanResult({
      success: true,
      upstreamProxyId: up,
      exitIp: "9.9.9.43",
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      ipType: "residential",
      latencyMs: 120
    });

    const fresh = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: up } });
    expect(fresh.ipType).toBe("residential");

    const ok = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.proxyEntry.currentUpstreamId).toBe(up);
  });

  it("does not let an unknown scan overwrite a known classification", async () => {
    const up = await seedFreeUpstream({ country: "us", ip: "9.9.9.44", ipType: "residential" });
    await db.recordUpstreamScanResult({
      success: true,
      upstreamProxyId: up,
      exitIp: "9.9.9.44",
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      ipType: "unknown",
      latencyMs: 90
    });
    const fresh = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: up } });
    expect(fresh.ipType).toBe("residential");
  });

  it("regenerate skips datacenter alternatives", async () => {
    const userId = await createActiveUser({ username: "q-regen-dc", maxConcurrentConnections: 100 });
    await seedFreeUpstream({ country: "us", region: "texas", city: "dallas", ip: "9.9.9.45", ipType: "residential" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    // The only alternative exit is a datacenter IP, which must be skipped.
    await seedFreeUpstream({ country: "us", region: "texas", city: "dallas", ip: "9.9.9.46", ipType: "hosting" });
    const result = await db.regenerateProxyEntryUpstream(created.proxyEntry.id, userId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("no_other_upstream");
  });
});

describe("traffic quota accounting", () => {
  it("increments user and entry usage and records a daily row", async () => {
    const userId = await createActiveUser({ username: "quota-accounting", trafficQuotaBytes: 1_000_000n });
    await seedFreeUpstream({ country: "us", ip: "203.0.113.120" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(await db.isProxyEntryOverQuota(created.proxyEntry.id)).toBe(false);

    await db.recordGatewayTrafficUsage({
      userId,
      proxyEntryId: created.proxyEntry.id,
      bytesUp: 400_000n,
      bytesDown: 700_000n,
      connectionCompleted: true
    });

    const user = await db.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.trafficUsedBytes).toBe(1_100_000n);
    // Residential usage must not touch the hosting bucket.
    expect(user.trafficUsedHostingBytes).toBe(0n);
    // Used (1.1M) now exceeds the residential quota (1M).
    expect(await db.isProxyEntryOverQuota(created.proxyEntry.id)).toBe(true);

    const daily = await db.prisma.trafficDaily.findFirstOrThrow({ where: { userId } });
    expect(daily.totalBytes).toBe(1_100_000n);
    expect(daily.connections).toBe(1);
  });

  it("meters hosting traffic against the hosting bucket, independently of residential", async () => {
    const userId = await createActiveUser({
      username: "quota-buckets",
      trafficQuotaBytes: 1_000_000n,
      trafficQuotaHostingBytes: 500_000n
    });
    // A datacenter (hosting) upstream so the extracted entry draws from the hosting pool.
    await seedFreeUpstream({ country: "us", ip: "9.9.9.200", ipType: "hosting" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us", targetIpType: "hosting" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(await db.isProxyEntryOverQuota(created.proxyEntry.id)).toBe(false);

    await db.recordGatewayTrafficUsage({
      userId,
      proxyEntryId: created.proxyEntry.id,
      bytesUp: 200_000n,
      bytesDown: 400_000n,
      connectionCompleted: true
    });

    const user = await db.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    // Hosting usage accrues to the hosting bucket; residential bucket stays at 0.
    expect(user.trafficUsedHostingBytes).toBe(600_000n);
    expect(user.trafficUsedBytes).toBe(0n);
    // Over the hosting quota (500K) -> this hosting entry is over quota.
    expect(await db.isProxyEntryOverQuota(created.proxyEntry.id)).toBe(true);
  });

  it("does not block a hosting connection when only the residential bucket is exhausted", async () => {
    const userId = await createActiveUser({
      username: "quota-residential-exhausted",
      trafficQuotaBytes: 1_000n,
      trafficUsedBytes: 1_000n,
      trafficQuotaHostingBytes: 0n
    });
    await seedFreeUpstream({ country: "us", ip: "9.9.9.201", ipType: "hosting" });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us", targetIpType: "hosting" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    // Residential is fully used, but this entry is hosting (unlimited) -> not over quota.
    expect(await db.isProxyEntryOverQuota(created.proxyEntry.id)).toBe(false);

    const result = await db.resolveGatewayBoundProxy({
      username: created.proxyEntry.username,
      password: created.proxyEntry.password,
      encryptionKey: ENCRYPTION_KEY
    });
    expect(result.ok).toBe(true);
  });
});

describe("resolveGatewayBoundProxy - source-IP allowlist", () => {
  // Provision a connectable entry for a user with the given source-IP allowlist.
  // A high concurrency limit lets a single test make several resolve calls (each
  // increments activeConnections) without tripping concurrent_limit_exceeded.
  async function provision(username: string, allowedSourceIps: string[]): Promise<{ username: string; password: string }> {
    const userId = await createActiveUser({ username, allowedSourceIps, maxConcurrentConnections: 100 });
    await seedFreeUpstream({ country: "us", ip: `203.0.113.${130 + Math.floor(Math.random() * 100)}` });
    const created = await db.createBoundProxyEntry({ userId, targetCountry: "us" });
    if (!created.ok) throw new Error(`setup failed: ${created.error}`);
    return { username: created.proxyEntry.username, password: created.proxyEntry.password };
  }

  it("allows any source IP when the allowlist is empty", async () => {
    const { username, password } = await provision("ip-empty", []);
    const result = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY, sourceIp: "8.8.8.8" });
    expect(result.ok).toBe(true);
  });

  it("allows a source IP that is in the allowlist", async () => {
    const { username, password } = await provision("ip-allowed", ["198.51.100.7", "10.0.0.0/24"]);
    const exact = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY, sourceIp: "198.51.100.7" });
    expect(exact.ok).toBe(true);

    const inCidr = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY, sourceIp: "10.0.0.55" });
    expect(inCidr.ok).toBe(true);
  });

  it("rejects a source IP outside the allowlist with 403 ip_not_allowed", async () => {
    const { username, password } = await provision("ip-blocked", ["198.51.100.7"]);
    const result = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY, sourceIp: "203.0.113.9" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ip_not_allowed");
    expect(result.statusCode).toBe(403);
  });

  it("does not enforce the allowlist when no sourceIp is provided (caller cannot determine peer)", async () => {
    const { username, password } = await provision("ip-no-source", ["198.51.100.7"]);
    const result = await db.resolveGatewayBoundProxy({ username, password, encryptionKey: ENCRYPTION_KEY });
    expect(result.ok).toBe(true);
  });

  it("matches an IPv4-mapped IPv6 client against a plain IPv4 allowlist entry", async () => {
    const { username, password } = await provision("ip-mapped", ["198.51.100.7"]);
    const result = await db.resolveGatewayBoundProxy({
      username,
      password,
      encryptionKey: ENCRYPTION_KEY,
      sourceIp: "::ffff:198.51.100.7"
    });
    expect(result.ok).toBe(true);
  });
});

describe("pruneOldRecords - ip geo cache retention", () => {
  it("deletes geo-cache rows older than the retention window and keeps fresh ones", async () => {
    await db.upsertIpGeoCache("203.0.113.250", {
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      provider: "test",
      ipType: "unknown"
    });
    await db.upsertIpGeoCache("203.0.113.251", {
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      provider: "test",
      ipType: "unknown"
    });

    // Backdate one row's updatedAt to 100 days ago (older than the 90-day default).
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60_000);
    await db.prisma.ipGeoCache.update({ where: { ip: "203.0.113.250" }, data: { updatedAt: oldDate } });

    const result = await db.pruneOldRecords();
    expect(result.geoCache).toBeGreaterThanOrEqual(1);

    // The stale row is gone; the fresh one remains.
    expect(await db.prisma.ipGeoCache.findUnique({ where: { ip: "203.0.113.250" } })).toBeNull();
    expect(await db.prisma.ipGeoCache.findUnique({ where: { ip: "203.0.113.251" } })).not.toBeNull();
  });
});

describe("recordUpstreamScanResult - ipType persistence", () => {
  // Regression guard for the bug where scanUpstreamProxyOnce dropped ipType from
  // its success result, so the admin "re-test now" action could never refresh an
  // upstream's datacenter flag. recordUpstreamScanResult is the consumer of that
  // field: a definitive type must be written, an "unknown" must never clobber a
  // previously known type.
  it("persists a definitive ipType (hosting) from a successful scan result", async () => {
    const upstreamId = await seedFreeUpstream({ country: "us", ip: "203.0.113.60", ipType: "unknown" });

    await db.recordUpstreamScanResult({
      success: true,
      upstreamProxyId: upstreamId,
      exitIp: "203.0.113.61",
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      ipType: "hosting",
      latencyMs: 120
    });

    const upstream = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upstreamId } });
    expect(upstream.ipType).toBe("hosting");
    expect(upstream.ipTypeCheckedAt).not.toBeNull();
  });

  it("does not overwrite a known ipType when the scan result type is unknown", async () => {
    const upstreamId = await seedFreeUpstream({ country: "us", ip: "203.0.113.62", ipType: "residential" });

    await db.recordUpstreamScanResult({
      success: true,
      upstreamProxyId: upstreamId,
      exitIp: "203.0.113.62",
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      ipType: "unknown",
      latencyMs: 90
    });

    const upstream = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upstreamId } });
    expect(upstream.ipType).toBe("residential");
  });

  it("downgrades a STALE hosting label to unknown on an unknown scan even when the exit IP is unchanged", async () => {
    // The dynamic-residential exit rotated back to a residential IP and stuck. The
    // old "hosting" flag (captured on a prior rotation) is now stale and the local
    // lane only returns "unknown", so it must be cleared, otherwise the datacenter
    // grade keeps handing out this residential IP.
    const upstreamId = await seedFreeUpstream({ country: "us", ip: "203.0.113.70", ipType: "hosting" });
    await db.prisma.upstreamProxy.update({
      where: { id: upstreamId },
      data: { ipTypeCheckedAt: new Date(Date.now() - 2 * 60 * 60_000) }
    });

    await db.recordUpstreamScanResult({
      success: true,
      upstreamProxyId: upstreamId,
      exitIp: "203.0.113.70",
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      ipType: "unknown",
      latencyMs: 95
    });

    const upstream = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upstreamId } });
    expect(upstream.ipType).toBe("unknown");
  });

  it("keeps a FRESH hosting label on an unknown scan (no premature flap)", async () => {
    const upstreamId = await seedFreeUpstream({ country: "us", ip: "203.0.113.71", ipType: "hosting" });
    await db.prisma.upstreamProxy.update({
      where: { id: upstreamId },
      data: { ipTypeCheckedAt: new Date() }
    });

    await db.recordUpstreamScanResult({
      success: true,
      upstreamProxyId: upstreamId,
      exitIp: "203.0.113.71",
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      ipType: "unknown",
      latencyMs: 95
    });

    const upstream = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upstreamId } });
    expect(upstream.ipType).toBe("hosting");
  });
});

describe("recordUpstreamScanResult - scan log retention", () => {
  // The two-phase scanner re-checks every upstream frequently. Writing a success
  // scan_log on every cycle (even when nothing changed) would flood the table on
  // SQLite's single writer, so a successful scan only logs when the exit IP
  // actually changed. Failures always log (they carry the error to diagnose).
  it("writes a success scan log when the exit IP changed", async () => {
    const upstreamId = await seedFreeUpstream({ country: "us", ip: "203.0.113.70" });

    await db.recordUpstreamScanResult({
      success: true,
      upstreamProxyId: upstreamId,
      exitIp: "203.0.113.71",
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      latencyMs: 100
    });

    const logs = await db.prisma.scanLog.findMany({ where: { upstreamProxyId: upstreamId } });
    expect(logs).toHaveLength(1);
    expect(logs[0].success).toBe(true);
    expect(logs[0].exitIp).toBe("203.0.113.71");
  });

  it("does not write a success scan log when the exit IP is unchanged (but still updates health fields)", async () => {
    const upstreamId = await seedFreeUpstream({ country: "us", ip: "203.0.113.72" });

    await db.recordUpstreamScanResult({
      success: true,
      upstreamProxyId: upstreamId,
      exitIp: "203.0.113.72",
      country: "us",
      region: null,
      city: null,
      isp: null,
      asn: null,
      latencyMs: 100
    });

    const logs = await db.prisma.scanLog.findMany({ where: { upstreamProxyId: upstreamId } });
    expect(logs).toHaveLength(0);

    const upstream = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upstreamId } });
    expect(upstream.lastCheckedAt).not.toBeNull();
    expect(upstream.successCount).toBe(1);
  });

  it("always writes a scan log on failure", async () => {
    const upstreamId = await seedFreeUpstream({ country: "us", ip: "203.0.113.73" });

    await db.recordUpstreamScanResult({
      success: false,
      upstreamProxyId: upstreamId,
      errorType: "timeout",
      message: "Scanner timeout",
      latencyMs: null
    });

    const logs = await db.prisma.scanLog.findMany({ where: { upstreamProxyId: upstreamId } });
    expect(logs).toHaveLength(1);
    expect(logs[0].success).toBe(false);
    expect(logs[0].errorType).toBe("timeout");
  });
});

describe("recordUpstreamScanResult - provider rate-limit (402) does not condemn", () => {
  // 402/429/503 are the upstream provider throttling us (usually self-inflicted by
  // high scan concurrency against a single provider endpoint), not a dead upstream.
  // They must cool down and retry without ever counting toward "bad".
  it("keeps a rate_limited upstream in cooldown, never bad, failCount untouched", async () => {
    const upstreamId = await seedFreeUpstream({ country: "us", ip: "203.0.113.90" });

    for (let i = 0; i < 5; i++) {
      await db.recordUpstreamScanResult(
        {
          success: false,
          upstreamProxyId: upstreamId,
          errorType: "rate_limited",
          message: "HTTP/1.1 402 Payment Required",
          latencyMs: 40
        },
        { maxScanFailures: 3, cooldownMs: 10000 }
      );
    }

    const upstream = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upstreamId } });
    expect(upstream.status).toBe("cooldown");
    expect(upstream.failCount).toBe(0);
    expect(upstream.lastErrorType).toBe("rate_limited");
  });

  it("a normal failure still increments failCount and can reach bad", async () => {
    const upstreamId = await seedFreeUpstream({ country: "us", ip: "203.0.113.92" });

    for (let i = 0; i < 3; i++) {
      await db.recordUpstreamScanResult(
        {
          success: false,
          upstreamProxyId: upstreamId,
          errorType: "timeout",
          message: "Scanner timeout",
          latencyMs: null
        },
        { maxScanFailures: 3, cooldownMs: 10000 }
      );
    }

    const upstream = await db.prisma.upstreamProxy.findUniqueOrThrow({ where: { id: upstreamId } });
    expect(upstream.status).toBe("bad");
    expect(upstream.failCount).toBe(3);
  });
});

describe("getUpstreamScanCandidates - onlyLocked fast lane filter", () => {
  // The fast lane re-scans only in-use (locked) upstreams more often so active
  // users' displayed exit IP stays fresh, without re-sweeping the whole free pool.
  it("returns only locked upstreams when onlyLocked is set", async () => {
    const freeId = await seedFreeUpstream({ country: "us", ip: "203.0.113.80" });
    const locked = await db.prisma.upstreamProxy.create({
      data: {
        host: "up-locked",
        port: 12345,
        username: "u-locked",
        passwordEncrypted: db.encryptSecret("locked-secret", undefined),
        status: "locked",
        currentIp: "203.0.113.81",
        country: "us",
        lastCheckedAt: new Date()
      }
    });

    const all = await db.getUpstreamScanCandidates({ limit: 50 });
    const allIds = all.candidates.map((c) => c.id);
    expect(allIds).toContain(freeId);
    expect(allIds).toContain(locked.id);

    const lockedOnly = await db.getUpstreamScanCandidates({ limit: 50, onlyLocked: true });
    const lockedIds = lockedOnly.candidates.map((c) => c.id);
    expect(lockedIds).toContain(locked.id);
    expect(lockedIds).not.toContain(freeId);
  });
});
