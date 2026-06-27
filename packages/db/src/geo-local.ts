import { open, type Reader, type CityResponse, type AsnResponse } from "maxmind";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { resolveDataDir } from "@proxy-platform/shared";

// A single exit-IP resolved entirely from local MaxMind .mmdb files. Fields are
// kept RAW (country is the 2-letter ISO code, region/city are the provider's
// English names) — normalization (normalizeCountry/Region/City) is applied by the
// caller in packages/db so this module stays dependency-light and synchronous.
export type LocalGeoResult = {
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
  asn: string | null;
  // Local data can only reliably say "hosting" (datacenter) or "unknown". It
  // never claims "residential" — that softer signal stays with the online
  // providers (ip-api) so we never wrongly mark a datacenter exit as residential.
  ipType: "hosting" | "unknown";
};

let cityReader: Reader<CityResponse> | null = null;
let asnReader: Reader<AsnResponse> | null = null;
let loaded = false;
let available = false;

function dbPath(file: string): string {
  const dir = process.env.GEOIP_DB_DIR?.trim() || resolve(resolveDataDir(), "geoip");
  return resolve(dir, file);
}

/**
 * Load the local geo databases once. Idempotent: subsequent calls return the
 * cached availability. Never throws — a missing/unreadable database simply leaves
 * the module "unavailable" so callers fall back to the online geo providers.
 */
export async function initLocalGeo(): Promise<{ ok: boolean; message: string }> {
  if (loaded) {
    return { ok: available, message: available ? "loaded" : "disabled" };
  }
  loaded = true;

  if (process.env.GEOIP_ENABLED?.trim().toLowerCase() === "false") {
    return { ok: false, message: "GEOIP_ENABLED=false" };
  }

  const cityPath = dbPath(process.env.GEOIP_CITY_DB?.trim() || "GeoLite2-City.mmdb");
  const asnPath = dbPath(process.env.GEOIP_ASN_DB?.trim() || "GeoLite2-ASN.mmdb");

  if (!existsSync(cityPath)) {
    return { ok: false, message: `local geo disabled: city database not found at ${cityPath}` };
  }

  try {
    cityReader = await open<CityResponse>(cityPath);
    // ASN database is optional: without it we still get country/region/city, just
    // no ISP/ASN and a weaker hosting signal.
    if (existsSync(asnPath)) {
      asnReader = await open<AsnResponse>(asnPath);
    }
    available = true;
    return { ok: true, message: asnReader ? "loaded city+asn" : "loaded city (no asn)" };
  } catch (error) {
    cityReader = null;
    asnReader = null;
    available = false;
    return { ok: false, message: `local geo failed to load: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}

export function isLocalGeoAvailable(): boolean {
  return available;
}

// Known datacenter/cloud autonomous systems. Not exhaustive — a fast first cut so
// obvious hosting exits are caught even before the org-name heuristic runs.
const HOSTING_ASNS = new Set<number>([
  16509, // Amazon AWS
  14618, // Amazon AWS
  15169, // Google
  396982, // Google Cloud
  8075, // Microsoft / Azure
  37963, // Alibaba
  45102, // Alibaba
  132203, // Tencent
  16276, // OVH
  14061, // DigitalOcean
  24940, // Hetzner
  63949, // Akamai/Linode
  20473, // Vultr/Choopa
  51167, // Contabo
  13335 // Cloudflare
]);

const HOSTING_RE =
  /(hosting|datacenter|data center|cloud|server|vps|colo|amazon|aws|google|microsoft|azure|alibaba|tencent|ovh|digitalocean|hetzner|linode|leaseweb|contabo|vultr|akamai|cloudflare|m247|choopa)/i;

/**
 * Classify an exit IP as a datacenter ("hosting") or "unknown" from its ASN
 * number and/or organization name. Conservative: only returns "hosting" on a
 * clear signal, otherwise "unknown" (fail-open, never guesses "residential").
 */
export function classifyHostingFromAsn(
  asnNumber?: number | null,
  org?: string | null
): "hosting" | "unknown" {
  if (asnNumber && HOSTING_ASNS.has(asnNumber)) return "hosting";
  if (org && HOSTING_RE.test(org)) return "hosting";
  return "unknown";
}

/**
 * Resolve an IP entirely from the local databases. Returns null when local geo
 * is unavailable or the IP is not in the city database, so the caller can fall
 * back to the online providers. Never throws.
 */
export function lookupLocalGeo(ip: string): LocalGeoResult | null {
  if (!available || !cityReader) return null;

  let city: CityResponse | null;
  try {
    city = cityReader.get(ip);
  } catch {
    return null;
  }
  if (!city) return null;

  let asnNumber: number | null = null;
  let org: string | null = null;
  if (asnReader) {
    try {
      const asn = asnReader.get(ip);
      asnNumber = asn?.autonomous_system_number ?? null;
      org = asn?.autonomous_system_organization ?? null;
    } catch {
      asnNumber = null;
      org = null;
    }
  }

  // Prefer explicit traits when a paid GeoIP2 database supplies them; otherwise
  // fall back to the ASN/org heuristic. GeoLite2 City has no traits, so this is a
  // no-op there and the heuristic decides.
  const traits = city.traits;
  let ipType: "hosting" | "unknown";
  if (traits?.is_hosting_provider === true) {
    ipType = "hosting";
  } else {
    ipType = classifyHostingFromAsn(asnNumber, org);
  }

  return {
    country: city.country?.iso_code?.toLowerCase() ?? null,
    region: city.subdivisions?.[0]?.names?.en ?? null,
    city: city.city?.names?.en ?? null,
    isp: org,
    asn: asnNumber ? `AS${asnNumber}` : null,
    ipType
  };
}
