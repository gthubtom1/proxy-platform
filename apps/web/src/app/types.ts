export type Surface = "admin" | "user";

export type AuthUser = {
  id: number;
  username: string;
  role: "admin" | "user";
};

export type User = {
  id: number;
  username: string;
  role: string;
  status: string;
  trafficQuotaBytes: string;
  trafficUsedBytes: string;
  trafficQuotaHostingBytes: string;
  trafficUsedHostingBytes: string;
  allowedCountries: string[];
  allowedSourceIps: string[];
  maxProxyEntries: number;
  maxConcurrentConnections: number;
  proxyEntryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ScanLog = {
  id: number;
  success: boolean;
  exitIp: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latencyMs: number | null;
  errorType: string | null;
  message: string | null;
  createdAt: string;
};

export type Upstream = {
  id: number;
  host: string;
  port: number;
  username: string | null;
  status: string;
  currentIp: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  ipType: string | null;
  latencyMs: number | null;
  score: number | null;
  stabilityTier: string | null;
  stabilityScore: number | null;
  stableSince: string | null;
  failCount: number;
  successCount: number;
  lastErrorType: string | null;
  lastCheckedAt: string | null;
  cooldownUntil: string | null;
  createdAt: string;
  updatedAt: string;
  scanLogs: ScanLog[];
};

export type ProxyEntry = {
  id: number;
  userId: number;
  username: string;
  targetCountry: string;
  targetRegion: string | null;
  targetCity: string | null;
  currentUpstreamId: number | null;
  currentIp: string | null;
  currentCountry: string | null;
  currentRegion: string | null;
  currentCity: string | null;
  status: string;
  trafficUsedBytes: string;
  activeConnections: number;
  lastUsedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    status: string;
    trafficQuotaBytes: string;
    trafficUsedBytes: string;
  };
  lockedUpstream: {
    id: number;
    status: string;
    currentIp: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    latencyMs: number | null;
    lastCheckedAt: string | null;
  } | null;
};

export type OperationLog = {
  id: number;
  actorUserId: number | null;
  action: string;
  targetType: string;
  targetId: string;
  detail: unknown;
  createdAt: string;
  actor: { id: number; username: string; role: string } | null;
};

export type Gateway = {
  host: string;
  port: number;
};

export type SystemConfig = {
  gatewayHost: string;
  gatewayPort: number;
  supportedCountries: string[];
  scanBatchSize: number;
  scanConcurrency: number;
  scanTimeoutMs: number;
  scanIntervalMs: number;
  geoCacheTtlMs: number;
  maxScanFailures: number;
  cooldownMs: number;
  workerRepeat: boolean;
  backupStatus: string;
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

export type ClientProxy = {
  proxyEntryId?: number;
  host: string;
  port: number;
  username: string;
  password: string;
  copyText: string;
  ipInfo?: IpInfo | null;
  // ISO start of the bound upstream's continuous-stable streak at extraction time
  // (snapshot). null = not in a static streak. Drives the result table "时间" column.
  stableSince?: string | null;
};

export type UserProxyEntry = {
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
  trafficUsedBytes: string;
  activeConnections: number;
  lastUsedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrafficRow = {
  id: number;
  userId: number;
  proxyEntryId: number;
  date: string;
  bytesUp: string;
  bytesDown: string;
  totalBytes: string;
  connections: number;
  proxyEntry: {
    id: number;
    username: string;
    targetCountry: string;
    targetRegion: string | null;
    targetCity: string | null;
  };
  user?: { id: number; username: string };
};

export type AppSettings = {
  scanIntervalMs: number;
  scanBatchSize: number;
  scanConcurrency: number;
  scanTimeoutMs: number;
  geoCacheTtlMs: number;
  idleReleaseMinutes: number;
  minHoldMinutes: number;
  idleReleaseIntervalMs: number;
  maxScanFailures: number;
  cooldownMs: number;
  rateLimitedCooldownMs: number;
  lockedScanIntervalMs: number;
  stabilityIntervalMs: number;
  usageProtectMinutes: number;
  ipTypeStaleMs: number;
  stabilityWindowMs: number;
  geoPremiumSharePct: number;
  geoNormalSharePct: number;
  geoMinSamples: number;
};

export type AppSettingBounds = Record<keyof AppSettings, { min: number; max: number }>;

export type CountryOption = { value: string; label: string };

export const COUNTRY_OPTIONS: CountryOption[] = [
  { value: "us", label: "美国 US" },
  { value: "gb", label: "英国 GB" },
  { value: "fr", label: "法国 FR" },
  { value: "ca", label: "加拿大 CA" },
  { value: "au", label: "澳大利亚 AU" }
];
