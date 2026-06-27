// One-off data migration: copy every row from an existing SQLite database into a
// freshly-created PostgreSQL database (schema already applied via
// `DATABASE_PROVIDER=postgresql npm run prisma:push`). Run this ONCE on the VPS
// after standing up Postgres, before switching the services over.
//
// Prerequisites:
//   1. Postgres is running and empty (tables created by prisma db push).
//   2. The Prisma client was generated for Postgres:
//        DATABASE_PROVIDER=postgresql npm run prisma:generate -w @proxy-platform/db
//        DATABASE_PROVIDER=postgresql DATABASE_URL=postgresql://... npm run prisma:push -w @proxy-platform/db
//   3. Run this with BOTH urls:
//        SQLITE_URL=file:/opt/proxy-platform/data/proxy-platform.db \
//        DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/proxy \
//        node scripts/migrate-sqlite-to-postgres.mjs
//
// It preserves primary-key ids, copies tables in FK-safe order, and resets the
// Postgres identity sequences so future inserts do not collide. Idempotency is
// NOT guaranteed: run against an empty Postgres only.
import { DatabaseSync } from "node:sqlite";

const sqliteUrl = process.env.SQLITE_URL ?? "";
const pgUrl = process.env.DATABASE_URL ?? "";

if (!sqliteUrl.startsWith("file:")) {
  console.error("SQLITE_URL must be a file: URL pointing at the source SQLite DB.");
  process.exit(2);
}
if (!(pgUrl.startsWith("postgres://") || pgUrl.startsWith("postgresql://"))) {
  console.error("DATABASE_URL must be a postgres:// URL pointing at the target Postgres DB.");
  process.exit(2);
}

const sqlitePath = sqliteUrl.replace(/^file:/, "");
const src = new DatabaseSync(sqlitePath, { readOnly: true });

// Import the Prisma client AFTER confirming env; it binds to DATABASE_URL (pg).
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

// Tables in dependency order (parents before children) for FK safety. Each entry
// maps the SQLite table name to the Prisma delegate and a row transformer that
// fixes up types SQLite stores loosely (ints for booleans, ms/ISO for dates,
// text for BigInt).
const BIGINT_FIELDS = new Set([
  "trafficQuotaBytes",
  "trafficUsedBytes",
  "trafficQuotaHostingBytes",
  "trafficUsedHostingBytes",
  "bytesUp",
  "bytesDown",
  "totalBytes"
]);

function toBool(v) {
  return v === 1 || v === true || v === "1" || v === "true";
}
function toDateOrNull(v) {
  if (v === null || v === undefined) return null;
  const d = new Date(typeof v === "number" ? v : String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}
function toBigIntOrZero(v) {
  if (v === null || v === undefined || v === "") return 0n;
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
}

// Generic row reader from SQLite.
function readAll(table) {
  return src.prepare(`SELECT * FROM ${table}`).all();
}

// Convert a raw SQLite row (snake_case columns) to a Prisma create object.
// Because Prisma maps camelCase fields to snake_case columns, we read the DB
// column names and let Prisma's createMany take the mapped field names. Simplest
// robust path: use $executeRaw is avoided; instead we map known columns per table.

async function run() {
  // USERS
  const users = readAll("users").map((r) => ({
    id: r.id,
    username: r.username,
    passwordHash: r.password_hash,
    role: r.role,
    status: r.status,
    trafficQuotaBytes: toBigIntOrZero(r.traffic_quota_bytes),
    trafficUsedBytes: toBigIntOrZero(r.traffic_used_bytes),
    // Hosting bucket columns may be absent in pre-split SQLite dumps; default 0.
    trafficQuotaHostingBytes: toBigIntOrZero(r.traffic_quota_hosting_bytes),
    trafficUsedHostingBytes: toBigIntOrZero(r.traffic_used_hosting_bytes),
    allowedCountriesJson: r.allowed_countries_json,
    allowedSourceIpsJson: r.allowed_source_ips_json ?? "[]",
    maxProxyEntries: r.max_proxy_entries,
    maxConcurrentConnections: r.max_concurrent_connections,
    createdAt: toDateOrNull(r.created_at) ?? new Date(),
    updatedAt: toDateOrNull(r.updated_at) ?? new Date(),
    quotaResetAt: toDateOrNull(r.quota_reset_at)
  }));

  // UPSTREAM PROXIES
  // lockedByEntryId points to proxy_entries.id, so importing it before
  // proxy_entries exist can violate the FK. Import upstream rows with that link
  // cleared first, then restore it after proxy entries have been inserted.
  const lockedUpstreamLinks = [];
  const upstreams = readAll("upstream_proxies").map((r) => {
    if (r.locked_by_entry_id !== null && r.locked_by_entry_id !== undefined) {
      lockedUpstreamLinks.push({ id: r.id, lockedByEntryId: r.locked_by_entry_id });
    }
    return ({
      id: r.id,
      host: r.host,
      port: r.port,
      username: r.username,
      passwordEncrypted: r.password_encrypted,
      status: r.status,
      currentIp: r.current_ip,
      country: r.country,
      region: r.region,
      city: r.city,
      isp: r.isp,
      asn: r.asn,
      latencyMs: r.latency_ms,
      score: r.score,
      lockedByEntryId: null,
      failCount: r.fail_count,
      successCount: r.success_count,
      lastErrorType: r.last_error_type,
      lastCheckedAt: toDateOrNull(r.last_checked_at),
      lastChangedAt: toDateOrNull(r.last_changed_at),
      cooldownUntil: toDateOrNull(r.cooldown_until),
      createdAt: toDateOrNull(r.created_at) ?? new Date(),
      updatedAt: toDateOrNull(r.updated_at) ?? new Date()
    });
  });

  // PROXY ENTRIES
  const entries = readAll("proxy_entries").map((r) => ({
    id: r.id,
    userId: r.user_id,
    username: r.username,
    passwordHash: r.password_hash,
    targetCountry: r.target_country,
    targetRegion: r.target_region,
    targetCity: r.target_city,
    currentUpstreamId: r.current_upstream_id,
    currentIp: r.current_ip,
    currentCountry: r.current_country,
    currentRegion: r.current_region,
    currentCity: r.current_city,
    preferredExitIp: r.preferred_exit_ip,
    status: r.status,
    trafficUsedBytes: toBigIntOrZero(r.traffic_used_bytes),
    activeConnections: r.active_connections,
    lastUsedAt: toDateOrNull(r.last_used_at),
    lastCheckedAt: toDateOrNull(r.last_checked_at),
    expiresAt: toDateOrNull(r.expires_at),
    createdAt: toDateOrNull(r.created_at) ?? new Date(),
    updatedAt: toDateOrNull(r.updated_at) ?? new Date()
  }));

  const trafficDaily = readAll("traffic_daily").map((r) => ({
    id: r.id,
    userId: r.user_id,
    proxyEntryId: r.proxy_entry_id,
    date: r.date,
    bytesUp: toBigIntOrZero(r.bytes_up),
    bytesDown: toBigIntOrZero(r.bytes_down),
    totalBytes: toBigIntOrZero(r.total_bytes),
    connections: r.connections
  }));

  const scanLogs = readAll("scan_logs").map((r) => ({
    id: r.id,
    upstreamProxyId: r.upstream_proxy_id,
    success: toBool(r.success),
    exitIp: r.exit_ip,
    country: r.country,
    region: r.region,
    city: r.city,
    latencyMs: r.latency_ms,
    errorType: r.error_type,
    message: r.message,
    createdAt: toDateOrNull(r.created_at) ?? new Date()
  }));

  const operationLogs = readAll("operation_logs").map((r) => ({
    id: r.id,
    actorUserId: r.actor_user_id,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    detailJson: r.detail_json,
    createdAt: toDateOrNull(r.created_at) ?? new Date()
  }));

  const ipGeoCache = readAll("ip_geo_cache").map((r) => ({
    ip: r.ip,
    country: r.country,
    region: r.region,
    city: r.city,
    isp: r.isp,
    asn: r.asn,
    provider: r.provider,
    createdAt: toDateOrNull(r.created_at) ?? new Date(),
    updatedAt: toDateOrNull(r.updated_at) ?? new Date()
  }));

  void BIGINT_FIELDS;

  // Insert parents first. createMany keeps the provided ids.
  await insert("user", users);
  await insert("upstreamProxy", upstreams);
  await insert("proxyEntry", entries);
  await restoreLockedUpstreamLinks(lockedUpstreamLinks);
  await insert("trafficDaily", trafficDaily);
  await insert("scanLog", scanLogs);
  await insert("operationLog", operationLogs);
  await insert("ipGeoCache", ipGeoCache);

  // Reset identity sequences so the next auto-increment id does not collide with
  // the ids we just copied. ipGeoCache has a text PK (ip), so it has no sequence.
  await resetSequence("users", "id");
  await resetSequence("upstream_proxies", "id");
  await resetSequence("proxy_entries", "id");
  await resetSequence("traffic_daily", "id");
  await resetSequence("scan_logs", "id");
  await resetSequence("operation_logs", "id");

  console.log("Data migration complete.");
}

async function insert(delegate, rows) {
  if (rows.length === 0) {
    console.log(`${delegate}: 0 rows`);
    return;
  }
  // createMany is one round-trip per chunk; chunk to stay well under param limits.
  const chunkSize = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma[delegate].createMany({ data: chunk });
    done += chunk.length;
  }
  console.log(`${delegate}: ${done} rows`);
}

async function resetSequence(table, idColumn) {
  // Postgres: align the identity sequence with the current max id.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${table}', '${idColumn}'), COALESCE((SELECT MAX(${idColumn}) FROM ${table}), 1), true)`
  );
}

async function restoreLockedUpstreamLinks(links) {
  if (links.length === 0) {
    console.log("locked upstream links: 0 rows");
    return;
  }
  for (const link of links) {
    await prisma.upstreamProxy.update({
      where: { id: link.id },
      data: { lockedByEntryId: link.lockedByEntryId }
    });
  }
  console.log(`locked upstream links: ${links.length} rows`);
}

run()
  .then(() => prisma.$disconnect())
  .then(() => src.close())
  .catch(async (error) => {
    console.error(`Migration failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    await prisma.$disconnect().catch(() => {});
    src.close();
    process.exit(1);
  });
