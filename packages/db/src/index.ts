import { Prisma, PrismaClient } from "@prisma/client";
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { connect as netConnect, type Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";
import {
  computeStabilityScore,
  DEFAULT_RATE_LIMITED_COOLDOWN_MS,
  isIpInAllowlist,
  isValidIpv4,
  normalizeCity,
  normalizeCountry,
  normalizeRegion,
  resolveExtractGrade,
  isStaticExtractGrade,
  isRegionDrift,
  STABILITY_TIER_STATIC,
  type ParsedUpstreamProxy,
  type ScanErrorType,
  type SupportedCountry
} from "@proxy-platform/shared";
import { initLocalGeo, lookupLocalGeo, type LocalGeoResult } from "./geo-local.js";

export const prisma = new PrismaClient();

// Transaction options for the gateway hot path (per-connection reserve + traffic
// accounting). SQLite has a single writer, so when many proxy connections arrive
// at once their write transactions serialize on the database lock. Prisma's
// default interactive-transaction timeout is only 5s and maxWait 2s, so under
// concurrency transactions get killed with "Transaction already closed" before
// they ever acquire the lock, which surfaces as CONNECT failures in the gateway.
// Raising maxWait (how long to queue for a free connection/lock) and timeout (how
// long the transaction body may run) lets these short transactions wait their
// turn instead of failing. Overridable via env for tuning under heavier load.
const GATEWAY_TX_OPTIONS = {
  maxWait: readEnvPositiveInt("GATEWAY_DB_TX_MAX_WAIT_MS", 20_000),
  timeout: readEnvPositiveInt("GATEWAY_DB_TX_TIMEOUT_MS", 20_000)
};

// How long a stored non-residential ip_type ("hosting"/"proxy") stays trusted
// without re-confirmation. These upstreams are dynamic-residential: their exit IP
// rotates, so a "hosting" flag captured on one rotation must not outlive its
// freshness. Past this window, a scan that can only resolve "unknown" (the local
// GeoIP fast lane cannot positively label residential) downgrades the stale label
// to "unknown" — fail-open to residential — even when the exit IP did not change
// this cycle, so the datacenter grade stops handing out an IP that has since
// rotated back to residential.
const IP_TYPE_STALE_MS = readEnvPositiveInt("IP_TYPE_STALE_MS", 60 * 60_000);

// Cap multiplier for the exponential 402 backoff (8x base -> 5→10→20→40min).
const RATE_LIMITED_BACKOFF_CAP_MULT = 8;

// Exponential backoff for provider-throttle (402/429/503) cooldown: each
// consecutive rate_limited doubles the previous cooldown, capped, so we stop
// re-probing a quota-limited provider every few minutes (which kept the retry
// pool full and the shared concurrency budget suppressed). prevCooldownMs=0
// (prior failure was not a throttle, or the upstream recovered in between)
// resets to the base. Pure for unit testing.
export function nextRateLimitedCooldownMs(baseMs: number, prevCooldownMs: number, capMs: number): number {
  const cap = Math.max(baseMs, capMs);
  const doubled = prevCooldownMs > 0 ? prevCooldownMs * 2 : 0;
  return Math.min(Math.max(baseMs, doubled), cap);
}

// Which database engine the current DATABASE_URL points at. SQLite uses a
// `file:` URL; PostgreSQL uses postgres://postgresql://. Defaults to sqlite so a
// missing/odd URL keeps the historical behavior. Used to gate SQLite-only PRAGMA
// tuning and VACUUM, which error or are meaningless on Postgres.
export type DatabaseProvider = "sqlite" | "postgresql";

export function getDatabaseProvider(databaseUrl = process.env.DATABASE_URL): DatabaseProvider {
  const url = (databaseUrl ?? "").trim().toLowerCase();
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgresql";
  }
  return "sqlite";
}

/**
 * Apply connection-level tuning. On SQLite this enables WAL mode and a busy
 * timeout (the historical behavior). On PostgreSQL these PRAGMAs do not exist, so
 * it is a no-op — Postgres concurrency/durability is configured on the server,
 * not per connection. Kept named configureSqlite for call-site compatibility.
 */
export async function configureSqlite(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (getDatabaseProvider() !== "sqlite") {
    return { ok: true };
  }
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    // Wait up to 20s for the single SQLite write lock instead of failing fast.
    // Must be >= the gateway transaction timeout so a queued writer waits for the
    // lock rather than the transaction being aborted first under connection bursts.
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 20000;");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error"
    };
  }
}

// Hot-path indexes, created idempotently at startup. The schema also declares
// these via @@index, but `prisma db push`/generate can fail on some Windows/Node
// setups (engine file lock), so creating them here with CREATE INDEX IF NOT
// EXISTS guarantees they exist in every deployment regardless of db push. Names
// match Prisma's generated index names so the two never produce duplicates.
const HOT_PATH_INDEXES: string[] = [
  "CREATE INDEX IF NOT EXISTS upstream_proxies_status_country_region_city_idx ON upstream_proxies(status, country, region, city)",
  "CREATE INDEX IF NOT EXISTS upstream_proxies_status_last_checked_at_idx ON upstream_proxies(status, last_checked_at)",
  "CREATE INDEX IF NOT EXISTS proxy_entries_user_id_idx ON proxy_entries(user_id)",
  "CREATE INDEX IF NOT EXISTS proxy_entries_status_active_connections_idx ON proxy_entries(status, active_connections)",
  "CREATE INDEX IF NOT EXISTS proxy_entries_status_last_used_at_idx ON proxy_entries(status, last_used_at)",
  "CREATE INDEX IF NOT EXISTS scan_logs_upstream_proxy_id_created_at_idx ON scan_logs(upstream_proxy_id, created_at)",
  "CREATE INDEX IF NOT EXISTS scan_logs_created_at_idx ON scan_logs(created_at)",
  "CREATE INDEX IF NOT EXISTS operation_logs_created_at_idx ON operation_logs(created_at)",
  "CREATE INDEX IF NOT EXISTS operation_logs_actor_user_id_idx ON operation_logs(actor_user_id)",
  "CREATE INDEX IF NOT EXISTS traffic_daily_user_id_idx ON traffic_daily(user_id)",
  "CREATE INDEX IF NOT EXISTS traffic_daily_proxy_entry_id_idx ON traffic_daily(proxy_entry_id)"
];

export async function ensureIndexes(): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  let applied = 0;
  try {
    for (const statement of HOT_PATH_INDEXES) {
      await prisma.$executeRawUnsafe(statement);
      applied += 1;
    }
    await repairInconsistentUpstreamCooldownStatus();
    return { ok: true, created: applied };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown database error" };
  }
}

async function repairInconsistentUpstreamCooldownStatus(): Promise<void> {
  const now = new Date();
  await prisma.upstreamProxy.updateMany({
    where: {
      status: "free",
      cooldownUntil: { gt: now }
    },
    data: { status: "cooldown" }
  });
}

export type UpstreamImportItem =
  | {
      ok: true;
      lineNumber: number;
      id: number;
      host: string;
      port: number;
      username: string;
      action: "created" | "duplicate";
    }
  | {
      ok: false;
      lineNumber: number;
      error: string;
    };

export type UpstreamImportSummary = {
  created: number;
  duplicates: number;
  failed: number;
  items: UpstreamImportItem[];
};

export type ScanCandidate = {
  id: number;
  host: string;
  port: number;
  username: string;
  password: string;
};

export type ScanCandidateLoadResult = {
  candidates: ScanCandidate[];
  failures: UpstreamScanResult[];
};

export type UpstreamScanResult =
  | {
      success: true;
      upstreamProxyId: number;
      exitIp: string;
      country: SupportedCountry;
      region: string | null;
      city: string | null;
      isp: string | null;
      asn: string | null;
      // Exit-IP classification: residential / hosting / proxy / unknown. Optional so
      // existing callers/fixtures compile; recordUpstreamScanResult only persists a
      // definitive (non-unknown) value, leaving the stored type untouched otherwise.
      ipType?: string;
      latencyMs: number;
    }
  | {
      success: false;
      upstreamProxyId: number;
      errorType: string;
      message: string;
      latencyMs: number | null;
      exitIp?: string | null;
      country?: string | null;
      region?: string | null;
      city?: string | null;
    };

export type GeoCacheValue = {
  country: SupportedCountry;
  region: string | null;
  city: string | null;
  isp: string | null;
  asn: string | null;
  provider: string;
  ipType: string;
};

export type CreateBoundProxyEntryInput = {
  userId?: number;
  ownerUsername?: string;
  targetCountry: string;
  targetRegion?: string | null;
  targetCity?: string | null;
  // Legacy line-type selector (back-compat). See ProxyEntry.targetIpType.
  targetIpType?: string | null;
  // Legacy survey selector (back-compat). See ProxyEntry.targetStabilityTier.
  targetStabilityTier?: string | null;
  // New precise extraction grade (one of EXTRACT_GRADE_*). Takes precedence over
  // targetIpType/targetStabilityTier for matching and is persisted on the entry so
  // change-IP / rebind keep the exact same grade as the original extract.
  targetGrade?: string | null;
  proxyPassword?: string;
};

// Normalize a caller's pool choice to the two values we persist/match on.
// Defaults to "residential" so existing callers and old rows keep today's
// behavior (datacenter excluded).
export function normalizeIpTypeChoice(input?: string | null): "residential" | "hosting" {
  const value = (input ?? "").trim().toLowerCase();
  if (value === "hosting" || value === "datacenter" || value === "dc") return "hosting";
  return "residential";
}

// True when an entry's traffic/quota belongs to the datacenter (hosting) bucket.
// Residential (default/null) and hosting are metered against separate user pools.
export function isHostingEntry(targetIpType?: string | null): boolean {
  return normalizeIpTypeChoice(targetIpType) === "hosting";
}

// Pick the quota/used pair for the bucket an entry draws from. 0 quota means
// unlimited, matching the original single-bucket semantics.
function bucketQuotaFor(
  user: { trafficQuotaBytes: bigint; trafficUsedBytes: bigint; trafficQuotaHostingBytes: bigint; trafficUsedHostingBytes: bigint },
  targetIpType?: string | null
): { quota: bigint; used: bigint } {
  return isHostingEntry(targetIpType)
    ? { quota: user.trafficQuotaHostingBytes, used: user.trafficUsedHostingBytes }
    : { quota: user.trafficQuotaBytes, used: user.trafficUsedBytes };
}

export type CreateBoundProxyEntryResult =
  | {
      ok: true;
      user: {
        id: number;
        username: string;
      };
      proxyEntry: {
        id: number;
        username: string;
        password: string;
        targetCountry: SupportedCountry;
        targetRegion: string | null;
        targetCity: string | null;
        currentUpstreamId: number;
        currentIp: string | null;
        currentCountry: string | null;
        currentRegion: string | null;
        currentCity: string | null;
        status: string;
      };
      upstream: {
        id: number;
        host: string;
        port: number;
        country: string | null;
        region: string | null;
        city: string | null;
        currentIp: string | null;
        latencyMs: number | null;
        stableSince: Date | null;
      };
    }
  | {
      ok: false;
      error: string;
      code:
        | "invalid_country"
        | "user_not_found"
        | "user_inactive"
        | "proxy_entry_limit_reached"
        | "no_matching_upstream"
        | "username_conflict";
    };

export type GatewayBoundProxy =
  | {
      ok: true;
      proxyEntry: {
        id: number;
        username: string;
        userId: number;
      };
      upstream: {
        id: number;
        host: string;
        port: number;
        username: string;
        password: string;
      };
    }
  | {
      ok: false;
      code:
        | "invalid_auth"
        | "entry_not_found"
        | "entry_disabled"
        | "user_inactive"
        | "ip_not_allowed"
        | "quota_exceeded"
        | "concurrent_limit_exceeded"
        | "no_bound_upstream"
        | "upstream_unavailable"
        | "decrypt_failed";
      statusCode: 407 | 403 | 502;
      error: string;
    };

export type GatewayTrafficUsageInput = {
  userId: number;
  proxyEntryId: number;
  bytesUp: bigint | number;
  bytesDown: bigint | number;
  connectionCompleted?: boolean;
};

export async function resolveGatewayBoundProxy(input: {
  username: string;
  password: string;
  encryptionKey?: string;
  // Source IP of the connecting client. When the entry's user has a non-empty
  // source-IP allowlist, a connection from outside it is rejected. Omitted/empty
  // means "no IP check" (used by callers that cannot determine the peer).
  sourceIp?: string;
}): Promise<GatewayBoundProxy> {
  const entry = await prisma.proxyEntry.findUnique({
    where: { username: input.username },
    include: {
      user: true,
      lockedUpstream: true
    }
  });

  if (!entry) {
    return {
      ok: false,
      code: "entry_not_found",
      statusCode: 407,
      error: "Proxy authentication failed"
    };
  }

  if (!verifyPassword(input.password, entry.passwordHash)) {
    return {
      ok: false,
      code: "invalid_auth",
      statusCode: 407,
      error: "Proxy authentication failed"
    };
  }

  if (entry.user.status !== "active") {
    return {
      ok: false,
      code: "user_inactive",
      statusCode: 407,
      error: "Proxy authentication failed"
    };
  }

  // Source-IP allowlist (authorization, runs after the password is verified so it
  // is only evaluated for otherwise-valid credentials). An empty allowlist means
  // unrestricted. Only enforced when the caller provides the peer IP.
  const allowedSourceIps = parseStringArrayJson(entry.user.allowedSourceIpsJson);
  if (allowedSourceIps.length > 0 && input.sourceIp && !isIpInAllowlist(input.sourceIp, allowedSourceIps)) {
    return {
      ok: false,
      code: "ip_not_allowed",
      statusCode: 403,
      error: "Source IP is not allowed for this account"
    };
  }

  const entryQuota = bucketQuotaFor(entry.user, entry.targetIpType);
  if (entryQuota.quota > 0n && entryQuota.used >= entryQuota.quota) {
    return {
      ok: false,
      code: "quota_exceeded",
      statusCode: 403,
      error: "Traffic quota exceeded"
    };
  }

  if (entry.status === "disabled" || entry.status === "dead") {
    return {
      ok: false,
      code: "entry_disabled",
      statusCode: 407,
      error: "Proxy authentication failed"
    };
  }

  const keyResult = getEncryptionKey(input.encryptionKey ?? process.env.ENCRYPTION_KEY);
  if (!keyResult.ok) {
    return {
      ok: false,
      code: "decrypt_failed",
      statusCode: 502,
      error: "No available upstream proxy"
    };
  }

  type ReserveSuccess = {
    ok: true;
    proxyEntryId: number;
    userId: number;
    username: string;
    upstreamId: number;
  };

  type ReserveFailure = Extract<GatewayBoundProxy, { ok: false }>;

  // Fast path (no DB write): when this user has no concurrency limit
  // (maxConcurrentConnections <= 0 means unlimited) and the entry already holds a
  // valid upstream lock, there is nothing to reserve — no connection counting and
  // no rebinding needed. Skipping the interactive write transaction here is what
  // lets the gateway handle many simultaneous connections on SQLite: the heavy
  // per-connection $transaction was serializing on the single SQLite writer and
  // timing out under a fingerprint browser's parallel connections. lastUsedAt is
  // still kept fresh by the traffic recorder's periodic/own-close flush, so idle
  // release is unaffected.
  if (entry.user.maxConcurrentConnections <= 0 && hasValidUpstreamLock(entry)) {
    try {
      const upstreamPassword = decryptSecret(entry.lockedUpstream!.passwordEncrypted, keyResult.key);
      return {
        ok: true,
        proxyEntry: {
          id: entry.id,
          username: entry.username,
          userId: entry.userId
        },
        upstream: {
          id: entry.lockedUpstream!.id,
          host: entry.lockedUpstream!.host,
          port: entry.lockedUpstream!.port,
          username: entry.lockedUpstream!.username,
          password: upstreamPassword
        }
      };
    } catch {
      return {
        ok: false,
        code: "decrypt_failed",
        statusCode: 502,
        error: "No available upstream proxy"
      };
    }
  }

  const reserved = await prisma.$transaction(async (tx): Promise<ReserveSuccess | ReserveFailure> => {
    const fresh = await tx.proxyEntry.findUnique({
      where: { id: entry.id },
      include: {
        user: true,
        lockedUpstream: true
      }
    });

    if (!fresh || fresh.status === "disabled" || fresh.status === "dead") {
      return {
        ok: false,
        code: "entry_disabled",
        statusCode: 407,
        error: "Proxy authentication failed"
      };
    }

    if (fresh.user.status !== "active") {
      return {
        ok: false,
        code: "user_inactive",
        statusCode: 407,
        error: "Proxy authentication failed"
      };
    }

    const freshQuota = bucketQuotaFor(fresh.user, fresh.targetIpType);
    if (freshQuota.quota > 0n && freshQuota.used >= freshQuota.quota) {
      return {
        ok: false,
        code: "quota_exceeded",
        statusCode: 403,
        error: "Traffic quota exceeded"
      };
    }

    const concurrentLimit = fresh.user.maxConcurrentConnections;
    if (concurrentLimit > 0) {
      const usage = await tx.proxyEntry.aggregate({
        where: { userId: fresh.user.id },
        _sum: { activeConnections: true }
      });
      if ((usage._sum.activeConnections ?? 0) >= concurrentLimit) {
        return {
          ok: false,
          code: "concurrent_limit_exceeded",
          statusCode: 403,
          error: "Concurrent connection limit exceeded"
        };
      }
    }

    const hasLock = hasValidUpstreamLock(fresh);

    if (fresh.status === "mismatch" && !hasLock) {
      return {
        ok: false,
        code: "upstream_unavailable",
        statusCode: 502,
        error: "No available upstream proxy"
      };
    }

    if (!hasLock) {
      const bound = await bindProxyEntryToMatchingUpstreamInTx(tx, fresh.id, { markMismatchOnFailure: false });
      if (!bound) {
        return {
          ok: false,
          code: "upstream_unavailable",
          statusCode: 502,
          error: "No available upstream proxy"
        };
      }
    }

    const boundEntry = await tx.proxyEntry.findUnique({
      where: { id: fresh.id },
      include: {
        user: true,
        lockedUpstream: true
      }
    });

    if (!boundEntry?.lockedUpstream || !hasValidUpstreamLock(boundEntry)) {
      return {
        ok: false,
        code: "upstream_unavailable",
        statusCode: 502,
        error: "No available upstream proxy"
      };
    }

    if (concurrentLimit > 0) {
      const usage = await tx.proxyEntry.aggregate({
        where: { userId: boundEntry.user.id },
        _sum: { activeConnections: true }
      });
      if ((usage._sum.activeConnections ?? 0) >= concurrentLimit) {
        return {
          ok: false,
          code: "concurrent_limit_exceeded",
          statusCode: 403,
          error: "Concurrent connection limit exceeded"
        };
      }
    }

    await tx.proxyEntry.update({
      where: { id: boundEntry.id },
      data: {
        activeConnections: { increment: 1 },
        lastUsedAt: new Date()
      }
    });

    return {
      ok: true,
      proxyEntryId: boundEntry.id,
      userId: boundEntry.userId,
      username: boundEntry.username,
      upstreamId: boundEntry.lockedUpstream.id
    };
  }, GATEWAY_TX_OPTIONS);

  if (!reserved.ok) {
    return reserved;
  }

  const upstream = await prisma.upstreamProxy.findUnique({
    where: { id: reserved.upstreamId }
  });

  if (!upstream) {
    return {
      ok: false,
      code: "upstream_unavailable",
      statusCode: 502,
      error: "No available upstream proxy"
    };
  }

  try {
    const upstreamPassword = decryptSecret(upstream.passwordEncrypted, keyResult.key);

    return {
      ok: true,
      proxyEntry: {
        id: reserved.proxyEntryId,
        username: reserved.username,
        userId: reserved.userId
      },
      upstream: {
        id: upstream.id,
        host: upstream.host,
        port: upstream.port,
        username: upstream.username,
        password: upstreamPassword
      }
    };
  } catch {
    return {
      ok: false,
      code: "decrypt_failed",
      statusCode: 502,
      error: "No available upstream proxy"
    };
  }
}

/**
 * Zero out every proxy entry's live connection counter. Safe to call only at
 * gateway startup: at that moment no tunnels are held by this process, so any
 * non-zero value is a phantom left behind by a previous crash/restart. Without
 * this, the counter only ever increments after an unclean shutdown and users
 * eventually hit "concurrent_limit_exceeded" forever.
 */
export async function resetActiveConnections(): Promise<number> {
  const result = await prisma.proxyEntry.updateMany({
    where: { activeConnections: { not: 0 } },
    data: { activeConnections: 0 }
  });
  return result.count;
}

/**
 * Periodic safety net for the live-connection counter. The decrement on
 * connection end can be lost if that single write fails (e.g. SQLITE_BUSY), and
 * resetActiveConnections only runs at startup — so over a long uptime a counter
 * can drift above zero and eventually lock the user out via the concurrency
 * limit. This zeroes the counter for entries that claim active connections but
 * have been idle longer than `staleMinutes` (no traffic), which a genuinely live
 * connection would never be (the periodic flush updates lastUsedAt every cycle).
 * Returns the number of entries corrected.
 */
export async function reconcileActiveConnections(staleMinutes = readEnvPositiveInt("CONN_RECONCILE_STALE_MINUTES", 30)): Promise<number> {
  const staleCutoff = new Date(Date.now() - staleMinutes * 60_000);
  const result = await prisma.proxyEntry.updateMany({
    where: {
      activeConnections: { gt: 0 },
      // Stale by traffic: a genuinely live connection refreshes lastUsedAt every
      // flush cycle. Use createdAt as the fallback clock for an entry that has a
      // counter but never recorded traffic, so a brand-new connection still in
      // its first flush window is not wrongly zeroed.
      OR: [
        { lastUsedAt: { lt: staleCutoff } },
        { lastUsedAt: null, createdAt: { lt: staleCutoff } }
      ]
    },
    data: { activeConnections: 0 }
  });
  return result.count;
}

export type PruneOldRecordsConfig = {
  scanLogRetentionDays?: number;
  operationLogRetentionDays?: number;
  trafficDailyRetentionDays?: number;
  geoCacheRetentionDays?: number;
};

export type PruneOldRecordsResult = {
  scanLogs: number;
  operationLogs: number;
  trafficDaily: number;
  geoCache: number;
};

/**
 * Delete log/metric rows older than the configured retention windows. These
 * tables (scanLog, operationLog, trafficDaily) grow unbounded otherwise: the
 * worker writes scan logs every cycle for every upstream, so the SQLite file
 * keeps growing forever without periodic pruning. The ipGeoCache table also
 * accretes one row per distinct exit IP ever seen; over a long uptime with
 * rotating residential IPs that grows without bound too, so stale geo entries
 * (not refreshed within geoCacheRetentionDays) are pruned as well — a pruned IP
 * is simply re-looked-up if it ever reappears.
 */
export async function pruneOldRecords(config: PruneOldRecordsConfig = {}): Promise<PruneOldRecordsResult> {
  const scanLogRetentionDays = config.scanLogRetentionDays ?? 30;
  const operationLogRetentionDays = config.operationLogRetentionDays ?? 90;
  const trafficDailyRetentionDays = config.trafficDailyRetentionDays ?? 180;
  const geoCacheRetentionDays = config.geoCacheRetentionDays ?? 90;
  const now = Date.now();
  const dayMs = 24 * 60 * 60_000;

  const scanLogCutoff = new Date(now - scanLogRetentionDays * dayMs);
  const operationLogCutoff = new Date(now - operationLogRetentionDays * dayMs);
  const trafficDailyCutoff = new Date(now - trafficDailyRetentionDays * dayMs).toISOString().slice(0, 10);
  const geoCacheCutoff = new Date(now - geoCacheRetentionDays * dayMs);

  const [scanLogs, operationLogs, trafficDaily, geoCache] = await Promise.all([
    prisma.scanLog.deleteMany({ where: { createdAt: { lt: scanLogCutoff } } }),
    prisma.operationLog.deleteMany({ where: { createdAt: { lt: operationLogCutoff } } }),
    prisma.trafficDaily.deleteMany({ where: { date: { lt: trafficDailyCutoff } } }),
    prisma.ipGeoCache.deleteMany({ where: { updatedAt: { lt: geoCacheCutoff } } })
  ]);

  return {
    scanLogs: scanLogs.count,
    operationLogs: operationLogs.count,
    trafficDaily: trafficDaily.count,
    geoCache: geoCache.count
  };
}

export type CompactDatabaseResult = { ok: true } | { ok: false; error: string };

/**
 * Reclaim disk space and keep storage bounded over a long uptime. Never throws.
 *
 * SQLite: pruneOldRecords' deleteMany frees pages for reuse but never shrinks the
 * .db file, so it stays at peak size and fragments. This checkpoints the WAL back
 * into the main file (TRUNCATE so the -wal does not keep growing) then VACUUMs to
 * compact and defragment. VACUUM rewrites the whole DB and briefly needs free
 * disk equal to the DB size, so it runs on a slow cadence (e.g. monthly).
 *
 * PostgreSQL: there is no WAL PRAGMA and autovacuum normally handles dead tuples;
 * a plain (non-FULL) VACUUM is still cheap and non-blocking and refreshes planner
 * stats, so we issue that and skip the SQLite-only checkpoint.
 */
export async function compactDatabase(): Promise<CompactDatabaseResult> {
  try {
    if (getDatabaseProvider() === "sqlite") {
      // TRUNCATE checkpoint folds the WAL into the main DB and resets the -wal
      // file size, so a long-running writer does not leave an ever-growing WAL.
      await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
    }
    // VACUUM cannot run inside a transaction; $executeRawUnsafe issues it directly.
    // Plain VACUUM is valid on both SQLite and PostgreSQL.
    await prisma.$executeRawUnsafe("VACUUM;");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Cheap quota check for long-lived connections, scoped to the entry's bucket. The
 * gateway only validates quota when a connection is established, so a single long
 * tunnel could otherwise download far past the limit. The gateway calls this
 * periodically while a tunnel is open and tears the connection down once the user
 * is over quota for the bucket this entry draws from (residential vs hosting). A 0
 * quota means unlimited, matching the connect-time check in
 * resolveGatewayBoundProxy. A residential entry going over does not affect a
 * hosting tunnel and vice versa.
 */
export async function isProxyEntryOverQuota(proxyEntryId: number): Promise<boolean> {
  const entry = await prisma.proxyEntry.findUnique({
    where: { id: proxyEntryId },
    select: {
      targetIpType: true,
      user: {
        select: {
          trafficQuotaBytes: true,
          trafficUsedBytes: true,
          trafficQuotaHostingBytes: true,
          trafficUsedHostingBytes: true
        }
      }
    }
  });
  if (!entry) return false;
  const { quota, used } = bucketQuotaFor(entry.user, entry.targetIpType);
  return quota > 0n && used >= quota;
}

export type ProxyEntryServiceability =
  | { serviceable: true }
  | { serviceable: false; reason: "entry_gone" | "entry_disabled" | "user_inactive" };

/**
 * Cheap status re-check for an already-open connection. resolveGatewayBoundProxy
 * only rejects disabled entries / inactive users when a connection is first
 * established; if an admin disables the entry or the user afterwards, the gateway
 * keeps the live tunnel running. The gateway calls this periodically while a
 * tunnel is open and tears it down once the entry is no longer serviceable. The
 * criteria mirror the connect-time checks in resolveGatewayBoundProxy.
 */
export async function isProxyEntryServiceable(proxyEntryId: number): Promise<ProxyEntryServiceability> {
  const entry = await prisma.proxyEntry.findUnique({
    where: { id: proxyEntryId },
    select: { status: true, user: { select: { status: true } } }
  });
  if (!entry) {
    return { serviceable: false, reason: "entry_gone" };
  }
  if (entry.status === "disabled" || entry.status === "dead") {
    return { serviceable: false, reason: "entry_disabled" };
  }
  if (entry.user.status !== "active") {
    return { serviceable: false, reason: "user_inactive" };
  }
  return { serviceable: true };
}

export async function recordGatewayTrafficUsage(input: GatewayTrafficUsageInput): Promise<void> {
  const bytesUp = BigInt(input.bytesUp);
  const bytesDown = BigInt(input.bytesDown);
  const totalBytes = bytesUp + bytesDown;
  const today = new Date().toISOString().slice(0, 10);

  // Release the live-connection slot in its own step BEFORE the traffic-accounting
  // transaction. If accounting fails (user/entry deleted mid-connection, or a
  // SQLITE_BUSY timeout) the decrement must still happen, otherwise the counter
  // stays stuck above zero and that user is permanently locked out by the
  // concurrent-connection limit until the next gateway restart. The
  // activeConnections > 0 guard keeps the counter from going negative if a flush
  // ever runs more than once for the same connection.
  if (input.connectionCompleted) {
    await prisma.proxyEntry.updateMany({
      where: { id: input.proxyEntryId, activeConnections: { gt: 0 } },
      data: { activeConnections: { decrement: 1 } }
    });
  }

  // Interactive (callback) transaction rather than the array form so it can take
  // GATEWAY_TX_OPTIONS (maxWait/timeout): the array form only accepts
  // isolationLevel. These three writes run on every traffic flush and otherwise
  // contend for the single SQLite writer under many concurrent connections.
  await prisma.$transaction(async (tx) => {
    // Meter against the bucket this entry draws from: hosting usage accrues to the
    // datacenter pool, everything else to the residential pool. Read the entry's
    // pool inside the tx so the increment and the per-entry update stay consistent.
    const entry = await tx.proxyEntry.findUnique({
      where: { id: input.proxyEntryId },
      select: { targetIpType: true }
    });
    await tx.user.update({
      where: { id: input.userId },
      data: isHostingEntry(entry?.targetIpType)
        ? { trafficUsedHostingBytes: { increment: totalBytes } }
        : { trafficUsedBytes: { increment: totalBytes } }
    });
    await tx.proxyEntry.update({
      where: { id: input.proxyEntryId },
      data: {
        trafficUsedBytes: { increment: totalBytes },
        lastUsedAt: new Date()
      }
    });
    await tx.trafficDaily.upsert({
      where: {
        userId_proxyEntryId_date: {
          userId: input.userId,
          proxyEntryId: input.proxyEntryId,
          date: today
        }
      },
      create: {
        userId: input.userId,
        proxyEntryId: input.proxyEntryId,
        date: today,
        bytesUp,
        bytesDown,
        totalBytes,
        connections: input.connectionCompleted ? 1 : 0
      },
      update: {
        bytesUp: { increment: bytesUp },
        bytesDown: { increment: bytesDown },
        totalBytes: { increment: totalBytes },
        connections: input.connectionCompleted ? { increment: 1 } : undefined
      }
    });
  }, GATEWAY_TX_OPTIONS);
}

export async function importUpstreamProxies(
  parsedItems: Array<{ lineNumber: number; value: ParsedUpstreamProxy }>,
  encryptionKey = process.env.ENCRYPTION_KEY
): Promise<UpstreamImportSummary> {
  const items: UpstreamImportItem[] = [];
  let created = 0;
  let duplicates = 0;
  let failed = 0;

  const keyResult = getEncryptionKey(encryptionKey);
  if (!keyResult.ok) {
    return {
      created,
      duplicates,
      failed: parsedItems.length,
      items: parsedItems.map((item) => ({
        ok: false,
        lineNumber: item.lineNumber,
        error: keyResult.error
      }))
    };
  }

  for (const item of parsedItems) {
    try {
      const existing = await prisma.upstreamProxy.findUnique({
        where: {
          host_port_username: {
            host: item.value.host,
            port: item.value.port,
            username: item.value.username
          }
        }
      });

      if (existing) {
        duplicates += 1;
        items.push({
          ok: true,
          lineNumber: item.lineNumber,
          id: existing.id,
          host: existing.host,
          port: existing.port,
          username: existing.username,
          action: "duplicate"
        });
        continue;
      }

      const createdProxy = await prisma.upstreamProxy.create({
        data: {
          host: item.value.host,
          port: item.value.port,
          username: item.value.username,
          passwordEncrypted: encryptSecret(item.value.password, keyResult.key),
          status: "free"
        }
      });

      created += 1;
      items.push({
        ok: true,
        lineNumber: item.lineNumber,
        id: createdProxy.id,
        host: createdProxy.host,
        port: createdProxy.port,
        username: createdProxy.username,
        action: "created"
      });
    } catch (error) {
      failed += 1;
      items.push({
        ok: false,
        lineNumber: item.lineNumber,
        error: error instanceof Error ? error.message : "Unknown import error"
      });
    }
  }

  return { created, duplicates, failed, items };
}

export async function createBoundProxyEntry(input: CreateBoundProxyEntryInput): Promise<CreateBoundProxyEntryResult> {
  const targetCountry = normalizeCountry(input.targetCountry);
  if (!targetCountry) {
    return { ok: false, code: "invalid_country", error: "Target country is not supported" };
  }

  const targetRegion = normalizeRegion(input.targetRegion);
  const targetCity = normalizeCity(input.targetCity);
  const targetIpType = normalizeIpTypeChoice(input.targetIpType);
  const targetStabilityTier = input.targetStabilityTier === "static" ? "static" : null;
  const targetGrade = resolveExtractGrade(input.targetGrade) ? input.targetGrade ?? null : null;
  const proxyPassword = input.proxyPassword?.trim() || randomToken(18);
  const ownerUsername = input.ownerUsername?.trim() || "demo-user";
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      const user = input.userId
        ? await tx.user.findUnique({ where: { id: input.userId } })
        : await tx.user.upsert({
            where: { username: ownerUsername },
            create: {
              username: ownerUsername,
              passwordHash: hashPassword(randomToken(24)),
              allowedCountriesJson: JSON.stringify([targetCountry]),
              maxProxyEntries: 10
            },
            update: {}
          });

      if (!user) {
        return { ok: false, code: "user_not_found", error: "User was not found" };
      }

      if (user.status !== "active") {
        return { ok: false, code: "user_inactive", error: "User is not active" };
      }

      const upstream = await findMatchingFreeUpstream(
        tx,
        {
          targetCountry,
          targetRegion,
          targetCity,
          targetIpType,
          targetStabilityTier,
          targetGrade,
          preferredExitIp: null
        },
        now
      );

      if (!upstream) {
        return {
          ok: false,
          code: "no_matching_upstream",
          error: "No scanned free upstream proxy matches the requested location"
        };
      }

      const entry = await tx.proxyEntry.create({
        data: {
          userId: user.id,
          username: `pending-${randomToken(12)}`,
          passwordHash: hashPassword(proxyPassword),
          targetCountry,
          targetRegion,
          targetCity,
          targetIpType,
          targetStabilityTier,
          targetGrade,
          currentUpstreamId: upstream.id,
          currentIp: upstream.currentIp,
          currentCountry: upstream.country,
          currentRegion: upstream.region,
          currentCity: upstream.city,
          preferredExitIp: upstream.currentIp,
          preferredRegion: upstream.region,
          preferredCity: upstream.city,
          status: "active",
          lastCheckedAt: now
        }
      });

      const proxyUsername = buildProxyEntryUsername({
        userId: user.id,
        entryId: entry.id,
        country: targetCountry,
        region: targetRegion,
        city: targetCity,
        grade: targetGrade
      });

      await tx.proxyEntry.update({
        where: { id: entry.id },
        data: { username: proxyUsername }
      });

      const lockResult = await tx.upstreamProxy.updateMany({
        where: {
          id: upstream.id,
          status: "free",
          lockedByEntryId: null
        },
        data: {
          status: "locked",
          lockedByEntryId: entry.id
        }
      });

      if (lockResult.count !== 1) {
        throw new Error("Selected upstream was already locked by another entry");
      }

      return {
        ok: true,
        user: {
          id: user.id,
          username: user.username
        },
        proxyEntry: {
          id: entry.id,
          username: proxyUsername,
          password: proxyPassword,
          targetCountry,
          targetRegion,
          targetCity,
          currentUpstreamId: upstream.id,
          currentIp: upstream.currentIp,
          currentCountry: upstream.country,
          currentRegion: upstream.region,
          currentCity: upstream.city,
          status: "active"
        },
        upstream: {
          id: upstream.id,
          host: upstream.host,
          port: upstream.port,
          country: upstream.country,
          region: upstream.region,
          city: upstream.city,
          currentIp: upstream.currentIp,
          latencyMs: upstream.latencyMs,
          // Bound upstream's continuous-stable start at the moment of extraction
          // (a snapshot; the username is fixed but this reflects "how stable the
          // IP you just pulled was right now"). null = not in a static streak.
          stableSince: upstream.stableSince
        }
      };
    });
  } catch (error) {
    return {
      ok: false,
      code: "no_matching_upstream",
      error: error instanceof Error ? error.message : "Failed to create proxy entry"
    };
  }
}

export type CreateBoundProxyEntriesResult =
  | {
      ok: true;
      user: { id: number; username: string };
      entries: Array<{
        id: number;
        username: string;
        password: string;
        targetCountry: SupportedCountry;
        targetRegion: string | null;
        targetCity: string | null;
        currentIp: string | null;
        stableSince: Date | null;
      }>;
    }
  | {
      ok: false;
      error: string;
      code:
        | "invalid_country"
        | "invalid_count"
        | "user_not_found"
        | "user_inactive"
        | "proxy_entry_limit_reached"
        | "not_enough_upstreams";
      // For not_enough_upstreams: how many were actually available so the caller
      // can suggest retrying with that number.
      available?: number;
    };

/**
 * Atomically create up to `count` bound proxy entries in a single transaction.
 * All-or-nothing: if any one cannot be bound (e.g. fewer free upstreams than
 * requested, or the per-user limit would be exceeded), the whole batch rolls
 * back and nothing is created, so the user never gets a half-finished result.
 * Each iteration binds a distinct upstream because the in-transaction lookups
 * see the locks taken earlier in the same transaction.
 */
export async function createBoundProxyEntries(
  count: number,
  input: CreateBoundProxyEntryInput
): Promise<CreateBoundProxyEntriesResult> {
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    return { ok: false, code: "invalid_count", error: "Count must be between 1 and 50" };
  }

  const targetCountry = normalizeCountry(input.targetCountry);
  if (!targetCountry) {
    return { ok: false, code: "invalid_country", error: "Target country is not supported" };
  }

  const targetRegion = normalizeRegion(input.targetRegion);
  const targetCity = normalizeCity(input.targetCity);
  const targetIpType = normalizeIpTypeChoice(input.targetIpType);
  const targetStabilityTier = input.targetStabilityTier === "static" ? "static" : null;
  const targetGrade = resolveExtractGrade(input.targetGrade) ? input.targetGrade ?? null : null;
  const ownerUsername = input.ownerUsername?.trim() || "demo-user";
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx): Promise<CreateBoundProxyEntriesResult> => {
      const user = input.userId
        ? await tx.user.findUnique({ where: { id: input.userId } })
        : await tx.user.upsert({
            where: { username: ownerUsername },
            create: {
              username: ownerUsername,
              passwordHash: hashPassword(randomToken(24)),
              allowedCountriesJson: JSON.stringify([targetCountry]),
              maxProxyEntries: 10
            },
            update: {}
          });

      if (!user) return { ok: false, code: "user_not_found", error: "User was not found" };
      if (user.status !== "active") return { ok: false, code: "user_inactive", error: "User is not active" };

      const entries: Extract<CreateBoundProxyEntriesResult, { ok: true }>["entries"] = [];
      for (let i = 0; i < count; i++) {
        const upstream = await findMatchingFreeUpstream(
          tx,
          { targetCountry, targetRegion, targetCity, targetIpType, targetStabilityTier, targetGrade, preferredExitIp: null },
          now
        );

        if (!upstream) {
          // Not enough free upstreams for the requested count. Roll back the whole
          // batch via a thrown sentinel so nothing partial is created; report how
          // many were available (the ones bound so far in this transaction).
          throw new NotEnoughUpstreamsError(i);
        }

        const proxyPassword = input.proxyPassword?.trim() || randomToken(18);
        const entry = await tx.proxyEntry.create({
          data: {
            userId: user.id,
            username: `pending-${randomToken(12)}`,
            passwordHash: hashPassword(proxyPassword),
            targetCountry,
            targetRegion,
            targetCity,
            targetIpType,
            targetStabilityTier,
            targetGrade,
            currentUpstreamId: upstream.id,
            currentIp: upstream.currentIp,
            currentCountry: upstream.country,
            currentRegion: upstream.region,
            currentCity: upstream.city,
            preferredExitIp: upstream.currentIp,
            preferredRegion: upstream.region,
            preferredCity: upstream.city,
            status: "active",
            lastCheckedAt: now
          }
        });

        const proxyUsername = buildProxyEntryUsername({
          userId: user.id,
          entryId: entry.id,
          country: targetCountry,
          region: targetRegion,
          city: targetCity,
          grade: targetGrade
        });

        await tx.proxyEntry.update({ where: { id: entry.id }, data: { username: proxyUsername } });

        const lockResult = await tx.upstreamProxy.updateMany({
          where: { id: upstream.id, status: "free", lockedByEntryId: null },
          data: { status: "locked", lockedByEntryId: entry.id }
        });
        if (lockResult.count !== 1) {
          throw new Error("Selected upstream was already locked by another entry");
        }

        entries.push({
          id: entry.id,
          username: proxyUsername,
          password: proxyPassword,
          targetCountry,
          targetRegion,
          targetCity,
          currentIp: upstream.currentIp,
          stableSince: upstream.stableSince
        });
      }

      return { ok: true, user: { id: user.id, username: user.username }, entries };
    });
  } catch (error) {
    if (error instanceof NotEnoughUpstreamsError) {
      return {
        ok: false,
        code: "not_enough_upstreams",
        available: error.available,
        error: `Only ${error.available} free upstream(s) match this location, but ${count} were requested.`
      };
    }
    return {
      ok: false,
      code: "not_enough_upstreams",
      error: error instanceof Error ? error.message : "Failed to create proxy entries"
    };
  }
}

class NotEnoughUpstreamsError extends Error {
  available: number;
  constructor(available: number) {
    super("Not enough free upstreams");
    this.name = "NotEnoughUpstreamsError";
    this.available = available;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:v1:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, version, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || version !== "v1" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function getUpstreamScanCandidates(options: {
  limit: number;
  encryptionKey?: string;
  // Fast lane: when true, only return in-use (locked) upstreams so the worker can
  // refresh active users' exit IPs more often than the full-pool sweep. When
  // false/omitted, returns the whole scannable pool (everything but disabled/bad).
  onlyLocked?: boolean;
  // Usage protection window (minutes): skip upstreams whose bound entry is in use
  // (activeConnections > 0) or was used within the last N minutes. This stops a
  // scan probe from opening a second concurrent session on the same provider
  // username the user is actively using, which can drop their live connection.
  // 0 disables the protection.
  usageProtectMinutes?: number;
}): Promise<ScanCandidateLoadResult> {
  const keyResult = getEncryptionKey(options.encryptionKey ?? process.env.ENCRYPTION_KEY);
  if (!keyResult.ok) {
    throw new Error(keyResult.error);
  }

  const now = new Date();
  const protectMinutes = options.usageProtectMinutes && options.usageProtectMinutes > 0 ? options.usageProtectMinutes : 0;
  const protectCutoff = new Date(now.getTime() - protectMinutes * 60_000);
  const upstreams = await prisma.upstreamProxy.findMany({
    where: {
      ...(options.onlyLocked ? { status: "locked" } : { status: { notIn: ["disabled", "bad"] } }),
      OR: [
        { lastCheckedAt: null },
        { cooldownUntil: null },
        { cooldownUntil: { lte: now } }
      ],
      // Usage protection window: exclude upstreams whose bound entry is currently
      // serving traffic or was used recently, so a scan never opens a competing
      // session on the same provider username the user is actively using.
      ...(protectMinutes > 0
        ? {
            NOT: {
              lockedByEntry: {
                OR: [{ activeConnections: { gt: 0 } }, { lastUsedAt: { gte: protectCutoff } }]
              }
            }
          }
        : {})
    },
    orderBy: [{ lastCheckedAt: "asc" }, { id: "asc" }],
    take: options.limit,
    select: {
      id: true,
      host: true,
      port: true,
      username: true,
      passwordEncrypted: true
    }
  });

  const candidates: ScanCandidate[] = [];
  const failures: UpstreamScanResult[] = [];

  for (const upstream of upstreams) {
    try {
      candidates.push({
        id: upstream.id,
        host: upstream.host,
        port: upstream.port,
        username: upstream.username,
        password: decryptSecret(upstream.passwordEncrypted, keyResult.key)
      });
    } catch {
      failures.push({
        success: false,
        upstreamProxyId: upstream.id,
        errorType: "decrypt_failed",
        message: "Cannot decrypt upstream proxy password. ENCRYPTION_KEY may not match the key used during import.",
        latencyMs: null
      });
    }
  }

  return { candidates, failures };
}

// Recompute each scannable upstream's stability score/tier from recent scan_logs.
// scan_logs only records IP-change events (a successful re-check of an unchanged IP
// writes nothing), so each success row in the window is exactly one IP change. Runs
// on a slow worker loop (stabilityIntervalMs); it never touches the live allocation
// path, only writes the four stability_* columns.
export async function recomputeStabilityScores(
  options: {
    windowMs?: number;
    // Geo-first grading thresholds (REQ-114 P2). Percentages 0-100; the worker
    // passes the admin-configured values. Omitted -> computeStabilityScore defaults.
    premiumSharePct?: number;
    normalSharePct?: number;
    minSamples?: number;
  } = {}
): Promise<{ updated: number }> {
  // Default to a 3-day sliding window (REQ-114 P2): long enough to be robust to a
  // one-off cross-state blip, short enough that a newly-drifting upstream falls out
  // of premium within a few days.
  const windowMs = options.windowMs && options.windowMs > 0 ? options.windowMs : 3 * 24 * 60 * 60_000;
  const since = new Date(Date.now() - windowMs);
  const thresholds = {
    premiumShare: typeof options.premiumSharePct === "number" ? options.premiumSharePct / 100 : undefined,
    normalShare: typeof options.normalSharePct === "number" ? options.normalSharePct / 100 : undefined,
    minSamples: options.minSamples
  };

  // Only score the assignable pool; disabled/bad never get selected anyway.
  const upstreams = await prisma.upstreamProxy.findMany({
    where: { status: { notIn: ["disabled", "bad"] } },
    select: {
      id: true,
      region: true,
      successCount: true,
      failCount: true,
      stabilityTier: true,
      stableSince: true
    }
  });
  if (upstreams.length === 0) {
    return { updated: 0 };
  }

  // One windowed query for all change events, grouped in memory to avoid an N+1
  // per-upstream scan over scan_logs.
  const logs = await prisma.scanLog.findMany({
    where: { success: true, createdAt: { gte: since } },
    select: { upstreamProxyId: true, region: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });
  const byUpstream = new Map<number, { region: string | null; createdAt: Date }[]>();
  for (const log of logs) {
    const entry = { region: log.region, createdAt: log.createdAt };
    const list = byUpstream.get(log.upstreamProxyId);
    if (list) list.push(entry);
    else byUpstream.set(log.upstreamProxyId, [entry]);
  }

  const now = new Date();
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const upstream of upstreams) {
    const changes = byUpstream.get(upstream.id) ?? [];
    // Geo-first: tally how many window samples landed in each region (state) so we
    // can compute the dominant-state share. Also keep regionChanges / minInterval
    // for the admin display columns (no longer fed into the score).
    const regionTally = new Map<string, number>();
    let regionSamples = 0;
    let regionChanges = 0;
    let minIntervalMin: number | null = null;
    for (let i = 0; i < changes.length; i += 1) {
      const change = changes[i];
      if (change.region) {
        regionTally.set(change.region, (regionTally.get(change.region) ?? 0) + 1);
        regionSamples += 1;
      }
      if (i > 0) {
        if (change.region !== changes[i - 1].region) regionChanges += 1;
        const gapMin = (change.createdAt.getTime() - changes[i - 1].createdAt.getTime()) / 60_000;
        if (gapMin > 0 && (minIntervalMin === null || gapMin < minIntervalMin)) {
          minIntervalMin = gapMin;
        }
      }
    }
    // Dominant-state share over the window. With no window samples yet, fall back to
    // the upstream's current region (share 1 but sampleCount 0, so it stays below
    // minSamples and cannot be premium until it accrues real history).
    let dominantShare: number;
    let sampleCount: number;
    if (regionSamples > 0) {
      let maxCount = 0;
      for (const count of regionTally.values()) {
        if (count > maxCount) maxCount = count;
      }
      dominantShare = maxCount / regionSamples;
      sampleCount = regionSamples;
    } else if (upstream.region) {
      dominantShare = 1;
      sampleCount = 0;
    } else {
      dominantShare = 0;
      sampleCount = 0;
    }
    // Availability gate: a geo-stable but frequently-failing upstream must not be
    // graded static. successCount/failCount are lifetime counters maintained by
    // recordUpstreamScanResult.
    const totalChecks = upstream.successCount + upstream.failCount;
    const successRate = totalChecks > 0 ? upstream.successCount / totalChecks : 1;
    const { score, tier } = computeStabilityScore(
      { sampleCount, dominantRegionShare: dominantShare, successRate },
      thresholds
    );
    // Multi-window confirmation: keep the existing stableSince while it stays
    // "static"; reset when it leaves static. Selection (stage 2) can require
    // static + (now - stableSince) >= N days for the survey "static" pool.
    const wasStatic = upstream.stabilityTier === "static" && upstream.stableSince !== null;
    const nextStableSince = tier === "static" ? (wasStatic ? upstream.stableSince : now) : null;
    ops.push(
      prisma.upstreamProxy.update({
        where: { id: upstream.id },
        data: {
          stabilityScore: score,
          stabilityTier: tier,
          regionChanges24h: regionChanges,
          minChangeIntervalMin: minIntervalMin !== null ? Math.round(minIntervalMin) : null,
          stableSince: nextStableSince,
          stabilityCheckedAt: now
        }
      })
    );
  }

  // Write in batched transactions instead of N serial updates: on SQLite this
  // collapses many fsyncs into a few commits and releases the single writer
  // between batches so it does not starve gateway connection/traffic writes.
  const BATCH_SIZE = 200;
  let updated = 0;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = ops.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(batch);
    updated += batch.length;
  }
  return { updated };
}

export async function getFreshIpGeoCache(ip: string, maxAgeMs: number): Promise<GeoCacheValue | null> {
  const cached = await prisma.ipGeoCache.findUnique({ where: { ip } });
  if (!cached) return null;

  const ageMs = Date.now() - cached.updatedAt.getTime();
  if (ageMs > maxAgeMs) return null;

  const country = cached.country as SupportedCountry | null;
  if (!country) return null;

  return {
    country,
    region: cached.region,
    city: cached.city,
    isp: cached.isp,
    asn: cached.asn,
    provider: cached.provider ?? "cache",
    ipType: cached.ipType ?? "unknown"
  };
}

export async function upsertIpGeoCache(ip: string, value: GeoCacheValue): Promise<void> {
  await prisma.ipGeoCache.upsert({
    where: { ip },
    create: {
      ip,
      country: value.country,
      region: value.region,
      city: value.city,
      isp: value.isp,
      asn: value.asn,
      provider: value.provider,
      ipType: value.ipType
    },
    update: {
      country: value.country,
      region: value.region,
      city: value.city,
      isp: value.isp,
      asn: value.asn,
      provider: value.provider,
      ipType: value.ipType
    }
  });
}

// Whether a scanned upstream still satisfies the entry's SURVEY guarantee, which
// is COUNTRY + STATE (region). City is intentionally NOT enforced here (REQ-114):
// this provider's residential IPs roam cities within a state, so a pinned city's
// free pool is usually empty and city is only a best-effort preference at bind
// time (see findMatchingFreeUpstream's city->state fallback). Enforcing city here
// would flag every same-state rebind as "mismatch" and churn it endlessly.
export function upstreamMatchesEntryTarget(
  entry: { targetCountry: string; targetRegion: string | null; targetCity: string | null },
  upstream: { country: string | null; region: string | null; city: string | null }
): boolean {
  if (!upstream.country || upstream.country !== entry.targetCountry) {
    return false;
  }
  if (entry.targetRegion && upstream.region !== entry.targetRegion) {
    return false;
  }
  return true;
}

// Whether an entry's product actually promises a fixed STATE (region). Only
// static-class grades (premium/normal clean residential, static DC) and the
// explicit "static" stability tier sold a fixed state. Dynamic / roaming grades
// intentionally let the residential IP wander across states within the same
// country, so treating that wander as a geo "mismatch" rebinds the entry every
// scan cycle for no user-visible benefit (the observed rebind churn). Country is
// always enforced (see syncLockedProxyEntryAfterScan); region only for grades
// that promised a fixed state.
export function entryPromisesRegion(entry: {
  targetGrade: string | null;
  targetStabilityTier: string | null;
}): boolean {
  return isStaticExtractGrade(entry.targetGrade) || entry.targetStabilityTier === STABILITY_TIER_STATIC;
}

async function syncLockedProxyEntryAfterScan(
  result: Extract<UpstreamScanResult, { success: true }>
): Promise<void> {
  const upstream = await prisma.upstreamProxy.findUnique({
    where: { id: result.upstreamProxyId },
    select: { lockedByEntryId: true }
  });

  if (!upstream?.lockedByEntryId) {
    return;
  }

  const entry = await prisma.proxyEntry.findUnique({
    where: { id: upstream.lockedByEntryId },
    select: {
      id: true,
      status: true,
      activeConnections: true,
      targetCountry: true,
      targetRegion: true,
      targetCity: true,
      targetGrade: true,
      targetStabilityTier: true,
      currentUpstreamId: true
    }
  });

  if (!entry || entry.status === "disabled" || entry.status === "dead") {
    return;
  }

  const scannedUpstream = {
    country: result.country,
    region: result.region,
    city: result.city
  };
  const now = new Date();
  // Grade-aware match: static-class entries keep the full country+state check;
  // dynamic/roaming entries only require the country to hold, so a same-country
  // state drift (expected for roaming residential IPs) no longer marks the entry
  // "mismatch" and triggers a rebind every scan cycle.
  const locationMatches = entryPromisesRegion(entry)
    ? upstreamMatchesEntryTarget(entry, scannedUpstream)
    : Boolean(scannedUpstream.country) && scannedUpstream.country === entry.targetCountry;

  if (locationMatches) {
    await prisma.proxyEntry.update({
      where: { id: entry.id },
      data: {
        status: entry.status === "mismatch" ? "active" : entry.status,
        currentIp: result.exitIp,
        currentCountry: result.country,
        currentRegion: result.region,
        currentCity: result.city,
        lastCheckedAt: now
      }
    });
    return;
  }

  await prisma.proxyEntry.update({
    where: { id: entry.id },
    data: {
      status: "mismatch",
      currentIp: result.exitIp,
      currentCountry: result.country,
      currentRegion: result.region,
      currentCity: result.city,
      lastCheckedAt: now
    }
  });

  if (entry.activeConnections > 0) {
    return;
  }

  if (entry.status !== "mismatch") {
    return;
  }

  await rebindProxyEntryToMatchingUpstream(entry.id);
}

export type IdleUpstreamReleaseConfig = {
  idleReleaseMinutes?: number;
  minHoldMinutes?: number;
  batchLimit?: number;
};

export type IdleUpstreamReleaseResult = {
  released: number;
  entryIds: number[];
};

export async function bindProxyEntryToMatchingUpstream(
  entryId: number,
  options: { markMismatchOnFailure?: boolean } = {}
): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => bindProxyEntryToMatchingUpstreamInTx(tx, entryId, options));
  } catch {
    return false;
  }
}

type DbTx = Prisma.TransactionClient;

const matchingUpstreamOrderBy = [
  { stabilityScore: "desc" as const },
  // Within the same stability score, prefer the upstream that has PROVEN stable the
  // longest: stableSince is the start of its current uninterrupted "static" streak
  // (reset only on a tier drop, not on an IP rotation), so the earliest stableSince
  // = the longest continuously-stable. Nulls (never reached static) sort last. This
  // is the "the longer it stays stable, the more it is preferred" selection, with
  // no hard multi-day gate — a destabilized upstream resets and naturally falls back.
  { stableSince: { sort: "asc" as const, nulls: "last" as const } },
  { score: "desc" as const },
  { latencyMs: "asc" as const },
  { lastCheckedAt: "desc" as const },
  { id: "asc" as const }
];

function availableFreeUpstreamCooldownWhere(now: Date) {
  return { OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }] };
}

export function buildAvailableFreeUpstreamWhere(
  filters: {
    countries?: string[];
    country?: string;
    region?: string;
    city?: string;
    // Legacy line-type selector: "hosting" = datacenter only; anything else =
    // residential pool. Kept for back-compat with entries created before grades.
    ipType?: string | null;
    // Legacy survey selector: "static" = geo-stable residential, proxy excluded.
    stabilityTier?: string | null;
    // New precise selector (takes precedence). One of EXTRACT_GRADE_*; maps to a
    // pool (residential-clean / hosting / proxy) and a tier constraint so the six
    // user-facing grades never overlap. Falls back to ipType+stabilityTier when
    // absent/unknown, so legacy proxy entries keep matching unchanged.
    grade?: string | null;
  },
  now: Date = new Date()
) {
  const spec = resolveExtractGrade(filters.grade);
  const wantHosting = spec ? spec.pool === "hosting" : filters.ipType === "hosting";
  const wantProxy = spec ? spec.pool === "proxy" : false;
  const requireStatic = spec ? spec.tier === "static" : filters.stabilityTier === "static";
  // Residential "clean" pool excludes proxy-flagged IPs. With grades every
  // residential grade is clean; the legacy static path was already clean too.
  const cleanResidential = spec ? spec.pool === "residential" : requireStatic;

  // Quality gate by pool. Residential-clean hard-excludes datacenter AND proxy.
  // Plain legacy residential excludes only datacenter (fail-open on proxy/unknown
  // so an API hiccup never silently shrinks the pool). hosting / proxy select that
  // exact ip_type so the survey grades stay mutually exclusive.
  const ipType = wantHosting
    ? "hosting"
    : wantProxy
      ? "proxy"
      : cleanResidential
        ? { notIn: ["hosting", "proxy"] }
        : { not: "hosting" };

  // Tier constraint: exact tier, "not_static" (quasi+dynamic, for dynamic
  // datacenter), or none (proxy grade ignores tier; ordered static-first later).
  const tierConstraint =
    spec && spec.tier === "not_static"
      ? { stabilityTier: { not: "static" } }
      : spec && spec.tier
        ? { stabilityTier: spec.tier }
        : !spec && requireStatic
          ? { stabilityTier: "static" }
          : {};

  return {
    status: "free" as const,
    lockedByEntryId: null,
    currentIp: { not: null },
    country: { not: null },
    ipType,
    ...tierConstraint,
    ...(filters.countries?.length ? { country: { in: filters.countries } } : {}),
    ...(filters.country ? { country: filters.country } : {}),
    ...(filters.region ? { region: filters.region } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...availableFreeUpstreamCooldownWhere(now)
  };
}

function upstreamStatusAfterUnlock(upstream: { cooldownUntil: Date | null }, now: Date): "free" | "cooldown" {
  return upstream.cooldownUntil && upstream.cooldownUntil > now ? "cooldown" : "free";
}

function buildGeoMatchUpstreamWhere(
  entry: {
    targetCountry: string;
    targetRegion: string | null;
    targetCity: string | null;
    targetIpType?: string | null;
    targetStabilityTier?: string | null;
    targetGrade?: string | null;
  },
  now: Date
) {
  return buildAvailableFreeUpstreamWhere(
    {
      country: entry.targetCountry,
      ...(entry.targetRegion ? { region: entry.targetRegion } : {}),
      ...(entry.targetCity ? { city: entry.targetCity } : {}),
      ipType: entry.targetIpType ?? undefined,
      stabilityTier: entry.targetStabilityTier ?? undefined,
      grade: entry.targetGrade ?? undefined
    },
    now
  );
}

async function findMatchingFreeUpstream(
  tx: DbTx,
  entry: {
    targetCountry: string;
    targetRegion: string | null;
    targetCity: string | null;
    targetIpType?: string | null;
    targetStabilityTier?: string | null;
    targetGrade?: string | null;
    preferredExitIp?: string | null;
    preferredRegion?: string | null;
    preferredCity?: string | null;
  },
  now: Date
) {
  const base = buildGeoMatchUpstreamWhere(entry, now);

  // Tier 1: the exact same exit IP — i.e. land back on the same upstream if it
  // is still free and still advertising that IP. Best case for a stable
  // fingerprint, equivalent to keeping the previous upstream.
  if (entry.preferredExitIp) {
    const sameIp = await tx.upstreamProxy.findFirst({
      where: { ...base, currentIp: entry.preferredExitIp },
      orderBy: matchingUpstreamOrderBy
    });
    if (sameIp) {
      return sameIp;
    }
  }

  // Tier 2: same city. Only meaningful when the target did not already pin a
  // city; keeps the exit city (and therefore timezone/geo) stable across
  // rebinds even when the previous IP is gone.
  if (!entry.targetCity && entry.preferredCity) {
    const sameCity = await tx.upstreamProxy.findFirst({
      where: { ...base, city: entry.preferredCity },
      orderBy: matchingUpstreamOrderBy
    });
    if (sameCity) {
      return sameCity;
    }
  }

  // Tier 3: same region/state, when the target did not already pin a region.
  if (!entry.targetRegion && entry.preferredRegion) {
    const sameRegion = await tx.upstreamProxy.findFirst({
      where: { ...base, region: entry.preferredRegion },
      orderBy: matchingUpstreamOrderBy
    });
    if (sameRegion) {
      return sameRegion;
    }
  }

  // Tier 4: any free upstream within the entry's target geo (country + the
  // region/city the target itself pins).
  const exact = await tx.upstreamProxy.findFirst({
    where: base,
    orderBy: matchingUpstreamOrderBy
  });
  if (exact) {
    return exact;
  }

  // Tier 5 (city -> state fallback, REQ-114): the target pinned a CITY but no free
  // upstream is currently in it. This provider's residential IPs roam cities within
  // a state, so a specific city's free pool is usually empty and a strict match
  // would leave the entry unbindable — a "dead" proxy after the first idle release.
  // The survey guarantee is the STATE, so relax to the same region (dropping only
  // the city) and bind a same-state upstream instead of failing.
  if (entry.targetCity) {
    const stateWhere = buildAvailableFreeUpstreamWhere(
      {
        country: entry.targetCountry,
        ...(entry.targetRegion ? { region: entry.targetRegion } : {}),
        ipType: entry.targetIpType ?? undefined,
        stabilityTier: entry.targetStabilityTier ?? undefined,
        grade: entry.targetGrade ?? undefined
      },
      now
    );
    return tx.upstreamProxy.findFirst({
      where: stateWhere,
      orderBy: matchingUpstreamOrderBy
    });
  }

  return null;
}

function hasValidUpstreamLock(entry: {
  id: number;
  currentUpstreamId: number | null;
  lockedUpstream: { status: string; lockedByEntryId: number | null } | null;
}): boolean {
  return !!(
    entry.currentUpstreamId &&
    entry.lockedUpstream &&
    entry.lockedUpstream.status === "locked" &&
    entry.lockedUpstream.lockedByEntryId === entry.id
  );
}

async function bindProxyEntryToMatchingUpstreamInTx(
  tx: DbTx,
  entryId: number,
  options: { markMismatchOnFailure?: boolean } = {}
): Promise<boolean> {
  const now = new Date();
  const markMismatchOnFailure = options.markMismatchOnFailure ?? false;

  const entry = await tx.proxyEntry.findUnique({
    where: { id: entryId },
    include: { lockedUpstream: true }
  });

  if (!entry || entry.status === "disabled" || entry.status === "dead") {
    return false;
  }

  if (hasValidUpstreamLock(entry)) {
    return true;
  }

  if (entry.lockedUpstream && entry.lockedUpstream.lockedByEntryId === entry.id) {
    await tx.upstreamProxy.update({
      where: { id: entry.lockedUpstream.id },
      data: {
        status: upstreamStatusAfterUnlock(entry.lockedUpstream, now),
        lockedByEntryId: null
      }
    });
  }

  const upstream = await findMatchingFreeUpstream(tx, entry, now);

  if (!upstream) {
    if (markMismatchOnFailure) {
      await tx.proxyEntry.update({
        where: { id: entry.id },
        data: {
          status: "mismatch",
          currentUpstreamId: null,
          currentIp: null,
          currentCountry: null,
          currentRegion: null,
          currentCity: null,
          lastCheckedAt: now
        }
      });
    }
    return false;
  }

  const lockResult = await tx.upstreamProxy.updateMany({
    where: {
      id: upstream.id,
      status: "free",
      lockedByEntryId: null
    },
    data: {
      status: "locked",
      lockedByEntryId: entry.id
    }
  });

  if (lockResult.count !== 1) {
    throw new Error("Selected upstream was already locked by another entry");
  }

  await tx.proxyEntry.update({
    where: { id: entry.id },
    data: {
      status: entry.status === "mismatch" ? "active" : entry.status,
      currentUpstreamId: upstream.id,
      currentIp: upstream.currentIp,
      currentCountry: upstream.country,
      currentRegion: upstream.region,
      currentCity: upstream.city,
      preferredExitIp: upstream.currentIp ?? entry.preferredExitIp,
      preferredRegion: upstream.region ?? entry.preferredRegion,
      preferredCity: upstream.city ?? entry.preferredCity,
      lastCheckedAt: now
    }
  });

  return true;
}

export type RegenerateProxyEntryResult =
  | {
      ok: true;
      proxyEntry: {
        id: number;
        oldIp: string | null;
        currentUpstreamId: number;
        currentIp: string | null;
        currentCountry: string | null;
        currentRegion: string | null;
        currentCity: string | null;
        stableSince: Date | null;
      };
    }
  | {
      ok: false;
      code: "entry_not_found" | "forbidden" | "entry_inactive" | "no_other_upstream" | "regenerate_failed";
      error: string;
    };

/**
 * Swap a proxy entry's bound upstream for a *different* free upstream in the same
 * target geo, keeping the entry's credentials (username/password) unchanged so
 * any already-copied client string stays valid — only the exit IP changes.
 *
 * Used by the user-facing "换一个 IP" action to drop an undesirable exit (e.g. a
 * datacenter/hosting IP) and land on another one. The new upstream is found
 * before the old one is released, and excludes both the current upstream id and
 * the current exit IP, so the user does not get the same IP back. If no other
 * upstream is available the original binding is left intact (whole tx rolls back
 * via the not-found return path) and `no_other_upstream` is reported.
 */
export async function regenerateProxyEntryUpstream(
  entryId: number,
  userId: number
): Promise<RegenerateProxyEntryResult> {
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx): Promise<RegenerateProxyEntryResult> => {
      const entry = await tx.proxyEntry.findUnique({
        where: { id: entryId },
        include: { lockedUpstream: true }
      });

      if (!entry) {
        return { ok: false, code: "entry_not_found", error: "Proxy entry was not found" };
      }
      // Resource ownership: a user may only regenerate their own entry.
      if (entry.userId !== userId) {
        return { ok: false, code: "forbidden", error: "Proxy entry does not belong to the current user" };
      }
      if (entry.status === "disabled" || entry.status === "dead") {
        return { ok: false, code: "entry_inactive", error: "Proxy entry is not active" };
      }

      const oldUpstreamId = entry.currentUpstreamId;
      const oldIp = entry.currentIp;

      // Find a different free upstream in the same target geo BEFORE releasing the
      // current one, excluding the current upstream and current exit IP so the user
      // never lands back on the same (e.g. datacenter) IP.
      const where = {
        ...buildGeoMatchUpstreamWhere(entry, now),
        ...(oldUpstreamId ? { id: { not: oldUpstreamId } } : {}),
        ...(oldIp ? { AND: [{ currentIp: { not: oldIp } }] } : {})
      };

      const upstream = await tx.upstreamProxy.findFirst({ where, orderBy: matchingUpstreamOrderBy });

      if (!upstream) {
        return {
          ok: false,
          code: "no_other_upstream",
          error: "No other free upstream is available for this location right now"
        };
      }

      // Release the old upstream first (the unique lockedByEntryId would otherwise
      // collide when we lock the new one with the same entry id).
      if (oldUpstreamId && entry.lockedUpstream && entry.lockedUpstream.lockedByEntryId === entry.id) {
        await tx.upstreamProxy.update({
          where: { id: oldUpstreamId },
          data: { status: upstreamStatusAfterUnlock(entry.lockedUpstream, now), lockedByEntryId: null }
        });
      }

      const lockResult = await tx.upstreamProxy.updateMany({
        where: { id: upstream.id, status: "free", lockedByEntryId: null },
        data: { status: "locked", lockedByEntryId: entry.id }
      });

      if (lockResult.count !== 1) {
        throw new Error("Selected upstream was already locked by another entry");
      }

      await tx.proxyEntry.update({
        where: { id: entry.id },
        data: {
          status: entry.status === "mismatch" ? "active" : entry.status,
          currentUpstreamId: upstream.id,
          currentIp: upstream.currentIp,
          currentCountry: upstream.country,
          currentRegion: upstream.region,
          currentCity: upstream.city,
          // Update the preference to the NEW exit so a later automatic rebind does
          // not pull the entry back to the old (datacenter) IP via the same-IP tier.
          preferredExitIp: upstream.currentIp ?? entry.preferredExitIp,
          preferredRegion: upstream.region ?? entry.preferredRegion,
          preferredCity: upstream.city ?? entry.preferredCity,
          lastCheckedAt: now
        }
      });

      return {
        ok: true,
        proxyEntry: {
          id: entry.id,
          oldIp,
          currentUpstreamId: upstream.id,
          currentIp: upstream.currentIp,
          currentCountry: upstream.country,
          currentRegion: upstream.region,
          currentCity: upstream.city,
          stableSince: upstream.stableSince
        }
      };
    });
  } catch (error) {
    // An unexpected throw (e.g. the lock-conflict rollback when a concurrent
    // request grabbed the same upstream first) means the transaction rolled back,
    // so the original binding is left intact. Report a fixed, retryable message and
    // keep the raw cause server-side only, so no internal detail leaks to clients.
    console.error("regenerateProxyEntryUpstream failed:", error);
    return {
      ok: false,
      code: "regenerate_failed",
      error: "Could not change the exit IP right now. Please try again."
    };
  }
}

export async function releaseIdleUpstreamBindings(
  config: IdleUpstreamReleaseConfig = {}
): Promise<IdleUpstreamReleaseResult> {
  const idleReleaseMinutes = config.idleReleaseMinutes ?? readEnvPositiveInt("IDLE_RELEASE_MINUTES", 30);
  const minHoldMinutes = config.minHoldMinutes ?? readEnvPositiveInt("MIN_HOLD_MINUTES", 15);
  const batchLimit = config.batchLimit ?? 100;
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - idleReleaseMinutes * 60_000);
  const minHoldCutoff = new Date(now.getTime() - minHoldMinutes * 60_000);

  const candidates = await prisma.proxyEntry.findMany({
    where: {
      status: "active",
      activeConnections: 0,
      currentUpstreamId: { not: null },
      createdAt: { lte: minHoldCutoff },
      // Releasable once the effective idle time exceeds the threshold: for a used
      // entry that is lastUsedAt; for an extracted-but-never-used entry it is
      // createdAt, so an unused proxy still frees its upstream after the timeout
      // instead of holding it forever.
      OR: [
        { lastUsedAt: { not: null, lte: idleCutoff } },
        { lastUsedAt: null, createdAt: { lte: idleCutoff } }
      ]
    },
    include: { lockedUpstream: true },
    take: batchLimit,
    orderBy: { id: "asc" }
  });

  const entryIds: number[] = [];

  for (const candidate of candidates) {
    if (!candidate.lockedUpstream || candidate.lockedUpstream.lockedByEntryId !== candidate.id) {
      continue;
    }

    const released = await prisma.$transaction(async (tx) => {
      const entry = await tx.proxyEntry.findUnique({
        where: { id: candidate.id },
        include: { lockedUpstream: true }
      });

      if (!entry || entry.status !== "active" || entry.activeConnections > 0) {
        return false;
      }

      if (!entry.currentUpstreamId || !entry.lockedUpstream || entry.lockedUpstream.lockedByEntryId !== entry.id) {
        return false;
      }

      if (entry.createdAt > minHoldCutoff) {
        return false;
      }

      // Effective idle reference: lastUsedAt when the entry was ever used,
      // otherwise the extraction time (createdAt). Re-checked inside the
      // transaction to stay consistent with the candidate query above and to
      // avoid releasing an entry that was used again between selection and now.
      const idleReference = entry.lastUsedAt ?? entry.createdAt;
      if (idleReference > idleCutoff) {
        return false;
      }

      const upstreamId = entry.lockedUpstream.id;
      const releaseStatus = upstreamStatusAfterUnlock(entry.lockedUpstream, now);

      await tx.upstreamProxy.update({
        where: { id: upstreamId },
        data: {
          status: releaseStatus,
          lockedByEntryId: null
        }
      });

      await tx.proxyEntry.update({
        where: { id: entry.id },
        data: {
          currentUpstreamId: null,
          currentIp: null,
          currentCountry: null,
          currentRegion: null,
          currentCity: null,
          lastCheckedAt: now
        }
      });

      await tx.operationLog.create({
        data: {
          action: "idle_upstream_release",
          targetType: "proxy_entry",
          targetId: String(entry.id),
          detailJson: JSON.stringify({
            proxyEntryId: entry.id,
            proxyEntryUsername: entry.username,
            upstreamId,
            preferredExitIp: entry.preferredExitIp,
            targetCountry: entry.targetCountry,
            targetRegion: entry.targetRegion,
            targetCity: entry.targetCity,
            lastUsedAt: entry.lastUsedAt?.toISOString() ?? null,
            idleReleaseMinutes,
            minHoldMinutes
          })
        }
      });

      return true;
    });

    if (released) {
      entryIds.push(candidate.id);
    }
  }

  return { released: entryIds.length, entryIds };
}

export async function rebindProxyEntryToMatchingUpstream(entryId: number): Promise<void> {
  const before = await prisma.proxyEntry.findUnique({ where: { id: entryId }, include: { lockedUpstream: true } });
  if (!before || before.status === "disabled" || before.status === "dead" || before.activeConnections > 0) {
    return;
  }

  const previousUpstreamId = before.currentUpstreamId;

  // Release the currently-bound (geo-mismatched) upstream FIRST. Without this,
  // bindProxyEntryToMatchingUpstream short-circuits on hasValidUpstreamLock and a
  // geo-mismatched entry stays stuck on the wrong upstream, re-logging a no-op
  // "rebind" every scan cycle (observed: 2 entries rebinding ~240x/day each). Reset
  // status to "active" so a failed re-selection leaves the entry lazily re-bindable
  // at the next connect instead of frozen in "mismatch" (which the gateway refuses).
  if (
    previousUpstreamId &&
    before.lockedUpstream &&
    before.lockedUpstream.lockedByEntryId === before.id
  ) {
    const now = new Date();
    await prisma.$transaction([
      prisma.upstreamProxy.update({
        where: { id: previousUpstreamId },
        data: { status: upstreamStatusAfterUnlock(before.lockedUpstream, now), lockedByEntryId: null }
      }),
      prisma.proxyEntry.update({ where: { id: entryId }, data: { status: "active", currentUpstreamId: null } })
    ]);
  }

  // markMismatchOnFailure=false: if no in-target upstream is free right now, leave
  // the entry unbound + "active" (recoverable at next connect) rather than frozen.
  const success = await bindProxyEntryToMatchingUpstream(entryId, { markMismatchOnFailure: false });
  const after = await prisma.proxyEntry.findUnique({ where: { id: entryId } });
  if (!after) {
    return;
  }

  await prisma.operationLog.create({
    data: {
      action: "proxy_entry_rebind",
      targetType: "proxy_entry",
      targetId: String(entryId),
      detailJson: JSON.stringify({
        success,
        previousUpstreamId,
        currentUpstreamId: after.currentUpstreamId,
        preferredExitIp: after.preferredExitIp,
        status: after.status
      })
    }
  });
}

// Called by the gateway when a LIVE user request gets a provider throttle
// (HTTP 402/429) from its bound upstream. The upstream is being rate-limited right
// now, so cool it down and release the lock (does NOT count as a failure, mirroring
// the scanner) — the entry then rebinds to a different upstream on the next connect
// instead of repeatedly hitting the throttled one. Best-effort, single idempotent
// write; never throws into the gateway hot path.
export async function coolUpstreamOnGatewayThrottle(upstreamProxyId: number): Promise<void> {
  const now = new Date();
  await prisma.upstreamProxy.updateMany({
    where: { id: upstreamProxyId, status: { notIn: ["disabled", "bad"] } },
    data: {
      status: "cooldown",
      lastErrorType: "rate_limited",
      cooldownUntil: new Date(now.getTime() + DEFAULT_RATE_LIMITED_COOLDOWN_MS),
      lastCheckedAt: now,
      lockedByEntryId: null
    }
  });
}

function readEnvPositiveInt(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

type RawGeoResponse = {
  status?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  isp?: string;
  as?: string;
  message?: string;
  proxy?: boolean;
  hosting?: boolean;
};

type GeoLookupResult =
  | { ok: true; value: GeoCacheValue }
  | {
      ok: false;
      errorType: "ip_lookup_failed" | "unsupported_country";
      message: string;
      country?: string | null;
      region?: string | null;
      city?: string | null;
    };

// One geo provider's response normalized to the few fields we persist. country is
// the raw 2-letter ISO code as returned by the provider (normalizeCountry is
// applied later); null fields mean "this provider did not supply that field".
type NormalizedGeoFields = {
  countryCode: string;
  region: string | null;
  city: string | null;
  isp: string | null;
  asn: string | null;
  // Quality flags from providers that supply them (ip-api). Undefined when the
  // provider does not report them, which classifies the IP as "unknown".
  hosting?: boolean | null;
  proxy?: boolean | null;
};

// A single upstream geo source. fetchFields returns the normalized fields on a
// definitive answer, or null when the provider replied but had no usable country
// (caller treats null like "no data from this source" and moves to the next). It
// throws on transport errors / non-2xx / rate-limit (429) so the caller can fail
// over to the next provider.
type GeoProvider = {
  name: string;
  fetchFields(ip: string, timeoutMs: number): Promise<NormalizedGeoFields | null>;
};

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

// Classify an exit IP from a provider's hosting/proxy flags. hosting (datacenter)
// is the reliable signal extraction hard-excludes; proxy is the softer "suspected"
// signal kept distinct so policy can treat it as non-blocking. "unknown" means no
// provider supplied the flags, which keeps the upstream extractable (fail-open).
export function classifyIpType(hosting?: boolean | null, proxy?: boolean | null): string {
  if (hosting === true) return "hosting";
  if (proxy === true) return "proxy";
  if (hosting === false) return "residential";
  return "unknown";
}

async function fetchGeoJson(url: string, timeoutMs: number): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

// Ordered list of free, no-API-key geo sources. They are tried in order and the
// first one that returns a usable country wins, so a single provider being rate
// limited (HTTP 429) no longer fails the whole scan — the next source is used.
// Each provider's distinct JSON shape is normalized to NormalizedGeoFields here;
// the shared normalizeCountry/Region/City are applied by the caller afterwards.
const GEO_PROVIDERS: GeoProvider[] = [
  {
    name: "ip-api.com",
    async fetchFields(ip, timeoutMs) {
      const body = (await fetchGeoJson(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,countryCode,regionName,city,isp,as,proxy,hosting`,
        timeoutMs
      )) as RawGeoResponse;
      if (body.status !== "success" || !body.countryCode) {
        // status:"fail" with message:"rate limit ..." is how ip-api reports 429
        // over HTTP 200; treat that as a transport failure so we fail over.
        if (typeof body.message === "string" && /rate/i.test(body.message)) {
          throw new Error(`rate limited: ${body.message}`);
        }
        return null;
      }
      return {
        countryCode: body.countryCode,
        region: pickString(body.regionName),
        city: pickString(body.city),
        isp: pickString(body.isp),
        asn: pickString(body.as),
        hosting: typeof body.hosting === "boolean" ? body.hosting : null,
        proxy: typeof body.proxy === "boolean" ? body.proxy : null
      };
    }
  },
  {
    name: "freeipapi.com",
    async fetchFields(ip, timeoutMs) {
      const body = (await fetchGeoJson(`https://freeipapi.com/api/json/${encodeURIComponent(ip)}`, timeoutMs)) as {
        countryCode?: string;
        regionName?: string;
        cityName?: string;
        isp?: string;
        asnOrganization?: string;
        asn?: string | number;
      };
      if (!body.countryCode) return null;
      const asnValue = body.asn;
      return {
        countryCode: body.countryCode,
        region: pickString(body.regionName),
        city: pickString(body.cityName),
        isp: pickString(body.isp, body.asnOrganization),
        asn: asnValue !== undefined && asnValue !== null && String(asnValue).trim() ? `AS${String(asnValue).replace(/^AS/i, "")}` : null
      };
    }
  },
  {
    name: "geojs.io",
    async fetchFields(ip, timeoutMs) {
      const body = (await fetchGeoJson(
        `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`,
        timeoutMs
      )) as {
        country_code?: string;
        region?: string;
        city?: string;
        organization_name?: string;
        organization?: string;
        asn?: string | number;
      };
      if (!body.country_code) return null;
      // geojs "organization" looks like "AS13335 Cloudflare, Inc."; split ASN out.
      const org = pickString(body.organization_name, body.organization);
      const asnFromOrg = org ? org.match(/^AS(\d+)\s+(.*)$/i) : null;
      const asnValue = body.asn;
      return {
        countryCode: body.country_code,
        region: pickString(body.region),
        city: pickString(body.city),
        isp: asnFromOrg ? pickString(asnFromOrg[2]) : org,
        asn:
          asnValue !== undefined && asnValue !== null && String(asnValue).trim()
            ? `AS${String(asnValue).replace(/^AS/i, "")}`
            : asnFromOrg
              ? `AS${asnFromOrg[1]}`
              : null
      };
    }
  },
  {
    // Last in the chain: from some hosting/cloud IPs (e.g. Alibaba Cloud) ipwho.is
    // returns HTTP 403, which fetchGeoJson turns into a thrown error so the loop
    // simply skips it. Kept as a final fallback for networks where it does work.
    name: "ipwho.is",
    async fetchFields(ip, timeoutMs) {
      const body = (await fetchGeoJson(`https://ipwho.is/${encodeURIComponent(ip)}`, timeoutMs)) as {
        success?: boolean;
        message?: string;
        country_code?: string;
        region?: string;
        city?: string;
        connection?: { isp?: string; org?: string; asn?: number | string };
      };
      if (body.success === false) {
        if (typeof body.message === "string" && /rate|limit/i.test(body.message)) {
          throw new Error(`rate limited: ${body.message}`);
        }
        return null;
      }
      if (!body.country_code) return null;
      const asnValue = body.connection?.asn;
      return {
        countryCode: body.country_code,
        region: pickString(body.region),
        city: pickString(body.city),
        isp: pickString(body.connection?.isp, body.connection?.org),
        asn: asnValue !== undefined && asnValue !== null ? `AS${String(asnValue).replace(/^AS/i, "")}` : null
      };
    }
  }
];

export type ScanUpstreamOptions = {
  scanTimeoutMs?: number;
  geoCacheTtlMs?: number;
  encryptionKey?: string;
};

/**
 * Probe a single upstream proxy once and return its scan result, without writing
 * anything to the database. Shared by the worker's batch scanner and the admin
 * "test this upstream now" action so both behave identically. The caller decides
 * whether to persist the result via recordUpstreamScanResult.
 */
export async function scanUpstreamProxyOnce(
  upstreamId: number,
  options: ScanUpstreamOptions = {}
): Promise<UpstreamScanResult> {
  const scanTimeoutMs = options.scanTimeoutMs && options.scanTimeoutMs > 0 ? options.scanTimeoutMs : 15_000;
  const geoCacheTtlMs = options.geoCacheTtlMs && options.geoCacheTtlMs > 0 ? options.geoCacheTtlMs : 24 * 60 * 60_000;

  const keyResult = getEncryptionKey(options.encryptionKey ?? process.env.ENCRYPTION_KEY);
  if (!keyResult.ok) {
    return scanFailureResult(upstreamId, "decrypt_failed", keyResult.error, null);
  }

  const upstream = await prisma.upstreamProxy.findUnique({
    where: { id: upstreamId },
    select: { id: true, host: true, port: true, username: true, passwordEncrypted: true }
  });

  if (!upstream) {
    throw new Error(`Upstream proxy ${upstreamId} was not found`);
  }

  let password: string;
  try {
    password = decryptSecret(upstream.passwordEncrypted, keyResult.key);
  } catch {
    return scanFailureResult(
      upstreamId,
      "decrypt_failed",
      "Cannot decrypt upstream proxy password. ENCRYPTION_KEY may not match the key used during import.",
      null
    );
  }

  const candidate: ScanCandidate = {
    id: upstream.id,
    host: upstream.host,
    port: upstream.port,
    username: upstream.username,
    password
  };

  const startedAt = Date.now();
  try {
    const exitIp = await fetchExitIpThroughHttpProxy(candidate, scanTimeoutMs);
    const latencyMs = Date.now() - startedAt;

    if (!isValidIpv4(exitIp)) {
      return scanFailureResult(candidate.id, "empty_reply", "Invalid IPv4 returned by ipify", latencyMs);
    }

    const cachedGeo = await getFreshIpGeoCache(exitIp, geoCacheTtlMs);
    const geoResult = cachedGeo ? ({ ok: true, value: cachedGeo } as const) : await resolveGeoForExitIp(exitIp);

    if (!geoResult.ok) {
      return scanFailureResult(candidate.id, geoResult.errorType, geoResult.message, latencyMs, {
        exitIp,
        country: geoResult.country,
        region: geoResult.region,
        city: geoResult.city
      });
    }

    const geo = geoResult.value;
    return {
      success: true,
      upstreamProxyId: candidate.id,
      exitIp,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isp: geo.isp,
      asn: geo.asn,
      // Forward the resolved classification so recordUpstreamScanResult can refresh
      // the datacenter flag. Previously omitted, which left ipType permanently
      // stale after the admin "re-test now" action.
      ipType: geo.ipType,
      latencyMs
    };
  } catch (error) {
    return scanFailureResult(candidate.id, classifyScanError(error), toScanErrorMessage(error), Date.now() - startedAt);
  }
}

function scanFailureResult(
  upstreamProxyId: number,
  errorType: ScanErrorType,
  message: string,
  latencyMs: number | null,
  extra?: { exitIp?: string | null; country?: string | null; region?: string | null; city?: string | null }
): UpstreamScanResult {
  return { success: false, upstreamProxyId, errorType, message, latencyMs, ...extra };
}

export function classifyScanError(error: unknown): ScanErrorType {
  const message = toScanErrorMessage(error).toLowerCase();
  if (message.includes("timeout")) return "timeout";
  if (message.includes("407") || message.includes("authentication")) return "auth_failed";
  // Provider throttle / quota / billing rejection (e.g. "HTTP/1.1 402 Payment
  // Required", 429 Too Many Requests, 503). Usually self-inflicted by scanning a
  // single provider endpoint with high concurrency, NOT a dead upstream — so this
  // is kept distinct and recordUpstreamScanResult never lets it mark an upstream bad.
  if (
    /\b(402|429|503)\b/.test(message) ||
    message.includes("payment required") ||
    message.includes("too many requests") ||
    message.includes("rate limit")
  ) {
    return "rate_limited";
  }
  if (message.includes("enotfound") || message.includes("getaddrinfo")) return "dns_failed";
  if (message.includes("empty")) return "empty_reply";
  if (message.includes("aborted") || message.includes("reset")) return "connect_aborted";
  if (message.includes("connect") || message.includes("refused")) return "connect_failed";
  return "unknown_error";
}

function toScanErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown scanner error";
}

export async function fetchExitIpThroughHttpProxy(candidate: ScanCandidate, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = netConnect(candidate.port, candidate.host);
    const timer = setTimeout(() => {
      socket.destroy(new Error("Scanner timeout"));
    }, timeoutMs);

    let buffer = "";
    let settled = false;

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      const auth = Buffer.from(`${candidate.username}:${candidate.password}`).toString("base64");
      socket.write(
        [
          "CONNECT api.ipify.org:443 HTTP/1.1",
          "Host: api.ipify.org:443",
          `Proxy-Authorization: Basic ${auth}`,
          "Connection: keep-alive",
          "",
          ""
        ].join("\r\n")
      );
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("latin1");
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const header = buffer.slice(0, headerEnd);
      if (!/^HTTP\/1\.[01] 200\b/.test(header)) {
        const statusLine = header.split("\r\n")[0] ?? "Unknown CONNECT response";
        settle(() => {
          socket.destroy();
          reject(new Error(statusLine.includes("407") ? "Upstream proxy authentication failed" : statusLine));
        });
        return;
      }

      socket.removeAllListeners("data");
      const tlsSocket = tlsConnect({ socket, servername: "api.ipify.org", timeout: timeoutMs });

      tlsSocket.once("secureConnect", () => {
        tlsSocket.write(
          [
            "GET / HTTP/1.1",
            "Host: api.ipify.org",
            "User-Agent: proxy-platform-scanner/0.1",
            "Connection: close",
            "",
            ""
          ].join("\r\n")
        );
      });

      readHttpResponseBody(tlsSocket, timeoutMs)
        .then((body) => settle(() => resolve(body.trim())))
        .catch((error) => settle(() => reject(error)));
    });

    socket.once("timeout", () => {
      settle(() => {
        socket.destroy();
        reject(new Error("Scanner timeout"));
      });
    });

    socket.once("error", (error) => settle(() => reject(error)));

    socket.once("end", () => {
      if (!settled && buffer.length === 0) {
        settle(() => reject(new Error("Empty reply from upstream proxy")));
      }
    });
  });
}

async function readHttpResponseBody(socket: Socket, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let response = "";
    const timer = setTimeout(() => {
      socket.destroy(new Error("Scanner timeout"));
    }, timeoutMs);

    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
    });

    socket.once("end", () => {
      clearTimeout(timer);
      const headerEnd = response.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        reject(new Error("Empty reply from ipify"));
        return;
      }

      const header = response.slice(0, headerEnd);
      if (!/^HTTP\/1\.[01] 200\b/.test(header)) {
        reject(new Error(header.split("\r\n")[0] ?? "ipify request failed"));
        return;
      }

      resolve(response.slice(headerEnd + 4));
    });

    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function lookupAndCacheGeo(ip: string, providers: GeoProvider[] = GEO_PROVIDERS): Promise<GeoLookupResult> {
  // Per-provider timeout. Kept below the 15s default scan timeout so trying every
  // provider in sequence cannot overrun the caller's overall budget by much.
  const perProviderTimeoutMs = 6_000;
  const errors: string[] = [];
  // Holds the first "valid response but country we do not support" answer. This is
  // a definitive result for that provider, but a later provider might map the same
  // IP to a supported country (different geo DBs disagree), so we keep trying and
  // only fall back to this if every provider is exhausted.
  let unsupported: GeoLookupResult | null = null;

  for (const provider of providers) {
    let fields: NormalizedGeoFields | null;
    try {
      fields = await provider.fetchFields(ip, perProviderTimeoutMs);
    } catch (error) {
      // Transport error / non-2xx / rate limit (429): record and fail over.
      errors.push(`${provider.name}: ${error instanceof Error ? error.message : "error"}`);
      continue;
    }

    if (!fields) {
      errors.push(`${provider.name}: no usable country`);
      continue;
    }

    const country = normalizeCountry(fields.countryCode);
    if (!country) {
      if (!unsupported) {
        unsupported = {
          ok: false,
          errorType: "unsupported_country",
          message: `Unsupported country: ${fields.countryCode}`,
          country: fields.countryCode.toLowerCase(),
          region: normalizeRegion(fields.region),
          city: normalizeCity(fields.city)
        };
      }
      continue;
    }

    const value: GeoCacheValue = {
      country,
      region: normalizeRegion(fields.region),
      city: normalizeCity(fields.city),
      isp: fields.isp,
      asn: fields.asn,
      provider: provider.name,
      ipType: classifyIpType(fields.hosting, fields.proxy)
    };

    await upsertIpGeoCache(ip, value);
    return { ok: true, value };
  }

  // No provider returned a supported country. If at least one gave a definitive
  // (but unsupported) answer, report that; otherwise every source failed/limited.
  if (unsupported) {
    return unsupported;
  }

  return {
    ok: false,
    errorType: "ip_lookup_failed",
    message: errors.length ? `IP geo lookup failed: ${errors.join("; ")}` : "IP geo lookup failed"
  };
}

export type ResolveGeoOptions = {
  // When false, a local-database miss returns a failure instead of querying the
  // online providers. Lets bulk callers (the worker fast scan) stay fully offline
  // and never risk an ip-api rate limit. Defaults to true (online fallback on).
  allowOnline?: boolean;
  // Dependency seams, defaulted to the real implementations. Exposed only so the
  // unit tests can drive the routing (local hit / online fallback / offline-only)
  // without the MaxMind files, the network, or the database.
  localLookup?: (ip: string) => LocalGeoResult | null;
  onlineLookup?: (ip: string) => Promise<GeoLookupResult>;
};

/**
 * Resolve an exit IP's geo, local database first. The offline MaxMind lookup is
 * instant and never rate limited, so it is consulted before the online providers
 * and a local hit is authoritative: a supported country is used directly; an
 * unsupported country is reported without spending an online request. Only a
 * local miss falls through to the online providers (unless allowOnline is false).
 *
 * Note: the local database can only label ipType "hosting"/"unknown" (never
 * "residential"); the richer residential/proxy signal still comes from the online
 * providers, which is why locked/in-use upstreams get an online recheck elsewhere.
 */
export async function resolveGeoForExitIp(ip: string, opts: ResolveGeoOptions = {}): Promise<GeoLookupResult> {
  const localLookup = opts.localLookup ?? lookupLocalGeo;
  const onlineLookup = opts.onlineLookup ?? lookupAndCacheGeo;

  // Lazily initialize the local database the first time the real lookup is used.
  // initLocalGeo is idempotent and never throws (a missing DB just stays
  // unavailable, so lookupLocalGeo returns null and we fall back to online).
  if (!opts.localLookup) {
    await initLocalGeo();
  }

  const local = localLookup(ip);
  if (local) {
    const country = normalizeCountry(local.country ?? "");
    if (country) {
      return {
        ok: true,
        value: {
          country,
          region: normalizeRegion(local.region),
          city: normalizeCity(local.city),
          isp: local.isp,
          asn: local.asn,
          provider: "local-mmdb",
          ipType: local.ipType
        }
      };
    }
    // Local hit, but the country is not one of the supported five. The local
    // MaxMind COUNTRY field is unreliable for datacenter/proxy IPs: it often
    // reports the ASN's offshore registration country (e.g. Seychelles / India /
    // Armenia) while the IP actually routes through a supported-country city
    // (London / Paris / Sydney) — confirmed by cross-checking such IPs against
    // the online providers. So before rejecting, double-check online (which
    // resolves these to the real routing country) and let it decide. Only when
    // online is disabled is the local "unsupported" verdict used directly; a
    // genuinely non-supported IP just gets the same unsupported result from
    // online too (cached, so the extra call is paid at most once per TTL).
    if (opts.allowOnline === false) {
      return {
        ok: false,
        errorType: "unsupported_country",
        message: `Unsupported country: ${local.country ?? "unknown"}`,
        country: local.country,
        region: normalizeRegion(local.region),
        city: normalizeCity(local.city)
      };
    }
    return onlineLookup(ip);
  }

  if (opts.allowOnline === false) {
    return { ok: false, errorType: "ip_lookup_failed", message: "local geo miss, online lookup disabled" };
  }

  return onlineLookup(ip);
}

export type RecordScanResultConfig = {
  // Consecutive failures after which an upstream leaves the cooldown (retry) pool
  // and becomes bad (manual-review pool). Defaults preserve the previous behavior.
  maxScanFailures?: number;
  // How long a failed upstream stays in cooldown before the next retry.
  cooldownMs?: number;
  // Dedicated, longer cooldown for provider throttle (rate_limited / HTTP 402).
  // Defaults to cooldownMs when omitted so existing callers keep their behavior.
  rateLimitedCooldownMs?: number;
  // Freshness threshold (ms) past which a stored non-residential (hosting/proxy)
  // label is downgraded to unknown when only "unknown" comes back. Defaults to the
  // IP_TYPE_STALE_MS env constant when omitted.
  ipTypeStaleMs?: number;
};

export async function recordUpstreamScanResult(
  result: UpstreamScanResult,
  config: RecordScanResultConfig = {}
): Promise<void> {
  const maxScanFailures = config.maxScanFailures && config.maxScanFailures > 0 ? config.maxScanFailures : 3;
  const cooldownMs = config.cooldownMs && config.cooldownMs > 0 ? config.cooldownMs : 10 * 60_000;
  const rateLimitedCooldownMs =
    config.rateLimitedCooldownMs && config.rateLimitedCooldownMs > 0 ? config.rateLimitedCooldownMs : cooldownMs;
  const ipTypeStaleMs = config.ipTypeStaleMs && config.ipTypeStaleMs > 0 ? config.ipTypeStaleMs : IP_TYPE_STALE_MS;
  const upstream = await prisma.upstreamProxy.findUnique({
    where: { id: result.upstreamProxyId },
    select: {
      id: true,
      status: true,
      currentIp: true,
      lockedByEntryId: true,
      failCount: true,
      ipType: true,
      ipTypeCheckedAt: true,
      cooldownUntil: true,
      lastCheckedAt: true,
      lastErrorType: true
    }
  });

  if (!upstream) {
    throw new Error(`Upstream proxy ${result.upstreamProxyId} was not found`);
  }

  const now = new Date();

  if (result.success) {
    // Only persist a definitive classification. "unknown" (no provider supplied
    // the flags this cycle, e.g. a non-ip-api fallback served the geo) must not
    // overwrite a previously known type, otherwise quality would flap to unknown.
    const ipChanged = upstream.currentIp !== result.exitIp;
    // ip_type vs exit rotation. A definitive classification always updates. When
    // only "unknown" comes back (the local GeoIP fast lane can label
    // hosting/unknown but not residential), a stale NON-residential label must not
    // outlive the exit IP it described: clear it to "unknown" when the exit IP
    // rotated, OR when the stored "hosting"/"proxy" label has aged past
    // IP_TYPE_STALE_MS without re-confirmation. Otherwise a "hosting" flag captured
    // on one rotation sticks after the exit has rotated back to a residential IP,
    // and the datacenter grade keeps handing out a residential IP. A stored
    // residential/unknown is left untouched: it is already fail-open, so its
    // staleness is harmless and we avoid flapping a known-good type on one unknown
    // scan. "unknown" counts as residential in the pool filter, so survey grades
    // stay correct.
    const ipTypeAgeMs = upstream.ipTypeCheckedAt
      ? now.getTime() - upstream.ipTypeCheckedAt.getTime()
      : Number.POSITIVE_INFINITY;
    const storedNonResidential = upstream.ipType === "hosting" || upstream.ipType === "proxy";
    const staleNonResidential = storedNonResidential && ipTypeAgeMs > ipTypeStaleMs;
    const classifiedIpType =
      result.ipType && result.ipType !== "unknown"
        ? result.ipType
        : ipChanged || staleNonResidential
          ? "unknown"
          : undefined;
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.upstreamProxy.update({
        where: { id: result.upstreamProxyId },
        data: {
          status: upstream.lockedByEntryId ? "locked" : "free",
          currentIp: result.exitIp,
          country: result.country,
          region: result.region,
          city: result.city,
          isp: result.isp,
          asn: result.asn,
          ipType: classifiedIpType,
          ipTypeCheckedAt: classifiedIpType ? now : undefined,
          latencyMs: result.latencyMs,
          score: Math.max(1, 100 - Math.floor(result.latencyMs / 100)),
          // Decay the failure counter by one instead of resetting to zero. A
          // consistently healthy upstream still trends to 0, but a flaky one
          // (fail, fail, succeed, fail, fail, ...) accumulates failures over time
          // and eventually crosses maxScanFailures into the review pool instead of
          // being reset to healthy on every occasional success.
          failCount: Math.max(0, upstream.failCount - 1),
          successCount: { increment: 1 },
          lastErrorType: null,
          lastCheckedAt: now,
          lastChangedAt: ipChanged ? now : undefined,
          cooldownUntil: null
        }
      })
    ];
    // Only log a successful scan when the exit IP actually changed. The two-phase
    // scanner re-checks every upstream frequently; logging each unchanged success
    // would flood scan_logs on SQLite's single writer with no diagnostic value
    // (the upstream row already carries the latest currentIp/lastCheckedAt).
    if (ipChanged) {
      ops.push(
        prisma.scanLog.create({
          data: {
            upstreamProxyId: result.upstreamProxyId,
            success: true,
            exitIp: result.exitIp,
            country: result.country,
            region: result.region,
            city: result.city,
            latencyMs: result.latencyMs
          }
        })
      );
    }
    await prisma.$transaction(ops);
    await syncLockedProxyEntryAfterScan(result);
    return;
  }

  // Provider throttle/quota (402/429/503) is transient and usually self-inflicted
  // by our own scan concurrency against a single provider endpoint — it does NOT
  // mean the upstream is dead. So a rate_limited result only cools the upstream
  // down (retry later) and never increments the fail counter or marks it bad,
  // keeping good upstreams out of the review pool during a throttling burst.
  const rateLimited = result.errorType === "rate_limited";
  const nextFailCount = upstream.failCount + 1;
  const unsupportedCountry = result.errorType === "unsupported_country";
  const nextStatus =
    rateLimited || unsupportedCountry ? "cooldown" : nextFailCount >= maxScanFailures ? "bad" : "cooldown";
  // Provider throttle uses EXPONENTIAL backoff: each consecutive rate_limited
  // doubles the previous cooldown (capped), so we stop re-probing a quota-limited
  // provider every few minutes — that constant re-probing kept the retry pool full
  // and (via the old "any 402 halves" signal) suppressed the shared concurrency
  // budget, starving healthy detection. A non-throttle prior outcome (or a recovery
  // that cleared cooldownUntil) resets the streak to the base. Other failures use
  // the normal flat cooldown.
  const prevRateLimitedCooldownMs =
    rateLimited && upstream.lastErrorType === "rate_limited" && upstream.cooldownUntil && upstream.lastCheckedAt
      ? upstream.cooldownUntil.getTime() - upstream.lastCheckedAt.getTime()
      : 0;
  const effectiveCooldownMs = rateLimited
    ? nextRateLimitedCooldownMs(
        rateLimitedCooldownMs,
        prevRateLimitedCooldownMs,
        rateLimitedCooldownMs * RATE_LIMITED_BACKOFF_CAP_MULT
      )
    : cooldownMs;
  const cooldownUntil = nextStatus === "cooldown" ? new Date(now.getTime() + effectiveCooldownMs) : null;

  await prisma.$transaction([
    prisma.upstreamProxy.update({
      where: { id: result.upstreamProxyId },
      data: {
        status: upstream.status === "disabled" ? "disabled" : nextStatus,
        currentIp: result.exitIp ?? undefined,
        country: result.country ?? undefined,
        region: result.region ?? undefined,
        city: result.city ?? undefined,
        latencyMs: result.latencyMs,
        failCount: rateLimited ? undefined : { increment: 1 },
        lastErrorType: result.errorType,
        lastCheckedAt: now,
        cooldownUntil
      }
    }),
    prisma.scanLog.create({
      data: {
        upstreamProxyId: result.upstreamProxyId,
        success: false,
        exitIp: result.exitIp ?? null,
        country: result.country ?? null,
        region: result.region ?? null,
        city: result.city ?? null,
        latencyMs: result.latencyMs,
        errorType: result.errorType,
        message: result.message.slice(0, 500)
      }
    })
  ]);
}

export function encryptSecret(secret: string, encryptionKey = getRequiredEncryptionKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptSecret(encryptedSecret: string, encryptionKey = getRequiredEncryptionKey()): string {
  const [version, ivText, authTagText, encryptedText] = encryptedSecret.split(":");
  if (version !== "v1" || !ivText || !authTagText || !encryptedText) {
    throw new Error("Unsupported encrypted secret format");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function getRequiredEncryptionKey(): Buffer {
  const result = getEncryptionKey(process.env.ENCRYPTION_KEY);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.key;
}

export type EncryptionSelfCheckResult = {
  ok: boolean;
  roundTripOk: boolean;
  sampleChecked: boolean;
  sampleOk: boolean;
  message: string;
};

/**
 * Verify that secret encryption actually works with the current ENCRYPTION_KEY.
 *
 * getEncryptionKey only checks that the key is non-empty, so a wrong/changed key
 * still "succeeds" and the mismatch only surfaces later as a per-connection
 * decrypt_failed in the gateway. This runs at startup to catch that early:
 *   1. round-trip: encrypt a probe and decrypt it back (proves the cipher chain
 *      and key derivation work at all);
 *   2. sample: decrypt one real stored upstream password (proves the current key
 *      matches the key used at import time). Skipped when no upstreams exist.
 * It never throws and never writes data, so the caller can decide whether to
 * warn or fail-fast.
 */
export async function verifyEncryptionSelfCheck(
  encryptionKey = process.env.ENCRYPTION_KEY
): Promise<EncryptionSelfCheckResult> {
  const keyResult = getEncryptionKey(encryptionKey);
  if (!keyResult.ok) {
    return {
      ok: false,
      roundTripOk: false,
      sampleChecked: false,
      sampleOk: false,
      message: keyResult.error
    };
  }

  const probe = `selfcheck-${randomBytes(8).toString("hex")}`;
  try {
    const decrypted = decryptSecret(encryptSecret(probe, keyResult.key), keyResult.key);
    if (decrypted !== probe) {
      return {
        ok: false,
        roundTripOk: false,
        sampleChecked: false,
        sampleOk: false,
        message: "Encryption round-trip self-check failed: decrypted value did not match the original probe."
      };
    }
  } catch (error) {
    return {
      ok: false,
      roundTripOk: false,
      sampleChecked: false,
      sampleOk: false,
      message: `Encryption round-trip self-check threw: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }

  // Sample one real stored secret to confirm the key matches what was used at import.
  const sample = await prisma.upstreamProxy.findFirst({
    where: { passwordEncrypted: { not: "" } },
    select: { id: true, passwordEncrypted: true }
  });

  if (!sample) {
    return {
      ok: true,
      roundTripOk: true,
      sampleChecked: false,
      sampleOk: false,
      message: "Encryption round-trip OK. No stored upstream secrets to sample yet."
    };
  }

  try {
    decryptSecret(sample.passwordEncrypted, keyResult.key);
  } catch {
    return {
      ok: false,
      roundTripOk: true,
      sampleChecked: true,
      sampleOk: false,
      message:
        "Encryption round-trip OK, but decrypting a stored upstream password failed. ENCRYPTION_KEY likely does not match the key used during import."
    };
  }

  return {
    ok: true,
    roundTripOk: true,
    sampleChecked: true,
    sampleOk: true,
    message: "Encryption self-check passed: round-trip OK and a stored upstream secret decrypted successfully."
  };
}

function getEncryptionKey(rawKey: string | undefined): { ok: true; key: Buffer } | { ok: false; error: string } {
  if (!rawKey?.trim()) {
    return { ok: false, error: "ENCRYPTION_KEY is required to import upstream proxies" };
  }

  return { ok: true, key: createHash("sha256").update(rawKey).digest() };
}

// Real-time geo re-check for static-class single extraction (drift defense,
// "plan A"). After binding, detect the bound upstream's live exit region; if it
// drifted from the user's pinned region (or the bound region), re-roll to another
// upstream (regenerate) and re-check, up to maxAttempts. Network I/O lives HERE,
// outside the bind transaction. Caller only invokes this for static-class grades.
export async function verifyAndStabilizeEntryGeo(
  entryId: number,
  userId: number,
  options: { grade?: string | null; maxAttempts?: number; encryptionKey?: string } = {}
): Promise<{ verified: boolean; attempts: number; rerolled: number }> {
  // Only static-class grades are geo-promised; dynamic / proxy-flagged skip the
  // (slow, ~2.5s) re-check entirely so the caller can pass any grade safely.
  if (!isStaticExtractGrade(options.grade)) {
    return { verified: true, attempts: 0, rerolled: 0 };
  }
  const maxAttempts = options.maxAttempts && options.maxAttempts > 0 ? options.maxAttempts : 3;
  let rerolled = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const entry = await prisma.proxyEntry.findUnique({
      where: { id: entryId },
      select: { id: true, currentUpstreamId: true, targetRegion: true, currentRegion: true }
    });
    if (!entry || entry.currentUpstreamId == null) {
      return { verified: false, attempts: attempt, rerolled };
    }

    const scan = await scanUpstreamProxyOnce(entry.currentUpstreamId, {
      encryptionKey: options.encryptionKey
    });

    // Detection failed: cannot confirm geo. Try a different upstream once more.
    if (!scan.success) {
      const re = await regenerateProxyEntryUpstream(entryId, userId);
      if (!re.ok) return { verified: false, attempts: attempt, rerolled };
      rerolled += 1;
      continue;
    }

    const expected = entry.targetRegion ?? entry.currentRegion;
    if (!isRegionDrift(scan.region, expected)) {
      return { verified: true, attempts: attempt, rerolled };
    }

    // Drifted: re-roll to a different upstream and verify again next loop.
    const re = await regenerateProxyEntryUpstream(entryId, userId);
    if (!re.ok) return { verified: false, attempts: attempt, rerolled };
    rerolled += 1;
  }

  return { verified: false, attempts: maxAttempts, rerolled };
}

// Username prefix per extraction grade, so the proxy account itself shows which
// grade it came from (residential vs datacenter + stability tier). Legacy entries
// without a grade keep the original "resi" prefix.
function gradeUsernamePrefix(grade: string | null | undefined): string {
  switch (grade) {
    case "resi_premium":
      return "resi-premium";
    case "resi_normal":
      return "resi-standard";
    case "resi_dynamic":
      return "resi-dynamic";
    case "proxy_flagged":
      return "resi-flagged";
    case "dc_static":
      return "dc-static";
    case "dc_dynamic":
      return "dc-dynamic";
    default:
      return "resi";
  }
}

function buildProxyEntryUsername(input: {
  userId: number;
  entryId: number;
  country: SupportedCountry;
  region: string | null;
  city: string | null;
  grade?: string | null;
}): string {
  const region = input.region || "any";
  const city = input.city || "any";
  const entryId = input.entryId.toString().padStart(3, "0");
  return `${gradeUsernamePrefix(input.grade)}-${input.country}-${region}-${city}-u${input.userId}-p${entryId}-${randomToken(6)}`;
}

function randomToken(length: number): string {
  return randomBytes(Math.ceil(length * 0.75))
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(0, length);
}

// Parse a JSON string column expected to hold an array of strings (e.g. the
// per-user source-IP allowlist). Returns [] on null/invalid JSON or non-array,
// keeping only string items, so a corrupt value never throws on the hot path.
function parseStringArrayJson(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
