// Database backup, provider-aware.
//
// SQLite (default): consistent snapshot via VACUUM INTO using Node's built-in
// sqlite. Reads the source DB (never modifies it) and writes a single
// fully-checkpointed file that folds in any -wal/-shm content. Safe on a live DB
// in WAL mode. Invoked by scripts/backup-db.ps1.
//   Usage: node scripts/backup-db.mjs <sourceDb> <targetSnapshot>
//
// PostgreSQL: when DATABASE_URL points at Postgres, this shells out to pg_dump
// (must be on PATH) using that URL and writes a .sql dump to the target path.
//   Usage: DATABASE_URL=postgresql://... node scripts/backup-db.mjs <targetDump>
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";

function isPostgresUrl(url) {
  const u = (url ?? "").trim().toLowerCase();
  return u.startsWith("postgres://") || u.startsWith("postgresql://");
}

const args = process.argv.slice(2);

if (isPostgresUrl(process.env.DATABASE_URL)) {
  // Postgres mode: single target path argument; connection comes from DATABASE_URL.
  const dest = args[0];
  if (!dest) {
    console.error("Usage (postgres): DATABASE_URL=postgresql://... node scripts/backup-db.mjs <targetDump.sql>");
    process.exit(2);
  }
  const result = spawnSync("pg_dump", ["--no-owner", "--no-privileges", "--file", dest, process.env.DATABASE_URL], {
    stdio: "inherit"
  });
  if (result.error) {
    console.error(`pg_dump failed to start (is it on PATH?): ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`pg_dump exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
  console.log("OK");
} else {
  // SQLite mode: source + target paths.
  const [src, dest] = args;
  if (!src || !dest) {
    console.error("Usage (sqlite): node scripts/backup-db.mjs <sourceDb> <targetSnapshot>");
    process.exit(2);
  }
  const db = new DatabaseSync(src);
  try {
    // Single-quotes inside the path must be doubled for SQL string literals.
    db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
  console.log("OK");
}
