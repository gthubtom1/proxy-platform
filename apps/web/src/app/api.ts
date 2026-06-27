import type {
  AppSettings,
  AuthUser,
  ClientProxy,
  Gateway,
  IpInfo,
  OperationLog,
  ProxyEntry,
  Surface,
  SystemConfig,
  TrafficRow,
  Upstream,
  User,
  UserProxyEntry
} from "./types";

export const SURFACE: Surface = import.meta.env.VITE_APP_SURFACE === "user" ? "user" : "admin";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3110").replace(/\/+$/, "");

export const GATEWAY_PORT = (import.meta.env.VITE_PUBLIC_PROXY_PORT || "18001").trim();

// Build-time fallback only. The real proxy host/port now comes from the backend
// (auto-detected from the stunnel TLS config) via system-config / dashboard.
export const GATEWAY_DISPLAY = `${(import.meta.env.VITE_PUBLIC_PROXY_HOST || "127.0.0.1").trim()}:${GATEWAY_PORT}`;

const TOKEN_KEY = "proxy-platform-token";

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const PROXY_CREATE_CODE_MESSAGES: Record<string, string> = {
  invalid_country: "该国家不可用，请换一个国家。",
  user_not_found: "找不到该用户。",
  user_inactive: "账号被停用，无法提取代理。",
  proxy_entry_limit_reached: "已达到代理数量上限。",
  no_matching_upstream: "该地点暂时没有可用的上游代理，换个国家/地区或稍后再试。",
  username_conflict: "代理账号冲突，请重试。",
  no_other_upstream: "该地区暂时没有其它可用 IP，已保留当前的。",
  entry_inactive: "该代理已停用，无法更换。",
  entry_not_found: "找不到该代理。",
  forbidden: "无权操作该代理。",
  regenerate_failed: "暂时无法更换 IP，请稍后再试。"
};

function describeError(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.code === "string" && PROXY_CREATE_CODE_MESSAGES[record.code]) {
      return PROXY_CREATE_CODE_MESSAGES[record.code];
    }
    if (typeof record.error === "string") return record.error;
  }
  if (status === 401) return "登录已过期，请重新登录。";
  return `请求失败（${status}）。`;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError("无法连接服务，请确认本地服务已启动。", 0);
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(describeError(payload, response.status), response.status);
  }

  return payload as T;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const result = await request<{ token: string; user: AuthUser }>("POST", `/api/${SURFACE}/login`, {
    username,
    password
  });
  setToken(result.token);
  return result.user;
}

// Unified login: one form authenticates either role; backend returns the actual role.
export async function loginAny(username: string, password: string): Promise<AuthUser> {
  const result = await request<{ token: string; user: AuthUser }>("POST", "/api/login", {
    username,
    password
  });
  setToken(result.token);
  return result.user;
}

export const sessionApi = {
  me: () => request<{ user: AuthUser }>("GET", "/api/me")
};

export const adminApi = {
  me: () => request<{ user: AuthUser }>("GET", "/api/admin/me"),
  systemConfig: () => request<{ config: SystemConfig }>("GET", "/api/admin/system-config"),
  listUsers: () => request<{ count: number; users: User[] }>("GET", "/api/admin/users"),
  createUser: (payload: {
    username: string;
    password?: string;
    trafficQuotaGb?: number;
    trafficQuotaHostingGb?: number;
    maxProxyEntries?: number;
    maxConcurrentConnections?: number;
    allowedCountries?: string[];
    allowedSourceIps?: string[];
  }) => request<{ ok: true; user: User; initialPassword: string }>("POST", "/api/admin/users", payload),
  resetPassword: (id: number, password?: string) =>
    request<{ ok: true; user: User; newPassword: string }>("POST", `/api/admin/users/${id}/password-reset`, {
      password: password ?? ""
    }),
  updateUser: (
    id: number,
    payload: {
      status?: string;
      trafficQuotaGb?: number;
      trafficQuotaHostingGb?: number;
      maxProxyEntries?: number;
      maxConcurrentConnections?: number;
      allowedCountries?: string[];
      allowedSourceIps?: string[];
    }
  ) => request<{ ok: true; user: User }>("PATCH", `/api/admin/users/${id}`, payload),
  deleteUser: (id: number) => request<{ ok: true }>("DELETE", `/api/admin/users/${id}`, { confirm: true }),
  listUpstreams: () => request<{ count: number; upstreams: Upstream[] }>("GET", "/api/admin/upstreams"),
  importUpstreams: (text: string) =>
    request<{ created: number; duplicates: number; failed: number; items: unknown[] }>(
      "POST",
      "/api/admin/upstreams/import",
      { text }
    ),
  setUpstreamStatus: (id: number, status: "free" | "disabled") =>
    request<{ ok: true }>("PATCH", `/api/admin/upstreams/${id}/status`, { status }),
  deleteUpstream: (id: number) =>
    request<{ ok: true }>("DELETE", `/api/admin/upstreams/${id}`, { confirm: true }),
  rescanUpstream: (id: number) =>
    request<{ ok: true; success: boolean; errorType: string | null; message: string; upstream: Upstream | null }>(
      "POST",
      `/api/admin/upstreams/${id}/rescan`
    ),
  recoverUpstream: (id: number) =>
    request<{ ok: true; upstream: Upstream }>("POST", `/api/admin/upstreams/${id}/recover`),
  rescanUpstreams: (ids: number[]) =>
    request<{ ok: true; requested: number; succeeded: number; failed: number; missing: number }>(
      "POST",
      "/api/admin/upstreams/rescan-batch",
      { ids }
    ),
  recoverUpstreams: (ids: number[]) =>
    request<{ ok: true; requested: number; recovered: number; skipped: number }>(
      "POST",
      "/api/admin/upstreams/recover-batch",
      { ids }
    ),
  runScan: (status?: string) =>
    request<{ ok: true; started: boolean; scannable: number; message: string }>(
      "POST",
      "/api/admin/scan/run",
      status && status !== "all" ? { status } : undefined
    ),
  scanActivity: () =>
    request<{
      scanning: boolean;
      summary: { total: number; free: number; locked: number; cooldown: number; bad: number; disabled: number };
      recent: {
        id: number;
        host: string;
        port: number;
        currentIp: string | null;
        country: string | null;
        region: string | null;
        city: string | null;
        latencyMs: number | null;
        status: string;
        lastErrorType: string | null;
        ipType: string | null;
        lastCheckedAt: string | null;
      }[];
    }>("GET", "/api/admin/scan/activity"),
  listProxyEntries: () => request<{ count: number; entries: ProxyEntry[] }>("GET", "/api/admin/proxy-entries"),
  setProxyStatus: (id: number, status: "active" | "disabled") =>
    request<{ ok: true }>("PATCH", `/api/admin/proxy-entries/${id}/status`, { status }),
  deleteProxyEntry: (id: number) =>
    request<{ ok: true }>("DELETE", `/api/admin/proxy-entries/${id}`, { confirm: true }),
  listOperationLogs: () => request<{ count: number; logs: OperationLog[] }>("GET", "/api/admin/operation-logs"),
  trafficDaily: () => request<{ count: number; rows: TrafficRow[] }>("GET", "/api/admin/traffic-daily"),
  appSettings: () =>
    request<{ settings: AppSettings; bounds: Record<keyof AppSettings, { min: number; max: number }> }>(
      "GET",
      "/api/admin/app-settings"
    ),
  updateAppSettings: (payload: Partial<AppSettings>) =>
    request<{ ok: true; settings: AppSettings }>("PATCH", "/api/admin/app-settings", payload)
};

export const userApi = {
  me: () => request<{ user: User }>("GET", "/api/user/me"),
  dashboard: () =>
    request<{ user: User; entries: UserProxyEntry[]; rows: TrafficRow[]; gateway: Gateway }>(
      "GET",
      "/api/user/dashboard"
    ),
  locations: (ipType?: string, stabilityTier?: string, grade?: string) => {
    const params = new URLSearchParams();
    if (ipType) params.set("ipType", ipType);
    if (stabilityTier) params.set("stabilityTier", stabilityTier);
    if (grade) params.set("grade", grade);
    const qs = params.toString();
    return request<{ countries: { country: string; regions: { region: string; cities: string[] }[] }[] }>(
      "GET",
      `/api/user/locations${qs ? `?${qs}` : ""}`
    );
  },
  createProxyEntry: (payload: {
    targetCountry: string;
    targetRegion?: string;
    targetCity?: string;
    ipType?: string;
    stabilityTier?: string;
    grade?: string;
    proxyPassword?: string;
  }) =>
    request<{ ok: true; user: User; proxyEntry: UserProxyEntry; clientProxy: ClientProxy }>(
      "POST",
      "/api/user/proxy-entries",
      payload
    ),
  createProxyEntriesBatch: (payload: {
    count: number;
    targetCountry: string;
    targetRegion?: string;
    targetCity?: string;
    ipType?: string;
    stabilityTier?: string;
    grade?: string;
    proxyPassword?: string;
  }) =>
    request<{
      ok: true;
      user: User;
      count: number;
      clientProxies: { proxyEntryId: number; copyText: string; ipInfo?: IpInfo | null; stableSince?: string | null }[];
    }>("POST", "/api/user/proxy-entries/batch", payload),
  regenerateProxyEntry: (id: number) =>
    request<{ ok: true; proxyEntryId: number; ipInfo: IpInfo | null; stableSince?: string | null }>(
      "POST",
      `/api/user/proxy-entries/${id}/regenerate`
    )
};
