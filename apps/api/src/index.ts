import express from "express";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  configureSqlite,
  createBoundProxyEntries,
  createBoundProxyEntry,
  verifyAndStabilizeEntryGeo,
  buildAvailableFreeUpstreamWhere,
  ensureIndexes,
  getDatabaseProvider,
  hashPassword,
  importUpstreamProxies,
  prisma,
  recordUpstreamScanResult,
  regenerateProxyEntryUpstream,
  scanUpstreamProxyOnce,
  verifyPassword
} from "@proxy-platform/db";
import {
  APP_SETTING_BOUNDS,
  createConcurrencyLimiter,
  DEFAULT_PROXY_GATEWAY_PORT,
  SUPPORTED_COUNTRIES,
  mapAdaptive,
  nowIso,
  parseUpstreamProxyText,
  readAppSettings,
  resolveDataDir,
  writeAppSettings,
  SlidingWindowRateLimiter,
  normalizeSourceIpEntry,
  type AppSettings
} from "@proxy-platform/shared";

// Exported so integration tests can drive the routes with supertest without
// opening a port. Importing this module still runs the DB init below (against
// whatever DATABASE_URL is set), but app.listen is guarded (see bottom) so tests
// set API_DISABLE_LISTEN=1 to skip binding the port.
export const app = express();
const port = Number(process.env.API_PORT ?? 3000);

// Cap concurrent per-extraction geo re-checks. verifyAndStabilizeEntryGeo does
// ~2.5s of network I/O plus up to 3 re-rolls each; a burst of simultaneous single
// extractions previously ran them all at once and spiked memory enough for pm2 to
// restart the API mid-burst. This queues the overflow so a burst is bounded rather
// than fanned out. Configurable via GEO_VERIFY_CONCURRENCY (default 4).
const geoVerifyLimiter = createConcurrencyLimiter(Number(process.env.GEO_VERIFY_CONCURRENCY ?? 4));

const databaseStatus = await configureSqlite();
if (databaseStatus.ok) {
  // Ensure hot-path indexes exist even if prisma db push was never run here.
  const indexResult = await ensureIndexes();
  if (!indexResult.ok) {
    console.warn(`API could not ensure database indexes: ${indexResult.error}`);
  }
}
const authSecret = resolveAuthSecret();
const DEFAULT_WEB_ORIGINS = "http://127.0.0.1:5180,http://127.0.0.1:5181";
const DEFAULT_PUBLIC_PROXY_HOST = "127.0.0.1";

// Auto-detect the public proxy endpoint (domain + TLS port) from the stunnel TLS
// front config, so the copy string follows the real HTTPS proxy domain and keeps
// working after the domain changes (new cert + stunnel conf) with no rebuild.
// Falls back to PUBLIC_PROXY_HOST / PROXY_GATEWAY_PORT env when stunnel is absent
// (e.g. local dev). Result is cached briefly so a domain change applies within a minute.
const STUNNEL_TLS_CONF = process.env.STUNNEL_TLS_CONF?.trim() || "/etc/stunnel/proxy-tls.conf";
const STUNNEL_CACHE_TTL_MS = 60_000;
let stunnelEndpointCache: { value: { host: string; port: number } | null; at: number } | null = null;

function detectStunnelEndpoint(): { host: string; port: number } | null {
  const now = Date.now();
  if (stunnelEndpointCache && now - stunnelEndpointCache.at < STUNNEL_CACHE_TTL_MS) {
    return stunnelEndpointCache.value;
  }
  let value: { host: string; port: number } | null = null;
  try {
    const conf = readFileSync(STUNNEL_TLS_CONF, "utf8");
    const certMatch = conf.match(/cert\s*=\s*\S*\/live\/([^/\s]+)\//i);
    const acceptMatch = conf.match(/accept\s*=\s*(?:[^\s:]+:)?(\d{2,5})\b/i);
    const host = certMatch?.[1]?.trim();
    const port = acceptMatch ? Number(acceptMatch[1]) : NaN;
    if (host && Number.isFinite(port) && port > 0) {
      value = { host, port };
    }
  } catch {
    value = null;
  }
  stunnelEndpointCache = { value, at: now };
  return value;
}

function resolvePublicProxyEndpoint(): { host: string; port: number } {
  const detected = detectStunnelEndpoint();
  if (detected) return detected;
  const host = process.env.PUBLIC_PROXY_HOST?.trim() || DEFAULT_PUBLIC_PROXY_HOST;
  const port = Number(
    process.env.PUBLIC_PROXY_PORT ?? process.env.PROXY_GATEWAY_PORT ?? DEFAULT_PROXY_GATEWAY_PORT
  );
  return { host, port };
}

type IpQuality = {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  proxy?: boolean;
  hosting?: boolean;
  mobile?: boolean;
};

export type IpInfo = {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  proxy: boolean | null;
  hosting: boolean | null;
  mobile: boolean | null;
};

// Look up exit-IP geo + timezone + quality flags via ip-api batch endpoint.
// Best-effort: a timeout or failure returns an empty map so extraction never blocks.
async function lookupIpQuality(ips: Array<string | null | undefined>): Promise<Record<string, IpQuality>> {
  const unique = [...new Set(ips.filter((ip): ip is string => typeof ip === "string" && ip.length > 0))];
  if (unique.length === 0) return {};
  const out: Record<string, IpQuality> = {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const body = unique
      .slice(0, 100)
      .map((q) => ({ query: q, fields: "status,country,regionName,city,timezone,proxy,hosting,mobile,query" }));
    const resp = await fetch("http://ip-api.com/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (resp.ok) {
      const data = (await resp.json()) as Array<Record<string, unknown>>;
      for (const item of data) {
        if (item && item.status === "success" && typeof item.query === "string") {
          out[item.query] = {
            country: typeof item.country === "string" ? item.country : undefined,
            region: typeof item.regionName === "string" ? item.regionName : undefined,
            city: typeof item.city === "string" ? item.city : undefined,
            timezone: typeof item.timezone === "string" ? item.timezone : undefined,
            proxy: typeof item.proxy === "boolean" ? item.proxy : undefined,
            hosting: typeof item.hosting === "boolean" ? item.hosting : undefined,
            mobile: typeof item.mobile === "boolean" ? item.mobile : undefined
          };
        }
      }
    }
  } catch {
    // timeout / network error -> empty map; callers fall back to stored geo
  } finally {
    clearTimeout(timer);
  }
  return out;
}

function mergeIpInfo(
  ip: string | null | undefined,
  quality: IpQuality | undefined,
  fallback?: { country?: string | null; region?: string | null; city?: string | null }
): IpInfo | null {
  if (!ip) return null;
  return {
    ip,
    country: quality?.country ?? fallback?.country ?? null,
    region: quality?.region ?? fallback?.region ?? null,
    city: quality?.city ?? fallback?.city ?? null,
    timezone: quality?.timezone ?? null,
    proxy: quality?.proxy ?? null,
    hosting: quality?.hosting ?? null,
    mobile: quality?.mobile ?? null
  };
}

function resolveAuthSecretPath(): string {
  // Co-locate the persisted auth secret with the DB via the shared resolver so
  // it lands in the same data dir regardless of the process working directory.
  return resolve(resolveDataDir(), "auth-secret.key");
}

/**
 * Resolve the HMAC secret used to sign auth tokens. Prefer APP_SECRET from the
 * environment. If it is missing, persist a generated secret to a file so that it
 * survives restarts — otherwise every restart would generate a fresh secret and
 * silently log out every admin and user.
 */
function resolveAuthSecret(): string {
  const fromEnv = process.env.APP_SECRET?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const secretPath = resolveAuthSecretPath();
  try {
    const persisted = readFileSync(secretPath, "utf8").trim();
    if (persisted) {
      console.warn(
        `APP_SECRET is not set; using the persisted secret at ${secretPath}. Set APP_SECRET in the environment for production.`
      );
      return persisted;
    }
  } catch {
    // No persisted secret yet; fall through to generate one.
  }

  const generated = randomBytes(32).toString("base64url");
  try {
    mkdirSync(dirname(secretPath), { recursive: true });
    writeFileSync(secretPath, `${generated}\n`, { encoding: "utf8", mode: 0o600 });
    console.warn(
      `APP_SECRET is not set; generated and saved a new secret to ${secretPath}. Set APP_SECRET in the environment for production.`
    );
  } catch (error) {
    console.warn(
      `APP_SECRET is not set and the generated secret could not be persisted (${error instanceof Error ? error.message : "unknown error"}); tokens will be invalidated on restart.`
    );
  }
  return generated;
}

function resolveAllowedWebOrigins(): string[] {
  const configured = process.env.WEB_ALLOWED_ORIGINS?.trim();
  if (configured) {
    return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
  }

  const origins = new Set<string>();
  for (const value of [process.env.ADMIN_WEB_ORIGIN, process.env.USER_WEB_ORIGIN, DEFAULT_WEB_ORIGINS]) {
    if (!value?.trim()) {
      continue;
    }

    for (const origin of value.split(",")) {
      const trimmed = origin.trim();
      if (trimmed) {
        origins.add(trimmed);
      }
    }
  }

  return [...origins];
}

const allowedWebOrigins = resolveAllowedWebOrigins();

type AuthRole = "admin" | "user";

type AuthenticatedUser = {
  id: number;
  username: string;
  role: AuthRole;
};

type AuthRequest = express.Request & {
  authUser?: AuthenticatedUser;
};

type AuthTokenPayload = {
  exp: number;
  role: AuthRole;
  userId: number;
  username: string;
  // Short fingerprint of the user's password hash at sign time. Lets us
  // invalidate old tokens after a password change without a DB schema column:
  // requireRole compares this against the live password hash on every request.
  pwd?: string;
};

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (typeof origin === "string" && allowedWebOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

await ensureInitialAdmin();

app.get("/api/health", (_req, res) => {
  res.status(databaseStatus.ok ? 200 : 503).json({
    ok: databaseStatus.ok,
    service: "api",
    database: databaseStatus,
    time: nowIso()
  });
});

app.post("/api/admin/login", async (req, res) => {
  await handleLogin(req, res, "admin");
});

app.post("/api/user/login", async (req, res) => {
  await handleLogin(req, res, "user");
});

// Unified login: one page authenticates either role; the frontend routes by the
// returned role. Old per-role endpoints stay for compatibility.
app.post("/api/login", async (req, res) => {
  await handleLogin(req, res, null);
});

// Role-agnostic identity check used by the unified shell to decide which UI to render on boot.
app.get("/api/me", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }
  const token = readBearerToken(req);
  const payload = token ? verifyAuthToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: "Please log in first" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true, role: true, status: true, passwordHash: true }
  });
  if (!user || user.status !== "active") {
    res.status(401).json({ error: "Please log in again" });
    return;
  }
  if (payload.pwd !== undefined && payload.pwd !== passwordFingerprint(user.passwordHash)) {
    res.status(401).json({ error: "Please log in again" });
    return;
  }
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

app.use("/api/admin", requireRole("admin"));
app.use("/api/user", requireRole("user"));

app.get("/api/admin/me", (req: AuthRequest, res) => {
  res.json({ user: req.authUser });
});

app.get("/api/admin/system-config", async (_req, res) => {
  const settings = await readAppSettings();
  const proxyEndpoint = resolvePublicProxyEndpoint();
  res.json({
    config: {
      gatewayHost: proxyEndpoint.host,
      gatewayPort: proxyEndpoint.port,
      supportedCountries: SUPPORTED_COUNTRIES.map((country) => country.toUpperCase()),
      scanBatchSize: settings.scanBatchSize,
      scanConcurrency: settings.scanConcurrency,
      scanTimeoutMs: settings.scanTimeoutMs,
      scanIntervalMs: settings.scanIntervalMs,
      geoCacheTtlMs: settings.geoCacheTtlMs,
      maxScanFailures: settings.maxScanFailures,
      cooldownMs: settings.cooldownMs,
      workerRepeat: process.env.WORKER_REPEAT === "true",
      backupStatus: "未接入"
    }
  });
});

app.get("/api/admin/app-settings", async (_req, res) => {
  const settings = await readAppSettings();
  res.json({ settings, bounds: APP_SETTING_BOUNDS });
});

app.patch("/api/admin/app-settings", async (req: AuthRequest, res) => {
  const body = req.body as Partial<Record<keyof AppSettings, unknown>> | undefined;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Request body is required" });
    return;
  }

  const allowedKeys = Object.keys(APP_SETTING_BOUNDS) as (keyof AppSettings)[];
  const patch: Partial<Record<keyof AppSettings, number>> = {};
  for (const key of allowedKeys) {
    const value = body[key];
    if (value === undefined || value === null) continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      res.status(400).json({ error: `Invalid value for ${key}` });
      return;
    }
    patch[key] = numeric;
  }

  const settings = await writeAppSettings(patch);

  await prisma.operationLog
    .create({
      data: {
        actorUserId: req.authUser?.id,
        action: "app_settings_update",
        targetType: "app_settings",
        targetId: "app_settings",
        detailJson: JSON.stringify(patch)
      }
    })
    .catch(() => undefined);

  res.json({ ok: true, settings });
});

app.get("/api/user/me", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.authUser?.id ?? 0 },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      trafficQuotaBytes: true,
      trafficUsedBytes: true,
      trafficQuotaHostingBytes: true,
      trafficUsedHostingBytes: true,
      allowedCountriesJson: true,
      allowedSourceIpsJson: true,
      maxProxyEntries: true,
      maxConcurrentConnections: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          proxyEntries: true
        }
      }
    }
  });

  if (!user) {
    res.status(404).json({ error: "User was not found" });
    return;
  }

  res.json({
    user: serializeUser(user)
  });
});

app.get("/api/user/dashboard", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const userId = req.authUser?.id ?? 0;
  const [user, entries, trafficRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        trafficQuotaBytes: true,
        trafficUsedBytes: true,
        trafficQuotaHostingBytes: true,
        trafficUsedHostingBytes: true,
        allowedCountriesJson: true,
        allowedSourceIpsJson: true,
        maxProxyEntries: true,
        maxConcurrentConnections: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            proxyEntries: true
          }
        }
      }
    }),
    prisma.proxyEntry.findMany({
      where: { userId },
      orderBy: { id: "desc" },
      take: 200,
      select: userProxyEntrySelect
    }),
    prisma.trafficDaily.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 500,
      select: userTrafficSelect
    })
  ]);

  if (!user) {
    res.status(404).json({ error: "User was not found" });
    return;
  }

  const proxyEndpoint = resolvePublicProxyEndpoint();
  res.json({
    user: serializeUser(user),
    entries: entries.map(serializeUserProxyEntry),
    rows: trafficRows.map(serializeTrafficRow),
    gateway: { host: proxyEndpoint.host, port: proxyEndpoint.port }
  });
});

app.get("/api/user/proxy-entries", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const entries = await prisma.proxyEntry.findMany({
    where: { userId: req.authUser?.id ?? 0 },
    orderBy: { id: "desc" },
    take: 200,
    select: userProxyEntrySelect
  });

  res.json({
    count: entries.length,
    entries: entries.map(serializeUserProxyEntry)
  });
});

app.post("/api/user/proxy-entries", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.authUser?.id ?? 0 },
    select: {
      allowedCountriesJson: true
    }
  });
  const targetCountry = typeof req.body?.targetCountry === "string" ? req.body.targetCountry.trim().toLowerCase() : "";
  const allowedCountries = parseAllowedCountries(user?.allowedCountriesJson);

  if (allowedCountries.length > 0 && !allowedCountries.includes(targetCountry)) {
    res.status(403).json({ error: "This country is not enabled for your account" });
    return;
  }

  const result = await createBoundProxyEntry({
    userId: req.authUser?.id,
    targetCountry,
    targetRegion: typeof req.body?.targetRegion === "string" ? req.body.targetRegion : undefined,
    targetCity: typeof req.body?.targetCity === "string" ? req.body.targetCity : undefined,
    targetIpType: typeof req.body?.ipType === "string" ? req.body.ipType : undefined,
    targetStabilityTier: typeof req.body?.stabilityTier === "string" ? req.body.stabilityTier : undefined,
    targetGrade: typeof req.body?.grade === "string" ? req.body.grade : undefined,
    proxyPassword: typeof req.body?.proxyPassword === "string" ? req.body.proxyPassword : undefined
  });

  if (!result.ok) {
    const statusByCode: Record<typeof result.code, number> = {
      invalid_country: 400,
      user_not_found: 404,
      user_inactive: 403,
      proxy_entry_limit_reached: 409,
      no_matching_upstream: 409,
      username_conflict: 409
    };
    res.status(statusByCode[result.code]).json(result);
    return;
  }

  // Plan A drift defense: static-class single extraction gets a real-time geo
  // re-check; on drift the bound upstream is re-rolled (up to 3x). Runs after the
  // bind transaction (network I/O). verifyAndStabilizeEntryGeo no-ops for non-
  // static grades. Refresh the response geo if a re-roll changed the upstream.
  if (req.authUser?.id) {
    const userId = req.authUser.id;
    const grade = typeof req.body?.grade === "string" ? req.body.grade : undefined;
    const verify = await geoVerifyLimiter(() =>
      verifyAndStabilizeEntryGeo(result.proxyEntry.id, userId, { grade })
    );
    if (verify.rerolled > 0) {
      const fresh = await prisma.proxyEntry.findUnique({
        where: { id: result.proxyEntry.id },
        select: { currentIp: true, currentCountry: true, currentRegion: true, currentCity: true }
      });
      if (fresh) {
        result.proxyEntry.currentIp = fresh.currentIp;
        result.proxyEntry.currentCountry = fresh.currentCountry;
        result.proxyEntry.currentRegion = fresh.currentRegion;
        result.proxyEntry.currentCity = fresh.currentCity;
      }
    }
  }

  const { host: gatewayHost, port: gatewayPort } = resolvePublicProxyEndpoint();

  const qualityMap = await lookupIpQuality([result.proxyEntry.currentIp]);
  const ipInfo = mergeIpInfo(
    result.proxyEntry.currentIp,
    result.proxyEntry.currentIp ? qualityMap[result.proxyEntry.currentIp] : undefined,
    {
      country: result.proxyEntry.currentCountry,
      region: result.proxyEntry.currentRegion,
      city: result.proxyEntry.currentCity
    }
  );

  await prisma.operationLog.create({
    data: {
      actorUserId: req.authUser?.id,
      action: "user_proxy_entry_create",
      targetType: "proxy_entry",
      targetId: String(result.proxyEntry.id),
      detailJson: JSON.stringify({
        username: result.user.username,
        proxyEntryUsername: result.proxyEntry.username,
        proxyEntryId: result.proxyEntry.id,
        targetCountry: result.proxyEntry.targetCountry,
        targetRegion: result.proxyEntry.targetRegion,
        targetCity: result.proxyEntry.targetCity,
        passwordSource: typeof req.body?.proxyPassword === "string" && req.body.proxyPassword.trim() ? "manual" : "generated"
      })
    }
  }).catch(() => undefined);

  res.status(201).json({
    ok: true,
    user: result.user,
    proxyEntry: result.proxyEntry,
    clientProxy: {
      proxyEntryId: result.proxyEntry.id,
      host: gatewayHost,
      port: gatewayPort,
      username: result.proxyEntry.username,
      password: result.proxyEntry.password,
      copyText: `${gatewayHost}:${gatewayPort}:${result.proxyEntry.username}:${result.proxyEntry.password}`,
      ipInfo,
      stableSince: result.upstream.stableSince ? result.upstream.stableSince.toISOString() : null
    }
  });
});

// Atomic batch extract: create N proxies in one all-or-nothing request so the
// user never ends up with a half-finished batch (the old client-side loop could
// stop midway). On failure nothing is created.
app.post("/api/user/proxy-entries/batch", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const count = typeof req.body?.count === "number" ? req.body.count : 0;
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    res.status(400).json({ error: "数量必须是 1-50 的整数" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.authUser?.id ?? 0 },
    select: { allowedCountriesJson: true }
  });
  const targetCountry = typeof req.body?.targetCountry === "string" ? req.body.targetCountry.trim().toLowerCase() : "";
  const allowedCountries = parseAllowedCountries(user?.allowedCountriesJson);

  if (allowedCountries.length > 0 && !allowedCountries.includes(targetCountry)) {
    res.status(403).json({ error: "This country is not enabled for your account" });
    return;
  }

  const result = await createBoundProxyEntries(count, {
    userId: req.authUser?.id,
    targetCountry,
    targetRegion: typeof req.body?.targetRegion === "string" ? req.body.targetRegion : undefined,
    targetCity: typeof req.body?.targetCity === "string" ? req.body.targetCity : undefined,
    targetIpType: typeof req.body?.ipType === "string" ? req.body.ipType : undefined,
    targetStabilityTier: typeof req.body?.stabilityTier === "string" ? req.body.stabilityTier : undefined,
    targetGrade: typeof req.body?.grade === "string" ? req.body.grade : undefined,
    proxyPassword: typeof req.body?.proxyPassword === "string" ? req.body.proxyPassword : undefined
  });

  if (!result.ok) {
    const statusByCode: Record<typeof result.code, number> = {
      invalid_country: 400,
      invalid_count: 400,
      user_not_found: 404,
      user_inactive: 403,
      proxy_entry_limit_reached: 409,
      not_enough_upstreams: 409
    };
    res.status(statusByCode[result.code]).json(result);
    return;
  }

  const { host: gatewayHost, port: gatewayPort } = resolvePublicProxyEndpoint();

  const qualityMap = await lookupIpQuality(result.entries.map((entry) => entry.currentIp));

  await prisma.operationLog
    .create({
      data: {
        actorUserId: req.authUser?.id,
        action: "user_proxy_entry_batch_create",
        targetType: "proxy_entry",
        targetId: "batch",
        detailJson: JSON.stringify({
          username: result.user.username,
          count: result.entries.length,
          targetCountry,
          passwordSource: typeof req.body?.proxyPassword === "string" && req.body.proxyPassword.trim() ? "manual" : "generated"
        })
      }
    })
    .catch(() => undefined);

  res.status(201).json({
    ok: true,
    user: result.user,
    count: result.entries.length,
    clientProxies: result.entries.map((entry) => ({
      proxyEntryId: entry.id,
      username: entry.username,
      password: entry.password,
      copyText: `${gatewayHost}:${gatewayPort}:${entry.username}:${entry.password}`,
      ipInfo: mergeIpInfo(entry.currentIp, entry.currentIp ? qualityMap[entry.currentIp] : undefined, {
        country: entry.targetCountry,
        region: entry.targetRegion,
        city: entry.targetCity
      }),
      stableSince: entry.stableSince ? entry.stableSince.toISOString() : null
    }))
  });
});

// Swap one proxy entry to a different exit IP without changing its credentials,
// so a user who lands on an undesirable (e.g. datacenter) IP can drop it and get
// another one. The already-copied client string stays valid; only the exit
// changes. Ownership is enforced in the DB layer (entry must belong to the user).
app.post("/api/user/proxy-entries/:id/regenerate", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Proxy entry id must be a positive number" });
    return;
  }

  const result = await regenerateProxyEntryUpstream(id, req.authUser?.id ?? 0);

  if (!result.ok) {
    const statusByCode: Record<typeof result.code, number> = {
      entry_not_found: 404,
      forbidden: 403,
      entry_inactive: 409,
      no_other_upstream: 409,
      regenerate_failed: 409
    };
    res.status(statusByCode[result.code]).json(result);
    return;
  }

  const qualityMap = await lookupIpQuality([result.proxyEntry.currentIp]);
  const ipInfo = mergeIpInfo(
    result.proxyEntry.currentIp,
    result.proxyEntry.currentIp ? qualityMap[result.proxyEntry.currentIp] : undefined,
    {
      country: result.proxyEntry.currentCountry,
      region: result.proxyEntry.currentRegion,
      city: result.proxyEntry.currentCity
    }
  );

  await prisma.operationLog
    .create({
      data: {
        actorUserId: req.authUser?.id,
        action: "user_proxy_entry_regenerate",
        targetType: "proxy_entry",
        targetId: String(id),
        detailJson: JSON.stringify({
          proxyEntryId: id,
          oldIp: result.proxyEntry.oldIp,
          newIp: result.proxyEntry.currentIp,
          newUpstreamId: result.proxyEntry.currentUpstreamId
        })
      }
    })
    .catch(() => undefined);

  res.json({
    ok: true,
    proxyEntryId: id,
    ipInfo,
    stableSince: result.proxyEntry.stableSince ? result.proxyEntry.stableSince.toISOString() : null
  });
});

app.get("/api/user/traffic", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const rows = await prisma.trafficDaily.findMany({
    where: { userId: req.authUser?.id ?? 0 },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 500,
    select: userTrafficSelect
  });

  res.json({
    count: rows.length,
    rows: rows.map(serializeTrafficRow)
  });
});

// Locations the ordinary user can actually pick: countries/regions/cities that
// currently have a free, scanned upstream within the user's allowed countries.
// Returns only geo labels (no host/port/credentials) so the proxy generation
// form can offer dropdowns instead of free text that silently fails to match.
app.get("/api/user/locations", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.authUser?.id ?? 0 },
    select: { allowedCountriesJson: true }
  });
  const allowedCountries = parseAllowedCountries(user?.allowedCountriesJson);

  const ipType = typeof req.query.ipType === "string" ? req.query.ipType : undefined;
  const stabilityTier = typeof req.query.stabilityTier === "string" ? req.query.stabilityTier : undefined;
  const grade = typeof req.query.grade === "string" ? req.query.grade : undefined;
  const rows = await prisma.upstreamProxy.findMany({
    where: buildAvailableFreeUpstreamWhere(
      {
        ...(allowedCountries.length > 0 ? { countries: allowedCountries } : {}),
        ipType,
        stabilityTier,
        grade
      },
      new Date()
    ),
    select: { country: true, region: true, city: true }
  });

  // country -> region -> set of cities
  const byCountry = new Map<string, Map<string, Set<string>>>();
  for (const row of rows) {
    if (!row.country) continue;
    if (!byCountry.has(row.country)) byCountry.set(row.country, new Map());
    const regionKey = row.region ?? "";
    const regions = byCountry.get(row.country)!;
    if (!regions.has(regionKey)) regions.set(regionKey, new Set());
    if (row.city) regions.get(regionKey)!.add(row.city);
  }

  const countries = [...byCountry.entries()]
    .map(([country, regions]) => ({
      country,
      regions: [...regions.entries()]
        .filter(([region]) => region !== "")
        .map(([region, cities]) => ({ region, cities: [...cities].sort() }))
        .sort((a, b) => a.region.localeCompare(b.region))
    }))
    .sort((a, b) => a.country.localeCompare(b.country));

  res.json({ countries });
});

app.get("/api/admin/users", async (_req, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    take: 200,
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      trafficQuotaBytes: true,
      trafficUsedBytes: true,
      trafficQuotaHostingBytes: true,
      trafficUsedHostingBytes: true,
      allowedCountriesJson: true,
      allowedSourceIpsJson: true,
      maxProxyEntries: true,
      maxConcurrentConnections: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          proxyEntries: true
        }
      }
    }
  });

  res.json({
    count: users.length,
    users: users.map(serializeUser)
  });
});

app.post("/api/admin/users", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password.trim() : randomPassword();
  const trafficQuotaGb = typeof req.body?.trafficQuotaGb === "number" ? req.body.trafficQuotaGb : 50;
  // Datacenter (hosting) bucket quota. 0 = unlimited (same sentinel as residential).
  const trafficQuotaHostingGb =
    typeof req.body?.trafficQuotaHostingGb === "number" ? req.body.trafficQuotaHostingGb : 0;
  const maxProxyEntries = typeof req.body?.maxProxyEntries === "number" ? req.body.maxProxyEntries : 10;
  // Default 0 = unlimited concurrent connections (see User.maxConcurrentConnections
  // in schema.prisma). A fingerprint browser opens many parallel connections per
  // page, so a low cap makes pages fail to load; admins can still set an explicit
  // cap per user.
  const maxConcurrentConnections =
    typeof req.body?.maxConcurrentConnections === "number" ? req.body.maxConcurrentConnections : 0;
  const allowedCountriesResult = normalizeAllowedCountriesInput(req.body?.allowedCountries);
  const allowedCountries = allowedCountriesResult.ok ? allowedCountriesResult.countries : SUPPORTED_COUNTRIES;
  const allowedSourceIpsResult = normalizeAllowedSourceIpsInput(req.body?.allowedSourceIps);
  const allowedSourceIps = allowedSourceIpsResult.ok ? allowedSourceIpsResult.sourceIps ?? [] : [];

  if (!/^[a-zA-Z0-9_-]{3,40}$/.test(username)) {
    res.status(400).json({ error: "Username must be 3-40 letters, numbers, underscores, or hyphens" });
    return;
  }

  if (password.length < 8 || password.length > 80) {
    res.status(400).json({ error: "Password must be 8-80 characters" });
    return;
  }

  if (!Number.isFinite(trafficQuotaGb) || trafficQuotaGb < 0 || trafficQuotaGb > 10_000) {
    res.status(400).json({ error: "Traffic quota must be 0-10000 GB" });
    return;
  }

  if (
    !Number.isFinite(trafficQuotaHostingGb) ||
    trafficQuotaHostingGb < 0 ||
    trafficQuotaHostingGb > 10_000
  ) {
    res.status(400).json({ error: "Hosting traffic quota must be 0-10000 GB" });
    return;
  }

  if (!Number.isInteger(maxProxyEntries) || maxProxyEntries < 0 || maxProxyEntries > 100) {
    res.status(400).json({ error: "Max proxy entries must be 0-100" });
    return;
  }

  if (
    !Number.isInteger(maxConcurrentConnections) ||
    maxConcurrentConnections < 0 ||
    maxConcurrentConnections > 100
  ) {
    res.status(400).json({ error: "Max concurrent connections must be 0-100" });
    return;
  }

  if (!allowedCountriesResult.ok) {
    res.status(400).json({ error: allowedCountriesResult.error });
    return;
  }

  if (!allowedSourceIpsResult.ok) {
    res.status(400).json({ error: allowedSourceIpsResult.error });
    return;
  }

  const trafficQuotaBytes = BigInt(Math.round(trafficQuotaGb * 1024 * 1024 * 1024));
  const trafficQuotaHostingBytes = BigInt(Math.round(trafficQuotaHostingGb * 1024 * 1024 * 1024));

  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        role: "user",
        status: "active",
        trafficQuotaBytes,
        trafficQuotaHostingBytes,
        allowedCountriesJson: JSON.stringify(allowedCountries),
        allowedSourceIpsJson: JSON.stringify(allowedSourceIps),
        maxProxyEntries,
        maxConcurrentConnections
      },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        trafficQuotaBytes: true,
        trafficUsedBytes: true,
        trafficQuotaHostingBytes: true,
        trafficUsedHostingBytes: true,
        allowedCountriesJson: true,
        allowedSourceIpsJson: true,
        maxProxyEntries: true,
        maxConcurrentConnections: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await prisma.operationLog.create({
      data: {
        actorUserId: req.authUser?.id,
        action: "user_create",
        targetType: "user",
        targetId: String(user.id),
        detailJson: JSON.stringify({
          username: user.username,
          status: user.status,
          trafficQuotaGb,
          trafficQuotaHostingGb,
          maxProxyEntries,
          maxConcurrentConnections,
          allowedCountries,
          allowedSourceIps,
          passwordSource: typeof req.body?.password === "string" && req.body.password.trim() ? "manual" : "generated"
        })
      }
    }).catch(() => undefined);

    res.status(201).json({
      ok: true,
      user: serializeUser(user),
      initialPassword: password
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    if (message.includes("Unique constraint")) {
      res.status(409).json({ error: "用户名已存在，请换一个用户名" });
      return;
    }

    res.status(500).json({ error: "创建用户失败，请稍后重试" });
  }
});

app.post("/api/admin/users/:id/password-reset", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  const manualPassword = typeof req.body?.password === "string" ? req.body.password.trim() : "";
  const newPassword = manualPassword || randomPassword();

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "User id must be a positive number" });
    return;
  }

  if (newPassword.length < 8 || newPassword.length > 80) {
    res.status(400).json({ error: "Password must be 8-80 characters" });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true
    }
  });

  if (!existing) {
    res.status(404).json({ error: "User was not found" });
    return;
  }

  if (existing.role !== "user") {
    res.status(403).json({ error: "Only ordinary user passwords can be reset here" });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashPassword(newPassword)
      },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        trafficQuotaBytes: true,
        trafficUsedBytes: true,
        trafficQuotaHostingBytes: true,
        trafficUsedHostingBytes: true,
        allowedCountriesJson: true,
        allowedSourceIpsJson: true,
        maxProxyEntries: true,
        maxConcurrentConnections: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            proxyEntries: true
          }
        }
      }
    });

    await prisma.operationLog.create({
      data: {
        actorUserId: req.authUser?.id,
        action: "user_password_reset",
        targetType: "user",
        targetId: String(id),
        detailJson: JSON.stringify({
          passwordSource: manualPassword ? "manual" : "generated",
          username: user.username
        })
      }
    }).catch(() => undefined);

    res.json({
      ok: true,
      user: serializeUser(user),
      newPassword
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset user password";
    res.status(500).json({ error: message });
  }
});

app.patch("/api/admin/users/:id", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  const status = typeof req.body?.status === "string" ? req.body.status.trim() : undefined;
  const trafficQuotaGb = typeof req.body?.trafficQuotaGb === "number" ? req.body.trafficQuotaGb : undefined;
  const trafficQuotaHostingGb =
    typeof req.body?.trafficQuotaHostingGb === "number" ? req.body.trafficQuotaHostingGb : undefined;
  const maxProxyEntries = typeof req.body?.maxProxyEntries === "number" ? req.body.maxProxyEntries : undefined;
  const maxConcurrentConnections =
    typeof req.body?.maxConcurrentConnections === "number" ? req.body.maxConcurrentConnections : undefined;
  const allowedCountriesResult = normalizeAllowedCountriesInput(req.body?.allowedCountries);
  const allowedCountries = allowedCountriesResult.ok ? allowedCountriesResult.countries : undefined;
  const allowedSourceIpsResult = normalizeAllowedSourceIpsInput(req.body?.allowedSourceIps);
  const allowedSourceIps = allowedSourceIpsResult.ok ? allowedSourceIpsResult.sourceIps : undefined;

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "User id must be a positive number" });
    return;
  }

  if (status !== undefined && !["active", "disabled"].includes(status)) {
    res.status(400).json({ error: "Status must be active or disabled" });
    return;
  }

  if (trafficQuotaGb !== undefined && (!Number.isFinite(trafficQuotaGb) || trafficQuotaGb < 0 || trafficQuotaGb > 10_000)) {
    res.status(400).json({ error: "Traffic quota must be 0-10000 GB" });
    return;
  }

  if (
    trafficQuotaHostingGb !== undefined &&
    (!Number.isFinite(trafficQuotaHostingGb) || trafficQuotaHostingGb < 0 || trafficQuotaHostingGb > 10_000)
  ) {
    res.status(400).json({ error: "Hosting traffic quota must be 0-10000 GB" });
    return;
  }

  if (
    maxProxyEntries !== undefined &&
    (!Number.isInteger(maxProxyEntries) || maxProxyEntries < 0 || maxProxyEntries > 100)
  ) {
    res.status(400).json({ error: "Max proxy entries must be 0-100" });
    return;
  }

  if (
    maxConcurrentConnections !== undefined &&
    (!Number.isInteger(maxConcurrentConnections) ||
      maxConcurrentConnections < 0 ||
      maxConcurrentConnections > 100)
  ) {
    res.status(400).json({ error: "Max concurrent connections must be 0-100" });
    return;
  }

  if (!allowedCountriesResult.ok) {
    res.status(400).json({ error: allowedCountriesResult.error });
    return;
  }

  if (!allowedSourceIpsResult.ok) {
    res.status(400).json({ error: allowedSourceIpsResult.error });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      trafficQuotaBytes: true,
      trafficQuotaHostingBytes: true,
      allowedCountriesJson: true,
      allowedSourceIpsJson: true,
      maxProxyEntries: true,
      maxConcurrentConnections: true
    }
  });

  if (!existing) {
    res.status(404).json({ error: "User was not found" });
    return;
  }

  if (existing.role !== "user") {
    res.status(403).json({ error: "Only ordinary user settings can be edited here" });
    return;
  }

  const data: {
    status?: string;
    trafficQuotaBytes?: bigint;
    trafficQuotaHostingBytes?: bigint;
    allowedCountriesJson?: string;
    allowedSourceIpsJson?: string;
    maxProxyEntries?: number;
    maxConcurrentConnections?: number;
  } = {};

  if (status !== undefined) data.status = status;
  if (trafficQuotaGb !== undefined) data.trafficQuotaBytes = BigInt(Math.round(trafficQuotaGb * 1024 * 1024 * 1024));
  if (trafficQuotaHostingGb !== undefined)
    data.trafficQuotaHostingBytes = BigInt(Math.round(trafficQuotaHostingGb * 1024 * 1024 * 1024));
  if (allowedCountries !== undefined) data.allowedCountriesJson = JSON.stringify(allowedCountries);
  if (allowedSourceIps !== undefined) data.allowedSourceIpsJson = JSON.stringify(allowedSourceIps);
  if (maxProxyEntries !== undefined) data.maxProxyEntries = maxProxyEntries;
  if (maxConcurrentConnections !== undefined) data.maxConcurrentConnections = maxConcurrentConnections;

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        trafficQuotaBytes: true,
        trafficUsedBytes: true,
        trafficQuotaHostingBytes: true,
        trafficUsedHostingBytes: true,
        allowedCountriesJson: true,
        allowedSourceIpsJson: true,
        maxProxyEntries: true,
        maxConcurrentConnections: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            proxyEntries: true
          }
        }
      }
    });

    await prisma.operationLog.create({
      data: {
        actorUserId: req.authUser?.id,
        action: "user_settings_update",
        targetType: "user",
        targetId: String(id),
        detailJson: JSON.stringify({
          username: user.username,
          changes: {
            ...(status !== undefined ? { status: { from: existing.status, to: status } } : {}),
            ...(trafficQuotaGb !== undefined
              ? {
                  trafficQuotaGb: {
                    from: Number(existing.trafficQuotaBytes) / 1024 / 1024 / 1024,
                    to: trafficQuotaGb
                  }
                }
              : {}),
            ...(trafficQuotaHostingGb !== undefined
              ? {
                  trafficQuotaHostingGb: {
                    from: Number(existing.trafficQuotaHostingBytes) / 1024 / 1024 / 1024,
                    to: trafficQuotaHostingGb
                  }
                }
              : {}),
            ...(allowedCountries !== undefined
              ? {
                  allowedCountries: {
                    from: parseAllowedCountries(existing.allowedCountriesJson),
                    to: allowedCountries
                  }
                }
              : {}),
            ...(allowedSourceIps !== undefined
              ? {
                  allowedSourceIps: {
                    from: parseAllowedSourceIps(existing.allowedSourceIpsJson),
                    to: allowedSourceIps
                  }
                }
              : {}),
            ...(maxProxyEntries !== undefined
              ? { maxProxyEntries: { from: existing.maxProxyEntries, to: maxProxyEntries } }
              : {}),
            ...(maxConcurrentConnections !== undefined
              ? {
                  maxConcurrentConnections: {
                    from: existing.maxConcurrentConnections,
                    to: maxConcurrentConnections
                  }
                }
              : {})
          }
        })
      }
    }).catch(() => undefined);

    res.json({
      ok: true,
      user: serializeUser(user)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user";
    res.status(message.includes("Record to update not found") ? 404 : 500).json({ error: message });
  }
});

app.delete("/api/admin/users/:id", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "User id must be a positive number" });
    return;
  }

  if (req.body?.confirm !== true) {
    res.status(400).json({ error: "删除是永久操作，请在请求中带 confirm:true 再次确认" });
    return;
  }

  if (req.authUser?.id === id) {
    res.status(409).json({ error: "不能删除当前登录的账号" });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true }
  });

  if (!existing) {
    res.status(404).json({ error: "User was not found" });
    return;
  }

  if (existing.role !== "user") {
    res.status(403).json({ error: "只能删除普通用户，管理员账号不可删除" });
    return;
  }

  try {
    const summary = await prisma.$transaction(async (tx) => {
      const entries = await tx.proxyEntry.findMany({
        where: { userId: id },
        select: { id: true }
      });
      const entryIds = entries.map((entry) => entry.id);

      if (entryIds.length > 0) {
        await tx.upstreamProxy.updateMany({
          where: { lockedByEntryId: { in: entryIds } },
          data: { status: "free", lockedByEntryId: null }
        });
      }

      const trafficDeleted = await tx.trafficDaily.deleteMany({ where: { userId: id } });
      const entriesDeleted = await tx.proxyEntry.deleteMany({ where: { userId: id } });
      await tx.operationLog.updateMany({
        where: { actorUserId: id },
        data: { actorUserId: null }
      });
      await tx.user.delete({ where: { id } });

      return {
        releasedUpstreams: entryIds.length,
        deletedProxyEntries: entriesDeleted.count,
        deletedTrafficRows: trafficDeleted.count
      };
    });

    await prisma.operationLog.create({
      data: {
        actorUserId: req.authUser?.id,
        action: "user_delete",
        targetType: "user",
        targetId: String(id),
        detailJson: JSON.stringify({
          username: existing.username,
          ...summary
        })
      }
    }).catch(() => undefined);

    res.json({ ok: true, deletedUserId: id, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user";
    res.status(message.includes("Record to delete does not exist") ? 404 : 500).json({ error: message });
  }
});

app.get("/api/admin/operation-logs", async (_req, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const logs = await prisma.operationLog.findMany({
    orderBy: { id: "desc" },
    take: 200,
    select: {
      id: true,
      actorUserId: true,
      action: true,
      targetType: true,
      targetId: true,
      detailJson: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          username: true,
          role: true
        }
      }
    }
  });

  res.json({
    count: logs.length,
    logs: logs.map((log) => ({
      ...log,
      detail: parseOperationLogDetail(log.detailJson),
      detailJson: undefined
    }))
  });
});

app.post("/api/admin/upstreams/import", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) {
    res.status(400).json({ error: "Request body must include text with upstream proxy lines" });
    return;
  }

  const parsed = parseUpstreamProxyText(text);
  const valid = parsed
    .filter((item) => item.ok)
    .map((item) => ({
      lineNumber: item.lineNumber,
      value: item.value
    }));

  const invalidItems = parsed
    .filter((item) => !item.ok)
    .map((item) => ({
      ok: false as const,
      lineNumber: item.lineNumber,
      error: item.error
    }));

  const imported = await importUpstreamProxies(valid);

  await prisma.operationLog.create({
    data: {
      actorUserId: req.authUser?.id,
      action: "upstream_import",
      targetType: "upstream_import",
      targetId: "batch",
      detailJson: JSON.stringify({
        created: imported.created,
        duplicates: imported.duplicates,
        failed: imported.failed + invalidItems.length,
        validLines: valid.length,
        invalidLines: invalidItems.length
      })
    }
  }).catch(() => undefined);

  res.status(imported.failed + invalidItems.length > 0 ? 207 : 200).json({
    created: imported.created,
    duplicates: imported.duplicates,
    failed: imported.failed + invalidItems.length,
    items: [...imported.items, ...invalidItems].sort((left, right) => left.lineNumber - right.lineNumber)
  });
});

app.get("/api/admin/upstreams", async (_req, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const upstreams = await prisma.upstreamProxy.findMany({
    orderBy: { id: "desc" },
    take: 5000,
    select: {
      id: true,
      host: true,
      port: true,
      username: true,
      status: true,
      currentIp: true,
      country: true,
      region: true,
      city: true,
      ipType: true,
      ipTypeCheckedAt: true,
      latencyMs: true,
      score: true,
      stabilityTier: true,
      stabilityScore: true,
      stableSince: true,
      failCount: true,
      successCount: true,
      lastErrorType: true,
      lastCheckedAt: true,
      cooldownUntil: true,
      createdAt: true,
      updatedAt: true,
      scanLogs: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          success: true,
          exitIp: true,
          country: true,
          region: true,
          city: true,
          latencyMs: true,
          errorType: true,
          message: true,
          createdAt: true
        }
      }
    }
  });

  res.json({
    count: upstreams.length,
    upstreams
  });
});

app.patch("/api/admin/upstreams/:id/status", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  const status = typeof req.body?.status === "string" ? req.body.status.trim() : "";

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Upstream id must be a positive number" });
    return;
  }

  if (!["free", "disabled"].includes(status)) {
    res.status(400).json({ error: "Status must be free or disabled" });
    return;
  }

  const existing = await prisma.upstreamProxy.findUnique({
    where: { id },
    select: { id: true, host: true, port: true, status: true, lockedByEntryId: true }
  });

  if (!existing) {
    res.status(404).json({ error: "Upstream proxy was not found" });
    return;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (status === "disabled" && existing.lockedByEntryId) {
        await tx.proxyEntry.update({
          where: { id: existing.lockedByEntryId },
          data: {
            currentUpstreamId: null,
            currentIp: null,
            currentCountry: null,
            currentRegion: null,
            currentCity: null,
            lastCheckedAt: new Date()
          }
        });
      }

      return tx.upstreamProxy.update({
        where: { id },
        data: {
          status,
          ...(status === "disabled" ? { lockedByEntryId: null } : {})
        },
        select: { id: true, host: true, port: true, status: true, lockedByEntryId: true }
      });
    });

    await prisma.operationLog.create({
      data: {
        actorUserId: req.authUser?.id,
        action: "upstream_status_update",
        targetType: "upstream_proxy",
        targetId: String(id),
        detailJson: JSON.stringify({
          host: existing.host,
          port: existing.port,
          changes: {
            status: { from: existing.status, to: updated.status }
          },
          releasedEntryId: status === "disabled" ? existing.lockedByEntryId : null
        })
      }
    }).catch(() => undefined);

    res.json({ ok: true, upstream: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update upstream status";
    res.status(500).json({ error: message });
  }
});

app.delete("/api/admin/upstreams/:id", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Upstream id must be a positive number" });
    return;
  }

  if (req.body?.confirm !== true) {
    res.status(400).json({ error: "删除是永久操作，请在请求中带 confirm:true 再次确认" });
    return;
  }

  const existing = await prisma.upstreamProxy.findUnique({
    where: { id },
    select: { id: true, host: true, port: true, status: true, lockedByEntryId: true }
  });

  if (!existing) {
    res.status(404).json({ error: "Upstream proxy was not found" });
    return;
  }

  try {
    const summary = await prisma.$transaction(async (tx) => {
      if (existing.lockedByEntryId) {
        await tx.proxyEntry.update({
          where: { id: existing.lockedByEntryId },
          data: {
            currentUpstreamId: null,
            currentIp: null,
            currentCountry: null,
            currentRegion: null,
            currentCity: null,
            lastCheckedAt: new Date()
          }
        });
      }

      const scanDeleted = await tx.scanLog.deleteMany({ where: { upstreamProxyId: id } });
      await tx.upstreamProxy.delete({ where: { id } });

      return {
        unboundEntryId: existing.lockedByEntryId,
        deletedScanLogs: scanDeleted.count
      };
    });

    await prisma.operationLog.create({
      data: {
        actorUserId: req.authUser?.id,
        action: "upstream_delete",
        targetType: "upstream_proxy",
        targetId: String(id),
        detailJson: JSON.stringify({
          host: existing.host,
          port: existing.port,
          status: existing.status,
          ...summary
        })
      }
    }).catch(() => undefined);

    res.json({ ok: true, deletedUpstreamId: id, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete upstream";
    res.status(message.includes("Record to delete does not exist") ? 404 : 500).json({ error: message });
  }
});

// Manually test one upstream right now. Runs the same probe the worker uses,
// persists the result (so failCount / cooldown / bad transitions stay
// consistent), and returns the fresh status so the admin can decide what to do.
app.post("/api/admin/upstreams/:id/rescan", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Upstream id must be a positive number" });
    return;
  }

  const existing = await prisma.upstreamProxy.findUnique({
    where: { id },
    select: { id: true, host: true, port: true, status: true }
  });
  if (!existing) {
    res.status(404).json({ error: "Upstream proxy was not found" });
    return;
  }

  const settings = await readAppSettings();

  try {
    const result = await scanUpstreamProxyOnce(id, {
      scanTimeoutMs: settings.scanTimeoutMs,
      geoCacheTtlMs: settings.geoCacheTtlMs
    });
    await recordUpstreamScanResult(result, {
      maxScanFailures: settings.maxScanFailures,
      cooldownMs: settings.cooldownMs,
      rateLimitedCooldownMs: settings.rateLimitedCooldownMs
    });

    const updated = await prisma.upstreamProxy.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        currentIp: true,
        country: true,
        region: true,
        city: true,
        latencyMs: true,
        failCount: true,
        successCount: true,
        lastErrorType: true,
        lastCheckedAt: true
      }
    });

    await prisma.operationLog
      .create({
        data: {
          actorUserId: req.authUser?.id,
          action: "upstream_rescan",
          targetType: "upstream_proxy",
          targetId: String(id),
          detailJson: JSON.stringify({
            host: existing.host,
            port: existing.port,
            success: result.success,
            errorType: result.success ? null : result.errorType,
            statusFrom: existing.status,
            statusTo: updated?.status ?? existing.status
          })
        }
      })
      .catch(() => undefined);

    res.json({
      ok: true,
      success: result.success,
      errorType: result.success ? null : result.errorType,
      message: result.success ? "Upstream responded successfully" : result.message,
      upstream: updated
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to test upstream";
    res.status(500).json({ error: message });
  }
});

// Track an in-flight manual full scan so repeated clicks do not stack overlapping
// batches. Single-instance, so a module-level flag is sufficient.
let manualScanRunning = false;

// Trigger an immediate scan of all currently scannable upstreams in the
// background, so the admin does not have to wait for the next worker interval.
// Returns right away; the admin refreshes the list to see updated statuses.
app.post("/api/admin/scan/run", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  if (manualScanRunning) {
    res.status(409).json({ error: "已有一轮手动扫描在进行中，请稍候再试" });
    return;
  }

  const now = new Date();

  // Optional status scope: scan only the pool the admin is currently viewing
  // (e.g. just the cooldown/retry pool) instead of everything. Omitted / "all"
  // keeps the original behavior (every scannable upstream, excluding disabled +
  // bad). Disabled upstreams are never auto-scanned: a successful scan would flip
  // them back to free, silently re-enabling something turned off on purpose.
  const requestedStatus =
    typeof (req.body as { status?: unknown } | undefined)?.status === "string"
      ? String((req.body as { status?: unknown }).status).trim()
      : "all";
  const POOL_LABELS: Record<string, string> = {
    free: "成功池",
    locked: "已绑定",
    cooldown: "重试池",
    bad: "待核验池"
  };

  let scanWhere: { status: string } | { status: { notIn: string[] } };
  if (!requestedStatus || requestedStatus === "all") {
    scanWhere = { status: { notIn: ["disabled", "bad"] } };
  } else if (requestedStatus === "disabled") {
    res.json({ ok: true, started: false, scannable: 0, message: "停用的上游不参与扫描，请先启用再扫描" });
    return;
  } else if (requestedStatus in POOL_LABELS) {
    scanWhere = { status: requestedStatus };
  } else {
    res.status(400).json({ error: "未知的状态筛选" });
    return;
  }

  const scopeLabel = requestedStatus === "all" ? "全部可扫描" : POOL_LABELS[requestedStatus] ?? requestedStatus;
  const scannable = await prisma.upstreamProxy.findMany({
    where: scanWhere,
    select: { id: true },
    orderBy: { id: "asc" }
  });

  if (scannable.length === 0) {
    res.json({ ok: true, started: false, scannable: 0, message: `「${scopeLabel}」里没有可扫描的上游` });
    return;
  }

  const settings = await readAppSettings();
  const ids = scannable.map((row) => row.id);
  manualScanRunning = true;

  await prisma.operationLog
    .create({
      data: {
        actorUserId: req.authUser?.id,
        action: "manual_scan_run",
        targetType: "upstream_proxy",
        targetId: "batch",
        detailJson: JSON.stringify({ scope: requestedStatus, scannable: ids.length, startedAt: now.toISOString() })
      }
    })
    .catch(() => undefined);

  // Fire-and-forget: scan with adaptive concurrency so a large single-provider
  // pool does not open hundreds of sockets at once and self-inflict provider
  // rate-limits (402/429/503) — mapAdaptive backs off automatically when those
  // appear. Concurrency follows the admin "并发数" setting (bounded <=500).
  // Errors are swallowed per-upstream; the persisted scan result records failures.
  void (async () => {
    try {
      await mapAdaptive(
        ids,
        async (id) => {
          try {
            const result = await scanUpstreamProxyOnce(id, {
              scanTimeoutMs: settings.scanTimeoutMs,
              geoCacheTtlMs: settings.geoCacheTtlMs
            });
            await recordUpstreamScanResult(result, {
              maxScanFailures: settings.maxScanFailures,
              cooldownMs: settings.cooldownMs,
              rateLimitedCooldownMs: settings.rateLimitedCooldownMs
            });
            return result;
          } catch (error) {
            console.warn(
              `Manual scan of upstream ${id} failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
            return null;
          }
        },
        (result) => !!result && result.success === false && result.errorType === "rate_limited",
        { maxConcurrency: Math.max(1, settings.scanConcurrency) }
      );
      console.info(`Manual scan finished for ${ids.length} upstreams`);
    } finally {
      manualScanRunning = false;
    }
  })();

  res.json({
    ok: true,
    started: true,
    scannable: ids.length,
    message: `已开始扫描「${scopeLabel}」${ids.length} 个上游，请看右侧实时进度`
  });
});

// Lightweight live feed for the admin "scan console": the most recently checked
// upstreams (any scan updates lastCheckedAt, so this reflects both the manual run
// and the worker's continuous + fast-lane scans) plus pool counts and whether a
// manual full scan is currently running. Polled every couple of seconds by the UI.
app.get("/api/admin/scan/activity", async (_req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const [recent, total, free, locked, cooldown, bad, disabled] = await Promise.all([
    prisma.upstreamProxy.findMany({
      where: { lastCheckedAt: { not: null } },
      orderBy: { lastCheckedAt: "desc" },
      take: 50,
      select: {
        id: true,
        host: true,
        port: true,
        currentIp: true,
        country: true,
        region: true,
        city: true,
        latencyMs: true,
        status: true,
        lastErrorType: true,
        ipType: true,
        lastCheckedAt: true
      }
    }),
    prisma.upstreamProxy.count(),
    prisma.upstreamProxy.count({ where: { status: "free" } }),
    prisma.upstreamProxy.count({ where: { status: "locked" } }),
    prisma.upstreamProxy.count({ where: { status: "cooldown" } }),
    prisma.upstreamProxy.count({ where: { status: "bad" } }),
    prisma.upstreamProxy.count({ where: { status: "disabled" } })
  ]);

  res.json({
    scanning: manualScanRunning,
    summary: { total, free, locked, cooldown, bad, disabled },
    recent
  });
});

function parseUpstreamIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<number>();
  for (const item of value) {
    const id = Number(item);
    if (Number.isInteger(id) && id > 0) ids.add(id);
  }
  return [...ids];
}

// Test several upstreams at once (the selected rows in the admin table). Runs the
// same probe as the single rescan with bounded concurrency and returns a summary.
app.post("/api/admin/upstreams/rescan-batch", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const ids = parseUpstreamIdList(req.body?.ids);
  if (ids.length === 0) {
    res.status(400).json({ error: "请至少选择一条上游" });
    return;
  }
  if (ids.length > 200) {
    res.status(400).json({ error: "一次最多测试 200 条" });
    return;
  }

  const settings = await readAppSettings();
  const concurrency = Math.max(1, Math.min(settings.scanConcurrency, 20));
  let cursor = 0;
  let succeeded = 0;
  let failed = 0;
  let missing = 0;

  const runOne = async (): Promise<void> => {
    while (cursor < ids.length) {
      const id = ids[cursor++]!;
      try {
        const result = await scanUpstreamProxyOnce(id, {
          scanTimeoutMs: settings.scanTimeoutMs,
          geoCacheTtlMs: settings.geoCacheTtlMs
        });
        await recordUpstreamScanResult(result, {
          maxScanFailures: settings.maxScanFailures,
          cooldownMs: settings.cooldownMs,
          rateLimitedCooldownMs: settings.rateLimitedCooldownMs
        });
        if (result.success) succeeded += 1;
        else failed += 1;
      } catch {
        missing += 1;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, () => runOne()));

  await prisma.operationLog
    .create({
      data: {
        actorUserId: req.authUser?.id,
        action: "upstream_rescan_batch",
        targetType: "upstream_proxy",
        targetId: "batch",
        detailJson: JSON.stringify({ requested: ids.length, succeeded, failed, missing })
      }
    })
    .catch(() => undefined);

  res.json({ ok: true, requested: ids.length, succeeded, failed, missing });
});

// Recover several upstreams at once back into the success pool. Skips ones that
// are not in cooldown/bad (or are disabled); returns how many were recovered.
app.post("/api/admin/upstreams/recover-batch", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const ids = parseUpstreamIdList(req.body?.ids);
  if (ids.length === 0) {
    res.status(400).json({ error: "请至少选择一条上游" });
    return;
  }

  const targets = await prisma.upstreamProxy.findMany({
    where: { id: { in: ids }, status: { in: ["bad", "cooldown"] } },
    select: { id: true, lockedByEntryId: true }
  });

  let recovered = 0;
  for (const target of targets) {
    try {
      await prisma.upstreamProxy.update({
        where: { id: target.id },
        data: {
          status: target.lockedByEntryId ? "locked" : "free",
          failCount: 0,
          lastErrorType: null,
          cooldownUntil: null
        }
      });
      recovered += 1;
    } catch {
      /* skip rows that changed underneath */
    }
  }

  await prisma.operationLog
    .create({
      data: {
        actorUserId: req.authUser?.id,
        action: "upstream_recover_batch",
        targetType: "upstream_proxy",
        targetId: "batch",
        detailJson: JSON.stringify({ requested: ids.length, recovered, skipped: ids.length - recovered })
      }
    })
    .catch(() => undefined);

  res.json({ ok: true, requested: ids.length, recovered, skipped: ids.length - recovered });
});

// Recover an upstream from the manual-review (bad) or cooldown pool back into the
// active pool by clearing the failure counter and cooldown, giving it another
// chance to be scanned. Does not re-test immediately; the next scan (or a manual
// rescan) decides its real health.
app.post("/api/admin/upstreams/:id/recover", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Upstream id must be a positive number" });
    return;
  }

  const existing = await prisma.upstreamProxy.findUnique({
    where: { id },
    select: { id: true, host: true, port: true, status: true, lockedByEntryId: true }
  });
  if (!existing) {
    res.status(404).json({ error: "Upstream proxy was not found" });
    return;
  }

  if (existing.status === "disabled") {
    res.status(409).json({ error: "请先启用该上游，再恢复重试" });
    return;
  }

  if (existing.status !== "bad" && existing.status !== "cooldown") {
    res.status(409).json({ error: "只有重试池(cooldown)或待核验池(bad)的上游可以恢复" });
    return;
  }

  try {
    const updated = await prisma.upstreamProxy.update({
      where: { id },
      data: {
        status: existing.lockedByEntryId ? "locked" : "free",
        failCount: 0,
        lastErrorType: null,
        cooldownUntil: null
      },
      select: { id: true, host: true, port: true, status: true, failCount: true }
    });

    await prisma.operationLog
      .create({
        data: {
          actorUserId: req.authUser?.id,
          action: "upstream_recover",
          targetType: "upstream_proxy",
          targetId: String(id),
          detailJson: JSON.stringify({
            host: existing.host,
            port: existing.port,
            statusFrom: existing.status,
            statusTo: updated.status
          })
        }
      })
      .catch(() => undefined);

    res.json({ ok: true, upstream: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to recover upstream";
    res.status(500).json({ error: message });
  }
});

app.post("/api/admin/proxy-entries", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const userId = typeof req.body?.userId === "number" ? req.body.userId : 0;
  if (!Number.isInteger(userId) || userId < 1) {
    res.status(400).json({ error: "Please choose an existing user before creating a proxy entry" });
    return;
  }

  const result = await createBoundProxyEntry({
    userId,
    targetCountry: typeof req.body?.targetCountry === "string" ? req.body.targetCountry : "",
    targetRegion: typeof req.body?.targetRegion === "string" ? req.body.targetRegion : undefined,
    targetCity: typeof req.body?.targetCity === "string" ? req.body.targetCity : undefined,
    targetIpType: typeof req.body?.ipType === "string" ? req.body.ipType : undefined,
    targetStabilityTier: typeof req.body?.stabilityTier === "string" ? req.body.stabilityTier : undefined,
    targetGrade: typeof req.body?.grade === "string" ? req.body.grade : undefined,
    proxyPassword: typeof req.body?.proxyPassword === "string" ? req.body.proxyPassword : undefined
  });

  if (!result.ok) {
    const statusByCode: Record<typeof result.code, number> = {
      invalid_country: 400,
      user_not_found: 404,
      user_inactive: 403,
      proxy_entry_limit_reached: 409,
      no_matching_upstream: 409,
      username_conflict: 409
    };
    res.status(statusByCode[result.code]).json(result);
    return;
  }

  const { host: gatewayHost, port: gatewayPort } = resolvePublicProxyEndpoint();

  await prisma.operationLog.create({
    data: {
      actorUserId: req.authUser?.id,
      action: "admin_proxy_entry_create",
      targetType: "proxy_entry",
      targetId: String(result.proxyEntry.id),
      detailJson: JSON.stringify({
        username: result.user.username,
        proxyEntryUsername: result.proxyEntry.username,
        proxyEntryId: result.proxyEntry.id,
        targetCountry: result.proxyEntry.targetCountry,
        targetRegion: result.proxyEntry.targetRegion,
        targetCity: result.proxyEntry.targetCity,
        passwordSource: typeof req.body?.proxyPassword === "string" && req.body.proxyPassword.trim() ? "manual" : "generated"
      })
    }
  }).catch(() => undefined);

  res.status(201).json({
    ...result,
    clientProxy: {
      host: gatewayHost,
      port: gatewayPort,
      username: result.proxyEntry.username,
      password: result.proxyEntry.password,
      copyText: `${gatewayHost}:${gatewayPort}:${result.proxyEntry.username}:${result.proxyEntry.password}`
    }
  });
});

app.get("/api/admin/proxy-entries", async (_req, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const entries = await prisma.proxyEntry.findMany({
    orderBy: { id: "desc" },
    take: 200,
    select: {
      id: true,
      userId: true,
      username: true,
      targetCountry: true,
      targetRegion: true,
      targetCity: true,
      currentUpstreamId: true,
      currentIp: true,
      currentCountry: true,
      currentRegion: true,
      currentCity: true,
      status: true,
      trafficUsedBytes: true,
      activeConnections: true,
      lastUsedAt: true,
      lastCheckedAt: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          status: true,
          trafficQuotaBytes: true,
          trafficUsedBytes: true
        }
      },
      lockedUpstream: {
        select: {
          id: true,
          status: true,
          currentIp: true,
          country: true,
          region: true,
          city: true,
          latencyMs: true,
          lastCheckedAt: true
        }
      }
    }
  });

  res.json({
    count: entries.length,
    entries: entries.map((entry) => ({
      ...entry,
      trafficUsedBytes: entry.trafficUsedBytes.toString(),
      user: {
        ...entry.user,
        trafficQuotaBytes: entry.user.trafficQuotaBytes.toString(),
        trafficUsedBytes: entry.user.trafficUsedBytes.toString()
      }
    }))
  });
});

app.get("/api/admin/traffic-daily", async (_req, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const rows = await prisma.trafficDaily.findMany({
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 500,
    select: {
      id: true,
      userId: true,
      proxyEntryId: true,
      date: true,
      bytesUp: true,
      bytesDown: true,
      totalBytes: true,
      connections: true,
      user: {
        select: {
          id: true,
          username: true
        }
      },
      proxyEntry: {
        select: {
          id: true,
          username: true,
          targetCountry: true,
          targetRegion: true,
          targetCity: true
        }
      }
    }
  });

  res.json({
    count: rows.length,
    rows: rows.map((row) => ({
      ...row,
      bytesUp: row.bytesUp.toString(),
      bytesDown: row.bytesDown.toString(),
      totalBytes: row.totalBytes.toString()
    }))
  });
});

app.patch("/api/admin/proxy-entries/:id/status", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  const status = typeof req.body?.status === "string" ? req.body.status.trim() : "";

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Proxy entry id must be a positive number" });
    return;
  }

  if (!["active", "disabled"].includes(status)) {
    res.status(400).json({ error: "Status must be active or disabled" });
    return;
  }

  const existing = await prisma.proxyEntry.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      username: true,
      targetCountry: true,
      targetRegion: true,
      targetCity: true,
      currentUpstreamId: true,
      user: {
        select: {
          id: true,
          username: true
        }
      },
      lockedUpstream: {
        select: {
          id: true,
          lockedByEntryId: true
        }
      }
    }
  });

  if (!existing) {
    res.status(404).json({ error: "Proxy entry was not found" });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (status === "disabled" && existing.lockedUpstream?.lockedByEntryId === existing.id) {
      await tx.upstreamProxy.update({
        where: { id: existing.lockedUpstream.id },
        data: {
          status: "free",
          lockedByEntryId: null
        }
      });
    }

    if (status === "active") {
      const upstream = await tx.upstreamProxy.findFirst({
        where: {
          status: "free",
          lockedByEntryId: null,
          currentIp: { not: null },
          country: existing.targetCountry,
          ...(existing.targetRegion ? { region: existing.targetRegion } : {}),
          ...(existing.targetCity ? { city: existing.targetCity } : {}),
          OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: new Date() } }]
        },
        orderBy: [{ score: "desc" }, { latencyMs: "asc" }, { lastCheckedAt: "desc" }, { id: "asc" }]
      });

      if (!upstream) {
        throw new Error("No scanned free upstream proxy matches this entry location");
      }

      await tx.upstreamProxy.update({
        where: { id: upstream.id },
        data: {
          status: "locked",
          lockedByEntryId: existing.id
        }
      });

      return tx.proxyEntry.update({
        where: { id },
        data: {
          status,
          currentUpstreamId: upstream.id,
          currentIp: upstream.currentIp,
          currentCountry: upstream.country,
          currentRegion: upstream.region,
          currentCity: upstream.city,
          lastCheckedAt: new Date()
        },
        select: {
          id: true,
          username: true,
          status: true,
          currentUpstreamId: true,
          currentIp: true,
          currentCountry: true,
          currentRegion: true,
          currentCity: true,
          updatedAt: true
        }
      });
    }

    return tx.proxyEntry.update({
      where: { id },
      data: {
        status,
        currentUpstreamId: null,
        currentIp: null,
        currentCountry: null,
        currentRegion: null,
        currentCity: null
      },
      select: {
        id: true,
        username: true,
        status: true,
        currentUpstreamId: true,
        currentIp: true,
        currentCountry: true,
        currentRegion: true,
        currentCity: true,
        updatedAt: true
      }
    });
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Failed to update proxy entry status";
    res.status(message.includes("No scanned free upstream") ? 409 : 500).json({ error: message });
    return null;
  });

  if (!updated) {
    return;
  }

  await prisma.operationLog.create({
    data: {
      actorUserId: req.authUser?.id,
      action: "proxy_entry_status_update",
      targetType: "proxy_entry",
      targetId: String(updated.id),
      detailJson: JSON.stringify({
        username: existing.user.username,
        proxyEntryUsername: existing.username,
        targetCountry: existing.targetCountry,
        targetRegion: existing.targetRegion,
        targetCity: existing.targetCity,
        changes: {
          status: {
            from: existing.status,
            to: updated.status
          },
          currentUpstreamId: {
            from: existing.currentUpstreamId,
            to: updated.currentUpstreamId
          }
        }
      })
    }
  }).catch(() => undefined);

  res.json({ ok: true, entry: updated });
});

app.delete("/api/admin/proxy-entries/:id", async (req: AuthRequest, res) => {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: "Proxy entry id must be a positive number" });
    return;
  }

  if (req.body?.confirm !== true) {
    res.status(400).json({ error: "删除是永久操作，请在请求中带 confirm:true 再次确认" });
    return;
  }

  const existing = await prisma.proxyEntry.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      userId: true,
      currentUpstreamId: true,
      lockedUpstream: { select: { id: true, lockedByEntryId: true } }
    }
  });

  if (!existing) {
    res.status(404).json({ error: "Proxy entry was not found" });
    return;
  }

  try {
    const summary = await prisma.$transaction(async (tx) => {
      let releasedUpstreamId: number | null = null;
      if (existing.lockedUpstream && existing.lockedUpstream.lockedByEntryId === existing.id) {
        await tx.upstreamProxy.update({
          where: { id: existing.lockedUpstream.id },
          data: { status: "free", lockedByEntryId: null }
        });
        releasedUpstreamId = existing.lockedUpstream.id;
      }

      const trafficDeleted = await tx.trafficDaily.deleteMany({ where: { proxyEntryId: id } });
      await tx.proxyEntry.delete({ where: { id } });

      return {
        releasedUpstreamId,
        deletedTrafficRows: trafficDeleted.count
      };
    });

    await prisma.operationLog.create({
      data: {
        actorUserId: req.authUser?.id,
        action: "proxy_entry_delete",
        targetType: "proxy_entry",
        targetId: String(id),
        detailJson: JSON.stringify({
          proxyEntryUsername: existing.username,
          ownerUserId: existing.userId,
          ...summary
        })
      }
    }).catch(() => undefined);

    res.json({ ok: true, deletedProxyEntryId: id, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete proxy entry";
    res.status(message.includes("Record to delete does not exist") ? 404 : 500).json({ error: message });
  }
});

async function ensureInitialAdmin(): Promise<void> {
  if (!databaseStatus.ok) return;

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "admin" },
    select: { id: true }
  });
  if (existingAdmin) return;

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!username || !password) return;

  await prisma.user.create({
    data: {
      username,
      passwordHash: hashPassword(password),
      role: "admin",
      status: "active",
      allowedCountriesJson: JSON.stringify(["us", "gb", "fr", "ca", "au"]),
      maxProxyEntries: 0,
      maxConcurrentConnections: 0
    }
  });
  console.info(`Initial admin user created: ${username}`);
}

// In-memory sliding-window rate limiter for login. Keeps the gateway free of a
// new dependency while stopping unlimited password guessing (and the scrypt-cost
// DoS that brute forcing would otherwise cause). State is per-process, which is
// enough for the single-instance local/VPS deployment this project targets. The
// algorithm lives in @proxy-platform/shared so it can be unit-tested in isolation
// and reused by the gateway's proxy-auth throttle.
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_MAX ?? 10);
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_RATE_WINDOW_MS ?? 5 * 60_000);
const loginRateLimiter = new SlidingWindowRateLimiter({
  maxAttempts: LOGIN_MAX_ATTEMPTS,
  windowMs: LOGIN_WINDOW_MS
});

// Only trust X-Forwarded-For when explicitly running behind a trusted reverse
// proxy (TRUST_PROXY=true). When the API is exposed directly, an attacker could
// forge XFF to rotate the rate-limit key and bypass the login throttle, so we
// fall back to the real socket peer address by default.
const TRUST_PROXY = process.env.TRUST_PROXY === "true";

function clientIp(req: express.Request): string {
  if (TRUST_PROXY) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
      return forwarded.split(",")[0]!.trim();
    }
  }
  return req.socket.remoteAddress ?? "unknown";
}

async function handleLogin(req: express.Request, res: express.Response, role: AuthRole | null): Promise<void> {
  if (!databaseStatus.ok) {
    res.status(503).json({ error: "Database is not available" });
    return;
  }

  const retryAfter = loginRateLimiter.retryAfter(`${role ?? "any"}:${clientIp(req)}`);
  if (retryAfter > 0) {
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: `登录尝试过于频繁，请 ${retryAfter} 秒后再试` });
    return;
  }

  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      role: true,
      status: true
    }
  });

  if (
    !user ||
    (role !== null && user.role !== role) ||
    user.status !== "active" ||
    !verifyPassword(password, user.passwordHash)
  ) {
    res.status(401).json({ error: "Username or password is incorrect" });
    return;
  }

  const authUser = {
    id: user.id,
    username: user.username,
    role: (role ?? user.role) as AuthRole
  };

  res.json({
    token: signAuthToken(authUser, user.passwordHash),
    user: authUser
  });
}

function requireRole(role: AuthRole): express.RequestHandler {
  return async (req: AuthRequest, res, next) => {
    if (!databaseStatus.ok) {
      res.status(503).json({ error: "Database is not available" });
      return;
    }

    const token = readBearerToken(req);
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload || payload.role !== role) {
      res.status(401).json({ error: "Please log in first" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        passwordHash: true
      }
    });

    if (!user || user.role !== role || user.status !== "active") {
      res.status(403).json({ error: "This account cannot access this area" });
      return;
    }

    // Reject tokens issued before the current password: a password reset/change
    // immediately logs out all older sessions.
    if (payload.pwd !== undefined && payload.pwd !== passwordFingerprint(user.passwordHash)) {
      res.status(401).json({ error: "Please log in again" });
      return;
    }

    req.authUser = {
      id: user.id,
      username: user.username,
      role
    };
    next();
  };
}

// Short, non-reversible fingerprint of the password hash. Used only to detect
// that the password changed since a token was issued; never sent to clients raw.
function passwordFingerprint(passwordHash: string): string {
  return createHmac("sha256", authSecret).update(passwordHash).digest("base64url").slice(0, 16);
}

function signAuthToken(user: AuthenticatedUser, passwordHash: string): string {
  const payload: AuthTokenPayload = {
    exp: Date.now() + 12 * 60 * 60 * 1000,
    role: user.role,
    userId: user.id,
    username: user.username,
    pwd: passwordFingerprint(passwordHash)
  };
  const payloadText = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", authSecret).update(payloadText).digest("base64url");
  return `${payloadText}.${signature}`;
}

// Constant-time string comparison guarded by an equal-length check (timingSafeEqual
// throws on length mismatch), so signature verification does not leak via timing.
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [payloadText, signature] = token.split(".");
  if (!payloadText || !signature) return null;

  const expected = createHmac("sha256", authSecret).update(payloadText).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadText, "base64url").toString("utf8")) as Partial<AuthTokenPayload>;
    if (
      typeof payload.exp !== "number" ||
      payload.exp < Date.now() ||
      typeof payload.userId !== "number" ||
      typeof payload.username !== "string" ||
      (payload.role !== "admin" && payload.role !== "user")
    ) {
      return null;
    }

    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

function readBearerToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

const userProxyEntrySelect = {
  id: true,
  userId: true,
  username: true,
  targetCountry: true,
  targetRegion: true,
  targetCity: true,
  currentIp: true,
  currentCountry: true,
  currentRegion: true,
  currentCity: true,
  status: true,
  trafficUsedBytes: true,
  activeConnections: true,
  lastUsedAt: true,
  lastCheckedAt: true,
  createdAt: true,
  updatedAt: true
} as const;

const userTrafficSelect = {
  id: true,
  userId: true,
  proxyEntryId: true,
  date: true,
  bytesUp: true,
  bytesDown: true,
  totalBytes: true,
  connections: true,
  proxyEntry: {
    select: {
      id: true,
      username: true,
      targetCountry: true,
      targetRegion: true,
      targetCity: true
    }
  }
} as const;

function serializeUser(user: {
  id: number;
  username: string;
  role: string;
  status: string;
  trafficQuotaBytes: bigint;
  trafficUsedBytes: bigint;
  trafficQuotaHostingBytes: bigint;
  trafficUsedHostingBytes: bigint;
  allowedCountriesJson?: string;
  allowedSourceIpsJson?: string;
  maxProxyEntries: number;
  maxConcurrentConnections: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    proxyEntries: number;
  };
}) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    trafficQuotaBytes: user.trafficQuotaBytes.toString(),
    trafficUsedBytes: user.trafficUsedBytes.toString(),
    trafficQuotaHostingBytes: user.trafficQuotaHostingBytes.toString(),
    trafficUsedHostingBytes: user.trafficUsedHostingBytes.toString(),
    allowedCountries: parseAllowedCountries(user.allowedCountriesJson),
    allowedSourceIps: parseAllowedSourceIps(user.allowedSourceIpsJson),
    maxProxyEntries: user.maxProxyEntries,
    maxConcurrentConnections: user.maxConcurrentConnections,
    proxyEntryCount: user._count?.proxyEntries ?? 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function serializeUserProxyEntry(entry: {
  id: number;
  userId: number;
  username: string;
  targetCountry: string;
  targetRegion: string | null;
  targetCity: string | null;
  currentIp: string | null;
  currentCountry: string | null;
  currentRegion: string | null;
  currentCity: string | null;
  status: string;
  trafficUsedBytes: bigint;
  activeConnections: number;
  lastUsedAt: Date | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...entry,
    trafficUsedBytes: entry.trafficUsedBytes.toString()
  };
}

function serializeTrafficRow(row: {
  id: number;
  userId: number;
  proxyEntryId: number;
  date: string;
  bytesUp: bigint;
  bytesDown: bigint;
  totalBytes: bigint;
  connections: number;
  proxyEntry: {
    id: number;
    username: string;
    targetCountry: string;
    targetRegion: string | null;
    targetCity: string | null;
  };
}) {
  return {
    ...row,
    user: {
      id: row.userId,
      username: ""
    },
    bytesUp: row.bytesUp.toString(),
    bytesDown: row.bytesDown.toString(),
    totalBytes: row.totalBytes.toString()
  };
}

function parseAllowedCountries(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase())
      : [];
  } catch {
    return [];
  }
}

function normalizeAllowedCountriesInput(value: unknown):
  | { ok: true; countries?: string[] }
  | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, countries: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Allowed countries must be an array" };
  }

  const seen = new Set<string>();
  const countries: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: "Allowed countries must contain only country codes" };
    }

    const normalized = item.trim().toLowerCase();
    if (!SUPPORTED_COUNTRIES.includes(normalized as (typeof SUPPORTED_COUNTRIES)[number])) {
      return { ok: false, error: `Unsupported country code: ${item}` };
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      countries.push(normalized);
    }
  }

  if (countries.length === 0) {
    return { ok: false, error: "At least one allowed country is required" };
  }

  return { ok: true, countries };
}

function parseAllowedSourceIps(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

// Validate the admin-supplied source-IP allowlist. undefined means "leave
// unchanged" (PATCH); an empty array clears the allowlist (no restriction). Each
// entry must be a valid IPv4/IPv6 address or CIDR, normalized for storage.
function normalizeAllowedSourceIpsInput(value: unknown):
  | { ok: true; sourceIps?: string[] }
  | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, sourceIps: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "Allowed source IPs must be an array" };
  }

  const seen = new Set<string>();
  const sourceIps: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: "Allowed source IPs must contain only strings" };
    }

    const trimmed = item.trim();
    if (!trimmed) continue;

    const normalized = normalizeSourceIpEntry(trimmed);
    if (!normalized) {
      return { ok: false, error: `Invalid IP or CIDR: ${item}` };
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      sourceIps.push(normalized);
    }
  }

  return { ok: true, sourceIps };
}

function parseOperationLogDetail(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function randomPassword(): string {
  return randomBytes(12).toString("base64url");
}

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Only bind the port and install process-level handlers when run as a real
// server. Integration tests import this module for supertest and set
// API_DISABLE_LISTEN=1 so they neither open a port nor register signal/exit
// handlers that would call process.exit during the test run.
if (process.env.API_DISABLE_LISTEN !== "1") {
  const server = app.listen(port, () => {
    console.info(`API listening on ${port}`);
    const provider = getDatabaseProvider();
    const profile =
      provider === "postgresql"
        ? "Deployment profile: PostgreSQL (connection-pooled, concurrent writers). "
        : "Deployment profile: small-scale (SQLite single-writer, busy_timeout=10s). " +
          "Concurrent proxy connections are bounded by SQLite write throughput; ";
    console.info(
      profile +
        `XFF trust is ${TRUST_PROXY ? "ON (behind trusted reverse proxy)" : "OFF (using socket peer for rate-limit key)"}.`
    );
  });

  // Last-resort process guards so an unexpected throw/rejection logs instead of
  // silently killing the API process during long-running operation.
  process.on("uncaughtException", (error) => {
    console.error(`API uncaughtException: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  });
  process.on("unhandledRejection", (reason) => {
    console.error(`API unhandledRejection: ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`);
  });

  // Graceful shutdown: stop accepting requests, then close the DB connection so a
  // deploy/restart does not interrupt in-flight requests or leave handles open.
  let apiShuttingDown = false;
  const shutdownApi = (signal: string): void => {
    if (apiShuttingDown) return;
    apiShuttingDown = true;
    console.info(`API received ${signal}, shutting down gracefully`);
    const timer = setTimeout(() => {
      console.warn("API graceful shutdown timed out; forcing exit");
      process.exit(0);
    }, 10_000);
    timer.unref();
    server.close(() => {
      void prisma.$disconnect().finally(() => {
        console.info("API closed; exiting");
        process.exit(0);
      });
    });
  };
  process.on("SIGTERM", () => shutdownApi("SIGTERM"));
  process.on("SIGINT", () => shutdownApi("SIGINT"));
}
