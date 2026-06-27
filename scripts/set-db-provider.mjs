// Pick the Prisma datasource provider from the DATABASE_PROVIDER env var and
// rewrite the `provider = "..."` line in packages/db/prisma/schema.prisma in
// place. Prisma 5 cannot read the provider from an env var at runtime, so the
// provider must be chosen at build/deploy time; this is the standard way to keep
// one codebase that can target either SQLite (default, simple/local) or
// PostgreSQL (for higher concurrency on a VPS).
//
// Usage:
//   DATABASE_PROVIDER=postgresql node scripts/set-db-provider.mjs
//   node scripts/set-db-provider.mjs            # defaults to sqlite
//
// Run this BEFORE `prisma generate` / `prisma db push`. The db package's
// prisma:* scripts do this automatically.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SUPPORTED = new Set(["sqlite", "postgresql"]);

const raw = (process.env.DATABASE_PROVIDER ?? "sqlite").trim().toLowerCase();
// Accept a few friendly aliases.
const provider = raw === "postgres" || raw === "pg" ? "postgresql" : raw;

if (!SUPPORTED.has(provider)) {
  console.error(`Unsupported DATABASE_PROVIDER='${raw}'. Use 'sqlite' or 'postgresql'.`);
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "..", "packages", "db", "prisma", "schema.prisma");

const schema = readFileSync(schemaPath, "utf8");
const providerLine = /provider\s*=\s*"(sqlite|postgresql)"/;
if (!providerLine.test(schema)) {
  console.error(`Could not find a datasource provider line in ${schemaPath}`);
  process.exit(1);
}

const current = schema.match(providerLine)?.[1];
if (current === provider) {
  console.log(`Prisma datasource provider already '${provider}'.`);
  process.exit(0);
}

const updated = schema.replace(providerLine, `provider = "${provider}"`);
writeFileSync(schemaPath, updated, "utf8");
console.log(`Prisma datasource provider set to '${provider}' (was '${current}').`);
