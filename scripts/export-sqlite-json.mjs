// Node20-compatible data export: dump every table from the CURRENT Prisma client
// (generated for SQLite) into a single JSON file. Run this BEFORE switching the
// datasource provider to postgresql, while the Prisma client still targets SQLite.
//
// Why this exists: scripts/migrate-sqlite-to-postgres.mjs imports `node:sqlite`,
// which only exists on Node >= 22. Production VPS runs Node 20, so we read through
// Prisma instead (no native sqlite dependency) and pair this with import-json-pg.mjs.
//
// Usage (provider must still be sqlite):
//   DATABASE_URL=file:/opt/proxy-platform/data/proxy-platform.db \
//   DUMP_FILE=/root/migrate-dump.json \
//   node scripts/export-sqlite-json.mjs
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const outFile = process.env.DUMP_FILE ?? "/root/migrate-dump.json";

// BigInt is not JSON-serialisable; wrap it so import-json-pg.mjs can rebuild it.
function replacer(_key, value) {
  return typeof value === "bigint" ? { __bigint: value.toString() } : value;
}

async function run() {
  const data = {
    users: await prisma.user.findMany(),
    upstreamProxies: await prisma.upstreamProxy.findMany(),
    proxyEntries: await prisma.proxyEntry.findMany(),
    trafficDaily: await prisma.trafficDaily.findMany(),
    scanLogs: await prisma.scanLog.findMany(),
    operationLogs: await prisma.operationLog.findMany(),
    ipGeoCache: await prisma.ipGeoCache.findMany()
  };

  writeFileSync(outFile, JSON.stringify(data, replacer));
  for (const [table, rows] of Object.entries(data)) {
    console.log(`${table}: ${rows.length}`);
  }
  console.log(`EXPORT_DONE ${outFile}`);
}

run()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(`Export failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
