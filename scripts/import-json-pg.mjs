// Node20-compatible data import: load the JSON produced by export-sqlite-json.mjs
// into a freshly-created (empty) PostgreSQL database. Run this AFTER:
//   1. switching the datasource provider to postgresql,
//   2. `prisma generate` + `prisma db push` against the empty Postgres DB.
//
// It mirrors scripts/migrate-sqlite-to-postgres.mjs: preserves primary-key ids,
// inserts parents before children, defers the self-referential
// upstreamProxy.lockedByEntryId link until proxy entries exist, and resets the
// Postgres identity sequences so future inserts do not collide. Run ONCE against
// an empty Postgres only (not idempotent).
//
// Usage:
//   DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/proxy_platform \
//   DUMP_FILE=/root/migrate-dump.json \
//   node scripts/import-json-pg.mjs
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dumpFile = process.env.DUMP_FILE ?? "/root/migrate-dump.json";

// Rebuild BigInt values wrapped by export-sqlite-json.mjs.
function reviver(_key, value) {
  return value && typeof value === "object" && typeof value.__bigint === "string"
    ? BigInt(value.__bigint)
    : value;
}

async function insert(delegate, rows) {
  if (!rows || rows.length === 0) {
    console.log(`${delegate}: 0 rows`);
    return;
  }
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
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${table}', '${idColumn}'), COALESCE((SELECT MAX(${idColumn}) FROM ${table}), 1), true)`
  );
}

async function run() {
  const data = JSON.parse(readFileSync(dumpFile, "utf8"), reviver);

  // Defer the self-referential lock link (upstream -> proxy entry) so the FK is
  // satisfiable: clear it on insert, restore after proxy entries are present.
  const lockedLinks = [];
  for (const upstream of data.upstreamProxies ?? []) {
    if (upstream.lockedByEntryId !== null && upstream.lockedByEntryId !== undefined) {
      lockedLinks.push({ id: upstream.id, lockedByEntryId: upstream.lockedByEntryId });
      upstream.lockedByEntryId = null;
    }
  }

  await insert("user", data.users);
  await insert("upstreamProxy", data.upstreamProxies);
  await insert("proxyEntry", data.proxyEntries);

  for (const link of lockedLinks) {
    await prisma.upstreamProxy.update({
      where: { id: link.id },
      data: { lockedByEntryId: link.lockedByEntryId }
    });
  }
  console.log(`locked upstream links: ${lockedLinks.length} rows`);

  await insert("trafficDaily", data.trafficDaily);
  await insert("scanLog", data.scanLogs);
  await insert("operationLog", data.operationLogs);
  await insert("ipGeoCache", data.ipGeoCache);

  for (const [table, column] of [
    ["users", "id"],
    ["upstream_proxies", "id"],
    ["proxy_entries", "id"],
    ["traffic_daily", "id"],
    ["scan_logs", "id"],
    ["operation_logs", "id"]
  ]) {
    await resetSequence(table, column);
  }

  console.log("IMPORT_DONE");
}

run()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(`Import failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
