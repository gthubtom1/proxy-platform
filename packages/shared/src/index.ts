import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

export const SUPPORTED_COUNTRIES = ["us", "gb", "fr", "ca", "au"] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

export const DEFAULT_PROXY_GATEWAY_PORT = 18001;
export const DEFAULT_SCAN_BATCH_SIZE = 50;
export const DEFAULT_SCAN_CONCURRENCY = 10;
export const DEFAULT_SCAN_TIMEOUT_MS = 15_000;
export const DEFAULT_GEO_CACHE_TTL_MS = 24 * 60 * 60_000;
export const DEFAULT_SCAN_INTERVAL_MS = 10 * 60_000;

export const SCAN_ERROR_TYPES = [
  "decrypt_failed",
  "timeout",
  "auth_failed",
  // Provider-side throttle / quota / billing rejection (HTTP 402/429/503).
  // Transient — usually means we exceeded the upstream account's concurrent-session
  // limit — so it must not count toward marking an upstream bad.
  "rate_limited",
  "connect_failed",
  "connect_aborted",
  "empty_reply",
  "dns_failed",
  "ip_lookup_failed",
  "unsupported_country",
  "unknown_error"
] as const;

export type ScanErrorType = (typeof SCAN_ERROR_TYPES)[number];

// The gateway forwards user traffic through a shared upstream-provider account.
// When the provider throttles or bills-blocks that shared account it answers the
// user's live request with 402 (payment/quota) or 429 (rate limit). That status
// is about OUR account, not the end user, so the gateway must not pass it through
// verbatim — it cools the upstream and surfaces a uniform 503 + Retry-After so a
// reconnect rebinds to a different upstream.
export function isProviderThrottleStatus(statusCode: number): boolean {
  return statusCode === 402 || statusCode === 429;
}

// Seconds advertised in Retry-After when masking a provider throttle as 503. Kept
// short because the cooled upstream is replaced by a fresh one on the next connect.
export const PROVIDER_THROTTLE_RETRY_AFTER_SECONDS = 30;

// Bound the number of async tasks running at once through a shared gate. Extra
// calls queue and start as running ones settle (on both fulfilment and rejection),
// so a burst can never exceed `maxConcurrent`. Used to cap the API's per-extraction
// geo re-check (~2.5s network I/O each): a burst of simultaneous extractions ran
// them all at once and spiked memory enough for pm2 to restart the API mid-burst.
// A non-positive/!integer limit is clamped to 1 (fully serialized).
export function createConcurrencyLimiter(
  maxConcurrent: number
): <T>(task: () => Promise<T>) => Promise<T> {
  const limit = Number.isInteger(maxConcurrent) && maxConcurrent > 0 ? maxConcurrent : 1;
  let active = 0;
  const queue: Array<() => void> = [];

  const pump = (): void => {
    while (active < limit && queue.length > 0) {
      const start = queue.shift();
      if (!start) break;
      active += 1;
      start();
    }
  };

  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        // Defer the task so a synchronous throw is still funneled through the
        // promise chain (and the slot is always released exactly once).
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            pump();
          });
      });
      pump();
    });
  };
}

export function normalizeCountry(input: string): SupportedCountry | null {
  const value = input.trim().toLowerCase().replace(/\s+/g, "");
  const aliases: Record<string, SupportedCountry> = {
    unitedstates: "us",
    usa: "us",
    us: "us",
    unitedkingdom: "gb",
    greatbritain: "gb",
    uk: "gb",
    gb: "gb",
    france: "fr",
    fr: "fr",
    canada: "ca",
    ca: "ca",
    australia: "au",
    au: "au"
  };

  return aliases[value] ?? null;
}

export function normalizeRegion(input: string | null | undefined): string | null {
  if (!input) return null;
  return input.trim().toLowerCase().replace(/[\s.,()]+/g, "") || null;
}

export function normalizeCity(input: string | null | undefined): string | null {
  if (!input) return null;
  return input.trim().toLowerCase().replace(/[\s.,()]+/g, "") || null;
}

export function isValidIpv4(input: string): boolean {
  const parts = input.trim().split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const value = Number(part);
    // Reject leading zeros ("01", "007") by requiring the octet to already be in
    // its canonical decimal form: compare against the raw part, not a normalized
    // copy. "0" stays valid (String(0) === "0").
    return value >= 0 && value <= 255 && String(value) === part;
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

export { SlidingWindowRateLimiter } from "./rate-limit.js";
export type { SlidingWindowRateLimiterOptions } from "./rate-limit.js";
export { isIpInAllowlist, normalizeSourceIpEntry } from "./ip-allowlist.js";

export type ParsedUpstreamProxy = {
  host: string;
  port: number;
  username: string;
  password: string;
};

export type UpstreamParseResult =
  | {
      ok: true;
      lineNumber: number;
      value: ParsedUpstreamProxy;
      source: "colon" | "url" | "geolocation";
    }
  | {
      ok: false;
      lineNumber: number;
      input: string;
      error: string;
    };

export function parseUpstreamProxyLine(input: string, lineNumber = 1): UpstreamParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, lineNumber, input, error: "Line is empty" };
  }

  if (trimmed.startsWith("http://")) {
    return parseUrlUpstream(trimmed, lineNumber, input);
  }

  if (trimmed.startsWith("geolocation://")) {
    return parseGeolocationUpstream(trimmed, lineNumber, input);
  }

  return parseColonUpstream(trimmed, lineNumber, input);
}

export function parseUpstreamProxyText(text: string): UpstreamParseResult[] {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .map(({ line, lineNumber }) => parseUpstreamProxyLine(line, lineNumber));
}

function parseColonUpstream(trimmed: string, lineNumber: number, input: string): UpstreamParseResult {
  const parts = trimmed.split(":");
  if (parts.length < 4) {
    return {
      ok: false,
      lineNumber,
      input,
      error: "Expected host:port:username:password"
    };
  }

  const [host, portText, username, ...passwordParts] = parts;
  return validateParsedUpstream(
    {
      host: host.trim(),
      portText: portText.trim(),
      username: username.trim(),
      password: passwordParts.join(":").trim()
    },
    lineNumber,
    input,
    "colon"
  );
}

function parseUrlUpstream(trimmed: string, lineNumber: number, input: string): UpstreamParseResult {
  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "http:") {
      return { ok: false, lineNumber, input, error: "Only http:// upstream proxies are supported" };
    }

    return validateParsedUpstream(
      {
        host: parsed.hostname,
        portText: parsed.port,
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password)
      },
      lineNumber,
      input,
      "url"
    );
  } catch {
    return { ok: false, lineNumber, input, error: "Invalid http:// upstream URL" };
  }
}

function parseGeolocationUpstream(trimmed: string, lineNumber: number, input: string): UpstreamParseResult {
  try {
    const withoutProtocol = trimmed.slice("geolocation://".length);
    const atIndex = withoutProtocol.lastIndexOf("@");
    if (atIndex === -1) {
      return { ok: false, lineNumber, input, error: "Invalid geolocation proxy URL" };
    }

    const credentials = withoutProtocol.slice(0, atIndex);
    const hostPortCountry = withoutProtocol.slice(atIndex + 1);
    const credentialSeparator = credentials.indexOf(":");
    if (credentialSeparator === -1) {
      return { ok: false, lineNumber, input, error: "Geolocation proxy username/password is required" };
    }

    const hostParts = hostPortCountry.split(":");
    if (hostParts.length < 2) {
      return { ok: false, lineNumber, input, error: "Geolocation proxy host/port is required" };
    }

    return validateParsedUpstream(
      {
        host: hostParts[0].trim(),
        portText: hostParts[1].trim(),
        username: decodeURIComponent(credentials.slice(0, credentialSeparator)),
        password: decodeURIComponent(credentials.slice(credentialSeparator + 1))
      },
      lineNumber,
      input,
      "geolocation"
    );
  } catch {
    return { ok: false, lineNumber, input, error: "Invalid geolocation proxy URL" };
  }
}

function validateParsedUpstream(
  value: { host: string; portText: string; username: string; password: string },
  lineNumber: number,
  input: string,
  source: "colon" | "url" | "geolocation"
): UpstreamParseResult {
  const port = Number(value.portText);

  if (!value.host) {
    return { ok: false, lineNumber, input, error: "Host is required" };
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, lineNumber, input, error: "Port must be 1-65535" };
  }

  if (!value.username) {
    return { ok: false, lineNumber, input, error: "Username is required" };
  }

  if (!value.password) {
    return { ok: false, lineNumber, input, error: "Password is required" };
  }

  return {
    ok: true,
    lineNumber,
    value: {
      host: value.host,
      port,
      username: value.username,
      password: value.password
    },
    source
  };
}

// ---------- Runtime app settings (file-backed, editable from admin) ----------

export type AppSettings = {
  scanIntervalMs: number;
  scanBatchSize: number;
  scanConcurrency: number;
  scanTimeoutMs: number;
  geoCacheTtlMs: number;
  idleReleaseMinutes: number;
  minHoldMinutes: number;
  idleReleaseIntervalMs: number;
  // How many consecutive scan failures move an upstream from the retry pool
  // (cooldown) into the manual-review pool (bad), and how long an upstream waits
  // in cooldown before it is retried.
  maxScanFailures: number;
  cooldownMs: number;
  // Dedicated, longer cooldown for provider throttle (HTTP 402/429/503). A
  // rate_limited result means the upstream PROVIDER is quota/concurrency limiting
  // us, not that the upstream is dead; re-probing it after the short generic
  // cooldown just re-burns the provider's quota and keeps the retry pool full, so
  // throttled upstreams wait minutes (not seconds) before the next probe.
  rateLimitedCooldownMs: number;
  // Fast lane: how often the worker re-scans only the in-use (locked) upstreams
  // so an active user's displayed exit IP stays fresh, independent of the slower
  // full-pool sweep (scanIntervalMs).
  lockedScanIntervalMs: number;
  // 稳定性评分重算间隔（worker 评分 loop 周期）。
  stabilityIntervalMs: number;
  // 使用保护窗口：upstream 绑定的 entry 最后使用后多少分钟内不参与检测，
  // 避免检测连接干扰正在 / 最近使用的代理（0 表示关闭保护）。
  usageProtectMinutes: number;
  // 机房/代理标签新鲜度阈值：当一次扫描只回 unknown 且库里是 hosting/proxy 这类
  // 非住宅标签、且该标签已超过此时长未再确认时，即使出口 IP 没变也降级为 unknown
  // （fail-open=住宅），让陈旧的“假机房”及时回流。越短机房纠正越快。
  ipTypeStaleMs: number;
  // ---- 地理为主的稳定性分级（REQ-114 P2）----
  // 稳定性评分的地理滑动窗口：任何时刻往回看这么久的 scan_logs，算“主导州占比”。
  // 越长越鲁棒（不易被一两天假稳骗），但新上游要攒满才能进高级。默认 3 天。
  stabilityWindowMs: number;
  // 高级纯净（static）所需最低“主导州占比”（百分比，默认 99 = 近窗口 99% 样本同一个州）。
  geoPremiumSharePct: number;
  // 普通纯净（quasi）所需最低“主导州占比”（百分比，默认 90）。低于此为动态住宅。
  geoNormalSharePct: number;
  // 判“高级”所需的最小窗口样本量：历史不足时最多给“普通”，避免新上游一上来就被判高级。
  geoMinSamples: number;
};

export const DEFAULT_SCAN_MAX_FAILURES = 3;
export const DEFAULT_SCAN_COOLDOWN_MS = 10 * 60_000;
export const DEFAULT_RATE_LIMITED_COOLDOWN_MS = 5 * 60_000;
export const DEFAULT_LOCKED_SCAN_INTERVAL_MS = 2 * 60_000;
export const DEFAULT_STABILITY_INTERVAL_MS = 30 * 60_000;
export const DEFAULT_USAGE_PROTECT_MINUTES = 10;
export const DEFAULT_IP_TYPE_STALE_MS = 60 * 60_000;
// Geo-first grading (REQ-114 P2): 3-day sliding window, 99% premium / 90% normal,
// and a minimum sample count before an upstream can be graded premium.
export const DEFAULT_STABILITY_WINDOW_MS = 3 * 24 * 60 * 60_000;
export const DEFAULT_GEO_PREMIUM_SHARE_PCT = 99;
export const DEFAULT_GEO_NORMAL_SHARE_PCT = 90;
export const DEFAULT_GEO_MIN_SAMPLES = 6;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  scanIntervalMs: DEFAULT_SCAN_INTERVAL_MS,
  scanBatchSize: DEFAULT_SCAN_BATCH_SIZE,
  scanConcurrency: DEFAULT_SCAN_CONCURRENCY,
  scanTimeoutMs: DEFAULT_SCAN_TIMEOUT_MS,
  geoCacheTtlMs: DEFAULT_GEO_CACHE_TTL_MS,
  idleReleaseMinutes: 30,
  minHoldMinutes: 15,
  idleReleaseIntervalMs: DEFAULT_SCAN_INTERVAL_MS,
  maxScanFailures: DEFAULT_SCAN_MAX_FAILURES,
  cooldownMs: DEFAULT_SCAN_COOLDOWN_MS,
  rateLimitedCooldownMs: DEFAULT_RATE_LIMITED_COOLDOWN_MS,
  lockedScanIntervalMs: DEFAULT_LOCKED_SCAN_INTERVAL_MS,
  stabilityIntervalMs: DEFAULT_STABILITY_INTERVAL_MS,
  usageProtectMinutes: DEFAULT_USAGE_PROTECT_MINUTES,
  ipTypeStaleMs: DEFAULT_IP_TYPE_STALE_MS,
  stabilityWindowMs: DEFAULT_STABILITY_WINDOW_MS,
  geoPremiumSharePct: DEFAULT_GEO_PREMIUM_SHARE_PCT,
  geoNormalSharePct: DEFAULT_GEO_NORMAL_SHARE_PCT,
  geoMinSamples: DEFAULT_GEO_MIN_SAMPLES
};

type AppSettingBound = { min: number; max: number };

export const APP_SETTING_BOUNDS: Record<keyof AppSettings, AppSettingBound> = {
  scanIntervalMs: { min: 60_000, max: 24 * 60 * 60_000 },
  // Upper bounds raised now that local geo lookups are instant and unthrottled:
  // a single large, highly concurrent batch can sweep thousands of upstreams in
  // minutes instead of being capped by the old online-API rate limits.
  scanBatchSize: { min: 1, max: 5000 },
  // Hard cap the configurable ceiling: every upstream in this pool is one
  // provider account (FloppyData), so a huge concurrency is self-inflicted
  // throttle (HTTP 402) rather than speed. The adaptive controller ramps toward
  // this ceiling only while the provider stays clean.
  scanConcurrency: { min: 1, max: 50 },
  scanTimeoutMs: { min: 1_000, max: 120_000 },
  geoCacheTtlMs: { min: 60_000, max: 30 * 24 * 60 * 60_000 },
  idleReleaseMinutes: { min: 1, max: 7 * 24 * 60 },
  minHoldMinutes: { min: 0, max: 7 * 24 * 60 },
  idleReleaseIntervalMs: { min: 60_000, max: 24 * 60 * 60_000 },
  maxScanFailures: { min: 1, max: 100 },
  // Allow second-level retry cooldown (floor 5s) for fast recovery of transiently
  // failed upstreams; still up to 24h at the top end.
  cooldownMs: { min: 5_000, max: 24 * 60 * 60_000 },
  // Provider-throttle backoff: at least 30s, up to 1h. Defaults to minutes so a
  // 402 burst is not re-probed every few seconds.
  rateLimitedCooldownMs: { min: 30_000, max: 60 * 60_000 },
  lockedScanIntervalMs: { min: 30_000, max: 60 * 60_000 },
  stabilityIntervalMs: { min: 60_000, max: 24 * 60 * 60_000 },
  usageProtectMinutes: { min: 0, max: 24 * 60 },
  // ip_type freshness: at least 5 minutes (so a real datacenter re-confirmed each
  // sweep is never wrongly downgraded), up to 24h.
  ipTypeStaleMs: { min: 5 * 60_000, max: 24 * 60 * 60_000 },
  // Geo window: 1 day (responsive) up to 14 days (very robust).
  stabilityWindowMs: { min: 24 * 60 * 60_000, max: 14 * 24 * 60 * 60_000 },
  // Dominant-state share percentages. Premium floor stays survey-strict (>=50%),
  // normal floor can go as low as 1% (effectively "any residential is at least normal").
  geoPremiumSharePct: { min: 50, max: 100 },
  geoNormalSharePct: { min: 1, max: 100 },
  // Minimum window samples before premium is allowed (1..10000).
  geoMinSamples: { min: 1, max: 10_000 }
};

function clampSetting(key: keyof AppSettings, value: unknown): number {
  const bound = APP_SETTING_BOUNDS[key];
  const fallback = DEFAULT_APP_SETTINGS[key];
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(bound.max, Math.max(bound.min, parsed));
}

export function normalizeAppSettings(input: Partial<Record<keyof AppSettings, unknown>>): AppSettings {
  const result = { ...DEFAULT_APP_SETTINGS };
  for (const key of Object.keys(DEFAULT_APP_SETTINGS) as (keyof AppSettings)[]) {
    if (input[key] !== undefined && input[key] !== null) {
      result[key] = clampSetting(key, input[key]);
    }
  }
  return result;
}

// Walk up from this module to the monorepo root (the package.json named
// "proxy-platform"). Anchoring to the module location instead of process.cwd()
// keeps path resolution identical no matter which service/cwd is running.
function findWorkspaceRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 12; i++) {
    try {
      const pkg = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8")) as {
        name?: string;
        workspaces?: unknown;
      };
      if (pkg.name === "proxy-platform" || pkg.workspaces) return dir;
    } catch {
      // no package.json here; keep walking up
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

// Absolute directory that holds the SQLite DB and its sibling files
// (auth-secret.key, app-settings.json). A relative file: DATABASE_URL is
// resolved against the workspace root (matching Prisma's schema-relative
// ../../../data convention) so every service agrees on one location even when
// launched from different working directories.
export function resolveDataDir(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl?.startsWith("file:")) {
    const dbPath = databaseUrl.slice("file:".length);
    if (isAbsolute(dbPath)) return dirname(dbPath);
    return resolve(findWorkspaceRoot(), "data");
  }
  return resolve(findWorkspaceRoot(), "data");
}

export function resolveAppSettingsPath(): string {
  const explicit = process.env.APP_SETTINGS_PATH?.trim();
  if (explicit) return resolve(explicit);
  return resolve(resolveDataDir(), "app-settings.json");
}

export async function readAppSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(resolveAppSettingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Record<keyof AppSettings, unknown>>;
    return normalizeAppSettings(parsed);
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

// Serialize all writes in this process so a concurrent read-modify-write pair
// can't lose updates (the second writer would otherwise overwrite the first
// using a stale snapshot). Cross-process safety still relies on the atomic
// rename below; admin settings edits are low-frequency and single-instance.
let appSettingsWriteChain: Promise<unknown> = Promise.resolve();
let appSettingsTmpCounter = 0;

export async function writeAppSettings(
  input: Partial<Record<keyof AppSettings, unknown>>
): Promise<AppSettings> {
  const run = appSettingsWriteChain.then(async () => {
    const current = await readAppSettings();
    const next = normalizeAppSettings({ ...current, ...input });
    const filePath = resolveAppSettingsPath();
    await mkdir(dirname(filePath), { recursive: true });

    // Write to a unique temp file in the same directory, then atomically rename
    // over the target. A crash mid-write can only leave an orphan temp file, not
    // a truncated/corrupt settings file that would silently reset every setting.
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${appSettingsTmpCounter++}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    await rename(tmpPath, filePath);
    return next;
  });

  // Keep the chain alive even if this write fails, so later writes still run.
  appSettingsWriteChain = run.catch(() => undefined);
  return run;
}

// ---------- Adaptive concurrency (AIMD) for throttled batch work ----------

export type AdaptiveMapOptions = {
  // Upper bound on concurrent in-flight mappers. The effective concurrency starts
  // here and is reduced when results come back "throttled".
  maxConcurrency: number;
  // Floor the effective concurrency never drops below (default 1).
  minConcurrency?: number;
  // Fraction of a chunk that must be throttled to trigger a back-off (default 0.2).
  throttleRatio?: number;
  // How long to pause after a throttled chunk so the upstream can recover (ms).
  backoffMs?: number;
  // Injectable sleep so tests run instantly.
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Map over items with adaptive concurrency (AIMD). Items are processed in chunks
 * of the current effective concurrency. After each chunk:
 *  - if too many results were "throttled" (isThrottled === true), the concurrency
 *    is halved (down to minConcurrency) and we pause for backoffMs — this backs
 *    off automatically when an upstream provider rate-limits us (HTTP 402/429/503);
 *  - if the chunk was completely clean, concurrency ramps back up toward
 *    maxConcurrency.
 * Results are returned in the original item order. The mapper is expected not to
 * throw (callers should resolve to a result object describing success/failure).
 */
export async function mapAdaptive<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>,
  isThrottled: (result: R) => boolean,
  options: AdaptiveMapOptions
): Promise<R[]> {
  const maxConcurrency = Math.max(1, Math.floor(options.maxConcurrency));
  const minConcurrency = Math.max(1, Math.min(Math.floor(options.minConcurrency ?? 1), maxConcurrency));
  const throttleRatio = options.throttleRatio ?? 0.2;
  const backoffMs = options.backoffMs ?? 3000;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolveSleep) => setTimeout(resolveSleep, ms)));

  const results = new Array<R>(items.length);
  let concurrency = maxConcurrency;
  let index = 0;

  while (index < items.length) {
    const end = Math.min(index + concurrency, items.length);
    const size = end - index;
    let throttled = 0;

    await Promise.all(
      Array.from({ length: size }, (_, offset) => {
        const itemIndex = index + offset;
        return mapper(items[itemIndex]).then((result) => {
          results[itemIndex] = result;
          if (isThrottled(result)) throttled += 1;
        });
      })
    );

    index = end;
    const ratio = size > 0 ? throttled / size : 0;

    if (ratio >= throttleRatio) {
      // Provider is pushing back: shrink concurrency and pause before the next
      // chunk so we stop hammering it. Pause even when already at the floor.
      concurrency = Math.max(minConcurrency, Math.floor(concurrency / 2));
      await sleep(backoffMs);
    } else if (ratio === 0 && concurrency < maxConcurrency) {
      // Clean chunk: ramp concurrency back up toward the configured maximum.
      concurrency = Math.min(maxConcurrency, concurrency + Math.max(1, Math.floor(concurrency / 2)));
    }
  }

  return results;
}

// ---------- Persistent adaptive concurrency controller (cross-batch AIMD) ----------
//
// mapAdaptive adapts WITHIN a single batch and resets on every call, always
// starting at the configured maximum — so a high configured concurrency still
// fires one full-size burst before backing off, and the safe level it learns is
// forgotten by the next batch. Against a single upstream provider that throttles
// with HTTP 402/429/503, that "start at max every batch" behavior re-triggers the
// throttle each cycle and keeps the retry pool full.
//
// This controller keeps a PERSISTENT effective concurrency across batches (and is
// shared by the worker's full + fast scan lanes, so their combined pressure on the
// one provider is governed by a single budget). It starts low, ramps up by a small
// additive step after a clean batch, and multiplicatively backs off after any
// throttled batch — classic AIMD, like TCP congestion control. The configured
// scanConcurrency becomes the CEILING it may ramp toward, not the burst it opens with.
export type AdaptiveConcurrencyOptions = {
  // Lowest effective concurrency the controller will drop to (>= 1).
  min: number;
  // Ceiling the controller may ramp up to (the admin scanConcurrency setting).
  max: number;
  // Initial effective concurrency (defaults to min, i.e. start conservative).
  start?: number;
  // Additive increase applied after a clean batch (default 1).
  increaseStep?: number;
  // Multiplicative factor applied after a throttled batch (default 0.5).
  decreaseFactor?: number;
};

export class AdaptiveConcurrencyController {
  private minConcurrency: number;
  private maxConcurrency: number;
  private readonly increaseStep: number;
  private readonly decreaseFactor: number;
  private effective: number;

  constructor(options: AdaptiveConcurrencyOptions) {
    this.minConcurrency = Math.max(1, Math.floor(options.min));
    this.maxConcurrency = Math.max(this.minConcurrency, Math.floor(options.max));
    this.increaseStep = Math.max(1, Math.floor(options.increaseStep ?? 1));
    this.decreaseFactor = Math.min(0.95, Math.max(0.1, options.decreaseFactor ?? 0.5));
    this.effective = this.clamp(options.start ?? this.minConcurrency);
  }

  private clamp(value: number): number {
    return Math.min(this.maxConcurrency, Math.max(this.minConcurrency, Math.floor(value)));
  }

  // Track admin changes to the floor/ceiling without resetting the learned level
  // beyond what the new bounds require.
  setBounds(min: number, max: number): void {
    this.minConcurrency = Math.max(1, Math.floor(min));
    this.maxConcurrency = Math.max(this.minConcurrency, Math.floor(max));
    this.effective = this.clamp(this.effective);
  }

  current(): number {
    return this.effective;
  }

  // Feed back one batch outcome. throttled=true (any 402/429/503 in the batch)
  // halves the budget; a fully clean batch nudges it up by one step. Returns the
  // new effective concurrency.
  record(throttled: boolean): number {
    if (throttled) {
      this.effective = this.clamp(Math.floor(this.effective * this.decreaseFactor));
    } else {
      this.effective = this.clamp(this.effective + this.increaseStep);
    }
    return this.effective;
  }
}

// Whether a full-lane sweep's provider-throttle (HTTP 402/429/503) level is high
// enough to PERSISTENTLY back off the cross-batch concurrency budget. Unlike the
// old "any single 402 halves the budget" rule, this only persists a backoff when
// the throttled FRACTION of the sweep crosses a threshold — so a small steady
// tail of already-throttled upstreams being retried does NOT permanently suppress
// the budget and starve healthy detection. Pure for unit testing.
export function shouldBackoffOnThrottle(
  rateLimitedCount: number,
  totalCount: number,
  ratioThreshold: number
): boolean {
  if (totalCount <= 0) return false;
  return rateLimitedCount / totalCount >= ratioThreshold;
}

// ---------- Stability scoring (geo-first, for survey-friendly selection) ----------
//
// REQ-114 P2: 分级以"地理一致性"为唯一主轴，丢弃了原来的"IP 轮转速度分"。
// 原因（线上证据）：① 问卷/登录只在乎出口"同州/同城、不跨州"，不在乎同一个 IP 是否
// 长期不变（货源决定了 IP 必然轮转）；② 全池采样太稀（一轮约 1.5h、idle 上游 24h 才被
// 扫几次），"IP 轮转速度"根本测不准，却把真正"一直同州"的好货误判成普通/动态 → 高级越
// 来越少。新主轴 = 滑动窗口内"主导州占比"（出现最多的那个州的样本占比），对稀采样和偶发
// 抖动都鲁棒。IP 持有下限（别太快变）改由"提取那一刻验证"兜底（P3），不再进评分。纯函数。

export const STABILITY_TIER_STATIC = "static";
export const STABILITY_TIER_QUASI = "quasi";
export const STABILITY_TIER_DYNAMIC = "dynamic";
export const STABILITY_TIER_UNKNOWN = "unknown";

export type StabilitySample = {
  // 窗口内带 region 的成功观测总数（= 主导州占比的分母；也代表历史厚度）。
  sampleCount: number;
  // 主导州占比 0-1：窗口内出现最多的那个 region 的样本数 / sampleCount。地理一致性主轴。
  dominantRegionShare: number;
  // 整体成功率 successCount/(success+fail)，0-1。可用性门控：经常连不上的上游
  // 再"地理稳定"也不能进问卷池。缺省 1（无样本时不惩罚）。
  successRate?: number;
};

// 分级阈值（可由 admin 设置注入；缺省 = 用户定稿值）。
export type GeoStabilityThresholds = {
  // 高级（static）最低主导州占比 0-1（默认 0.99）。
  premiumShare?: number;
  // 普通（quasi）最低主导州占比 0-1（默认 0.90），低于此为动态。
  normalShare?: number;
  // 判高级所需最小样本量（默认 6）：不足则最多普通，避免新上游一上来就高级。
  minSamples?: number;
};

export type StabilityResult = {
  score: number;
  tier: string;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function computeStabilityScore(
  sample: StabilitySample,
  thresholds: GeoStabilityThresholds = {}
): StabilityResult {
  const premiumShare = clamp01(thresholds.premiumShare ?? DEFAULT_GEO_PREMIUM_SHARE_PCT / 100);
  const normalShare = clamp01(thresholds.normalShare ?? DEFAULT_GEO_NORMAL_SHARE_PCT / 100);
  const minSamples = Math.max(0, Math.floor(thresholds.minSamples ?? DEFAULT_GEO_MIN_SAMPLES));

  const sampleCount = Math.max(0, Math.floor(sample.sampleCount));
  const share = clamp01(sample.dominantRegionShare);
  const successRate = typeof sample.successRate === "number" ? sample.successRate : 1;

  // 评分 = 主导州占比百分比（0-100），用于排序："越地理锁定"越优先发出。
  const score = Math.round(share * 100);

  let tier: string;
  if (successRate < 0.7) {
    // 可用性硬门：经常连不上的，地理再锁定也是动态。
    tier = STABILITY_TIER_DYNAMIC;
  } else if (sampleCount < minSamples) {
    // 历史不足以证明地理锁定：最多给普通（不进高级池），让新上游攒满再升。
    tier = share >= normalShare ? STABILITY_TIER_QUASI : STABILITY_TIER_DYNAMIC;
  } else if (share >= premiumShare) {
    tier = STABILITY_TIER_STATIC;
  } else if (share >= normalShare) {
    tier = STABILITY_TIER_QUASI;
  } else {
    tier = STABILITY_TIER_DYNAMIC;
  }

  // 可用性软门：地理锁定但成功率 70-90%，从高级降一档为普通。
  if (tier === STABILITY_TIER_STATIC && successRate < 0.9) {
    tier = STABILITY_TIER_QUASI;
  }
  return { score, tier };
}

// ---------- Extraction grades (line type × stability, mutually exclusive) ----------
//
// The user-facing picker is two line types (residential / datacenter), each with
// stability sub-grades. Grades are mutually exclusive so picking one never
// overlaps another's pool. Residential grades additionally exclude proxy-flagged
// IPs ("clean"); every proxy-flagged IP collapses into one "flagged" grade
// regardless of stability (a flagged IP is the survey risk, stability is moot).
// Datacenter splits only static vs non-static (quasi+dynamic).

export const EXTRACT_GRADE_RESI_PREMIUM = "resi_premium"; // 高级纯净住宅: residential·static·未标记proxy
export const EXTRACT_GRADE_RESI_NORMAL = "resi_normal"; // 普通纯净住宅: residential·quasi·未标记proxy
export const EXTRACT_GRADE_RESI_DYNAMIC = "resi_dynamic"; // 动态住宅: residential·dynamic·未标记proxy
export const EXTRACT_GRADE_PROXY_FLAGGED = "proxy_flagged"; // 代理标记IP: ip_type=proxy（static 优先）
export const EXTRACT_GRADE_DC_STATIC = "dc_static"; // 稳定机房: hosting·static
export const EXTRACT_GRADE_DC_DYNAMIC = "dc_dynamic"; // 动态机房: hosting·非static

export const EXTRACT_GRADES = [
  EXTRACT_GRADE_RESI_PREMIUM,
  EXTRACT_GRADE_RESI_NORMAL,
  EXTRACT_GRADE_RESI_DYNAMIC,
  EXTRACT_GRADE_PROXY_FLAGGED,
  EXTRACT_GRADE_DC_STATIC,
  EXTRACT_GRADE_DC_DYNAMIC
] as const;

export type ExtractGrade = (typeof EXTRACT_GRADES)[number];

// Which upstream pool an extraction grade draws from, plus the stability-tier
// constraint within it. `pool` maps to an ip_type predicate; `tier` is an exact
// stabilityTier, the special "not_static" (quasi OR dynamic), or null (any tier).
export type ExtractGradeSpec = {
  pool: "residential" | "hosting" | "proxy";
  tier: "static" | "quasi" | "dynamic" | "not_static" | null;
};

export function resolveExtractGrade(grade: string | null | undefined): ExtractGradeSpec | null {
  switch (grade) {
    case EXTRACT_GRADE_RESI_PREMIUM:
      return { pool: "residential", tier: STABILITY_TIER_STATIC };
    case EXTRACT_GRADE_RESI_NORMAL:
      return { pool: "residential", tier: STABILITY_TIER_QUASI };
    case EXTRACT_GRADE_RESI_DYNAMIC:
      return { pool: "residential", tier: STABILITY_TIER_DYNAMIC };
    case EXTRACT_GRADE_PROXY_FLAGGED:
      return { pool: "proxy", tier: null };
    case EXTRACT_GRADE_DC_STATIC:
      return { pool: "hosting", tier: STABILITY_TIER_STATIC };
    case EXTRACT_GRADE_DC_DYNAMIC:
      return { pool: "hosting", tier: "not_static" };
    default:
      return null;
  }
}

// Static-class grades worth a real-time geo re-check on single extraction (the
// user expects geo stability): premium/normal clean residential + static DC.
// Dynamic and proxy-flagged grades skip the check (they are not geo-promised).
export function isStaticExtractGrade(grade: string | null | undefined): boolean {
  return (
    grade === EXTRACT_GRADE_RESI_PREMIUM ||
    grade === EXTRACT_GRADE_RESI_NORMAL ||
    grade === EXTRACT_GRADE_DC_STATIC
  );
}

// Geo drift at the region (state) level — survey policy locks state, not city.
// `expected` is the user's pinned region (or the region the entry was bound to);
// no expectation means nothing to drift from. A missing detected region when one
// was expected counts as drift (cannot confirm stability, so re-roll).
export function isRegionDrift(detected: string | null | undefined, expected: string | null | undefined): boolean {
  const exp = normalizeRegion(expected ?? undefined);
  if (!exp) return false;
  const det = normalizeRegion(detected ?? undefined);
  if (!det) return true;
  return det !== exp;
}
