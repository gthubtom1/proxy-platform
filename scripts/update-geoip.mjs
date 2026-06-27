// Download / refresh the local MaxMind GeoLite2 databases used for fast, offline,
// rate-limit-free IP -> city / ASN lookups during upstream scanning.
//
// Usage:
//   MAXMIND_LICENSE_KEY=your_key node scripts/update-geoip.mjs
//
// Optional env:
//   GEOIP_DB_DIR   target directory (default: <repo>/data/geoip)
//   GEOIP_CITY_DB  city db filename (default: GeoLite2-City.mmdb)
//   GEOIP_ASN_DB   asn  db filename (default: GeoLite2-ASN.mmdb)
//
// Get a free license key at https://www.maxmind.com/en/geolite2/signup
// Schedule this (e.g. weekly cron) so the data stays current.
//
// Requires: Node 20+ (global fetch) and the `tar` command on PATH
// (bundled with Windows 10+ and standard on Linux/macOS).
import { mkdir, writeFile, rename, rm, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const licenseKey = process.env.MAXMIND_LICENSE_KEY?.trim();
if (!licenseKey) {
  console.error(
    [
      "MAXMIND_LICENSE_KEY is required.",
      "",
      "1) Sign up (free): https://www.maxmind.com/en/geolite2/signup",
      "2) Create a license key in your MaxMind account.",
      "3) Run: MAXMIND_LICENSE_KEY=your_key node scripts/update-geoip.mjs",
      "   (PowerShell: $env:MAXMIND_LICENSE_KEY='your_key'; node scripts/update-geoip.mjs )"
    ].join("\n")
  );
  process.exit(2);
}

const targetDir = process.env.GEOIP_DB_DIR?.trim() || resolve(repoRoot, "data", "geoip");
const cityFile = process.env.GEOIP_CITY_DB?.trim() || "GeoLite2-City.mmdb";
const asnFile = process.env.GEOIP_ASN_DB?.trim() || "GeoLite2-ASN.mmdb";

const EDITIONS = [
  { editionId: "GeoLite2-City", outFile: cityFile },
  { editionId: "GeoLite2-ASN", outFile: asnFile }
];

function downloadUrl(editionId) {
  const params = new URLSearchParams({
    edition_id: editionId,
    license_key: licenseKey,
    suffix: "tar.gz"
  });
  return `https://download.maxmind.com/app/geoip_download?${params.toString()}`;
}

// Recursively find the first *.mmdb under a directory.
async function findMmdb(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findMmdb(full);
      if (found) return found;
    } else if (entry.name.endsWith(".mmdb")) {
      return full;
    }
  }
  return null;
}

async function updateEdition({ editionId, outFile }) {
  console.log(`Downloading ${editionId} ...`);
  const response = await fetch(downloadUrl(editionId));
  if (!response.ok) {
    const body = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(
      `${editionId}: download failed HTTP ${response.status}` +
        (response.status === 401 ? " (check MAXMIND_LICENSE_KEY)" : "") +
        (body ? ` - ${body}` : "")
    );
  }

  const tmpTar = resolve(targetDir, `.tmp-${editionId}.tar.gz`);
  const tmpExtract = resolve(targetDir, `.tmp-extract-${editionId}`);
  await rm(tmpTar, { force: true });
  await rm(tmpExtract, { recursive: true, force: true });

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(tmpTar, buffer);

  await mkdir(tmpExtract, { recursive: true });
  const result = spawnSync("tar", ["-xzf", tmpTar, "-C", tmpExtract], { stdio: "inherit" });
  if (result.error) {
    throw new Error(`tar failed to start (is it on PATH?): ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`tar exited with code ${result.status} extracting ${editionId}`);
  }

  const mmdb = await findMmdb(tmpExtract);
  if (!mmdb) {
    throw new Error(`${editionId}: no .mmdb found in the downloaded archive`);
  }

  const dest = resolve(targetDir, outFile);
  // Move into place. rename can fail across devices/temp dirs are siblings here,
  // so a plain rename within the same targetDir is safe and atomic enough.
  await rm(dest, { force: true });
  await rename(mmdb, dest);

  await rm(tmpTar, { force: true });
  await rm(tmpExtract, { recursive: true, force: true });

  const info = await stat(dest);
  const sizeMb = (info.size / (1024 * 1024)).toFixed(1);
  console.log(`  -> ${dest} (${sizeMb} MB)`);
}

try {
  await mkdir(targetDir, { recursive: true });
  for (const edition of EDITIONS) {
    await updateEdition(edition);
  }
  console.log(`\nGeoIP databases updated in ${targetDir}`);
} catch (error) {
  console.error(`\nGeoIP update failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
