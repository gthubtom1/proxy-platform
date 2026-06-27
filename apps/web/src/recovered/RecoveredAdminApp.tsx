import { useEffect, useMemo, useState, type FormEvent } from "react";
import { copyTextToClipboard } from "../app/ui";
import { AdminRecoveredWorkspace, type AdminPage, type AdminReadOnlyIntent } from "./AdminRecoveredWorkspace";
import type { RegionInventory } from "./AdminGeo";
import type { ProxyEntry, UpdateProxyEntryStatusResponse } from "./ProxyEntryDetail";

type AppMode = "admin" | "user";

type ViteImportMeta = ImportMeta & {
  env?: {
    VITE_API_BASE_URL?: string;
  };
};

type AuthUser = {
  id: number;
  role: AppMode;
  username: string;
};

type AuthSession = {
  token: string;
  user: AuthUser;
};

type LoginFormState = {
  password: string;
  username: string;
};

type AdminUser = {
  allowedCountries?: string[];
  createdAt: string;
  id: number;
  maxConcurrentConnections: number;
  maxProxyEntries: number;
  proxyEntryCount: number;
  role: string;
  status: string;
  trafficQuotaBytes: string;
  trafficUsedBytes: string;
  updatedAt: string;
  username: string;
};

type UpstreamProxy = {
  city: string | null;
  country: string | null;
  createdAt: string;
  currentIp: string | null;
  failCount: number;
  host: string;
  id: number;
  lastCheckedAt: string | null;
  lastErrorType: string | null;
  latencyMs: number | null;
  port: number;
  region: string | null;
  scanLogs: Array<{
    city: string | null;
    country: string | null;
    createdAt: string;
    errorType: string | null;
    exitIp: string | null;
    id: number;
    message: string | null;
    region: string | null;
    success: boolean;
  }>;
  score: number;
  status: string;
  successCount: number;
  updatedAt: string;
  username: string;
};

type TrafficDaily = {
  connections: number;
  date: string;
  totalBytes: string;
};

type OperationLog = {
  action: string;
  actor: {
    id: number;
    role: string;
    username: string;
  } | null;
  actorUserId: number | null;
  createdAt: string;
  detail: unknown;
  id: number;
  targetId: string;
  targetType: string;
};

type SystemConfig = {
  backupStatus: string;
  gatewayPort: number;
  geoCacheTtlMs: number;
  scanBatchSize: number;
  scanConcurrency: number;
  scanIntervalMs: number;
  scanTimeoutMs: number;
  supportedCountries: string[];
  workerRepeat: boolean;
} | null;

type UserFormState = {
  allowedCountries: string[];
  maxProxyEntries: string;
  password: string;
  trafficQuotaGb: string;
  username: string;
};

type UserSettingsFormState = {
  allowedCountries: string[];
  maxProxyEntries: string;
  status: string;
  trafficQuotaGb: string;
};

type EntryFormState = {
  count: string;
  targetCity: string;
  targetCountry: string;
  targetRegion: string;
  userId: string;
};

type CreateUserResponse = {
  error?: string;
  initialPassword?: string;
  ok?: boolean;
  user?: AdminUser;
};

type CreateUserResult = {
  initialPassword: string;
  user: AdminUser;
};

type CreateProxyEntryResult = {
  copies: string[];
  failed: number;
};

type ResetUserPasswordResponse = {
  error?: string;
  newPassword?: string;
  ok?: boolean;
  user?: AdminUser;
};

type UpdateUserResponse = {
  error?: string;
  ok?: boolean;
  user?: AdminUser;
};

type UpstreamImportResponse = {
  created: number;
  duplicates: number;
  failed: number;
  items: Array<
    | {
        action: "created" | "duplicate";
        host: string;
        id: number;
        lineNumber: number;
        ok: true;
        port: number;
        username: string;
      }
    | {
        error: string;
        lineNumber: number;
        ok: false;
      }
  >;
};

type ApiUsersResponse = {
  users: AdminUser[];
};

type ApiEntriesResponse = {
  entries: ProxyEntry[];
};

type ApiUpstreamsResponse = {
  upstreams: UpstreamProxy[];
};

type ApiTrafficResponse = {
  rows: TrafficDaily[];
};

type ApiLogsResponse = {
  logs: OperationLog[];
};

type ApiSystemConfigResponse = {
  config: SystemConfig;
};

const env = (import.meta as ViteImportMeta).env;
const API_BASE = env?.VITE_API_BASE_URL || "http://127.0.0.1:3110";
const SURFACE: AppMode = "admin";
const STORAGE_KEY = `proxy-platform:${SURFACE}:auth`;
const DEFAULT_COUNTRIES = ["us", "gb", "fr", "ca", "au"];

export function RecoveredAdminApp() {
  const [activePage, setActivePage] = useState<AdminPage>("dashboard");
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession(STORAGE_KEY, SURFACE));
  const [loginForm, setLoginForm] = useState<LoginFormState>({ username: "", password: "" });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [entries, setEntries] = useState<ProxyEntry[]>([]);
  const [upstreams, setUpstreams] = useState<UpstreamProxy[]>([]);
  const [trafficRows, setTrafficRows] = useState<TrafficDaily[]>([]);
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [importResult, setImportResult] = useState<UpstreamImportResponse | null>(null);
  const [upstreamText, setUpstreamText] = useState("");
  const [readOnlyIntent, setReadOnlyIntent] = useState<AdminReadOnlyIntent | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>({
    username: "",
    password: "",
    trafficQuotaGb: "0",
    maxProxyEntries: "10",
    allowedCountries: [...DEFAULT_COUNTRIES]
  });

  const entryStats = useMemo(() => countStatuses(entries.map((entry) => entry.status)), [entries]);
  const upstreamStats = useMemo(() => countStatuses(upstreams.map((upstream) => upstream.status)), [upstreams]);
  const regions = useMemo(() => buildRegionInventory(upstreams), [upstreams]);
  const activeUsers = users.filter((user) => user.status === "active").length;
  const activeEntries = entries.filter((entry) => entry.status === "active").length;
  const todayTraffic = sumStrings(trafficRows.filter((row) => isToday(row.date)).map((row) => row.totalBytes));
  const monthTraffic = sumStrings(trafficRows.filter((row) => isThisMonth(row.date)).map((row) => row.totalBytes));

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }
    void fetchAdminData();
  }, [session]);

  async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(init?.headers ?? {})
      }
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(json.error || `请求失败：${path}`);
    return json as T;
  }

  async function fetchAdminData() {
    if (!session) return;

    setIsLoading(true);
    setError(null);
    try {
      const [usersResponse, entriesResponse, upstreamsResponse, trafficResponse, logsResponse, configResponse] = await Promise.all([
        apiRequest<ApiUsersResponse>("/api/admin/users"),
        apiRequest<ApiEntriesResponse>("/api/admin/proxy-entries"),
        apiRequest<ApiUpstreamsResponse>("/api/admin/upstreams"),
        apiRequest<ApiTrafficResponse>("/api/admin/traffic-daily"),
        apiRequest<ApiLogsResponse>("/api/admin/operation-logs"),
        apiRequest<ApiSystemConfigResponse>("/api/admin/system-config")
      ]);

      setUsers(usersResponse.users);
      setEntries(entriesResponse.entries);
      setUpstreams(upstreamsResponse.upstreams);
      setTrafficRows(trafficResponse.rows);
      setOperationLogs(logsResponse.logs);
      setSystemConfig(configResponse.config);
      setLastLoadedAt(new Date());
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "读取数据失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshData() {
    await fetchAdminData();
    setNotice("数据已刷新。");
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiRequest<AuthSession>("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginForm.username.trim(),
          password: loginForm.password
        })
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
      setLoginForm({ username: "", password: "" });
      setSession(response);
      setNotice("登录成功。");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    } finally {
      setIsSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setUsers([]);
    setEntries([]);
    setUpstreams([]);
    setTrafficRows([]);
    setOperationLogs([]);
    setSystemConfig(null);
    setImportResult(null);
    setReadOnlyIntent(null);
    setLastLoadedAt(null);
  }

  async function createUser(event: FormEvent<HTMLFormElement>): Promise<CreateUserResult | null> {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiRequest<CreateUserResponse>("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: userForm.username.trim(),
          password: userForm.password.trim() || undefined,
          trafficQuotaGb: Number(userForm.trafficQuotaGb || 0),
          maxProxyEntries: Number(userForm.maxProxyEntries || 10),
          allowedCountries: userForm.allowedCountries
        })
      });

      if (!response.ok || !response.user || !response.initialPassword) throw new Error(response.error || "创建用户失败");

      setUserForm({
        username: "",
        password: "",
        trafficQuotaGb: "0",
        maxProxyEntries: "10",
        allowedCountries: [...DEFAULT_COUNTRIES]
      });
      setNotice("用户已创建。初始密码只会显示这一回，请现在保存。");
      await fetchAdminData();
      return { user: response.user, initialPassword: response.initialPassword };
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建用户失败");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function resetUserPassword(userId: number, password: string): Promise<ResetUserPasswordResponse> {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiRequest<ResetUserPasswordResponse>(`/api/admin/users/${userId}/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() || undefined })
      });

      if (!response.ok || !response.newPassword) throw new Error(response.error || "重置密码失败");

      if (response.user) {
        setUsers((current) => current.map((user) => (user.id === response.user?.id ? response.user : user)));
      }
      setNotice("密码已重置。新密码只显示这一回，请现在保存。");
      await fetchAdminData();
      return response;
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : "重置密码失败";
      setError(message);
      return { ok: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }

  async function updateUserSettings(userId: number, form: UserSettingsFormState): Promise<UpdateUserResponse> {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiRequest<UpdateUserResponse>(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: form.status,
          trafficQuotaGb: Number(form.trafficQuotaGb || 0),
          maxProxyEntries: Number(form.maxProxyEntries || 1),
          allowedCountries: form.allowedCountries
        })
      });

      if (!response.ok || !response.user) throw new Error(response.error || "保存用户设置失败");

      setUsers((current) => current.map((user) => (user.id === response.user?.id ? response.user : user)));
      setNotice("用户设置已保存，并已写入操作日志。");
      await fetchAdminData();
      return response;
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "保存用户设置失败";
      setError(message);
      return { ok: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }

  async function updateProxyEntryStatus(entryId: number, status: "active" | "disabled"): Promise<UpdateProxyEntryStatusResponse> {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiRequest<UpdateProxyEntryStatusResponse>(`/api/admin/proxy-entries/${entryId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!response.ok || !response.entry) throw new Error(response.error || "修改代理状态失败");

      setEntries((current) =>
        current.map((entry) =>
          entry.id === response.entry?.id
            ? {
                ...entry,
                status: response.entry.status,
                currentUpstreamId: response.entry.currentUpstreamId,
                currentIp: response.entry.currentIp,
                currentCountry: response.entry.currentCountry,
                currentRegion: response.entry.currentRegion,
                currentCity: response.entry.currentCity,
                updatedAt: response.entry.updatedAt
              }
            : entry
        )
      );
      setNotice(
        status === "disabled"
          ? "代理已停用。当前绑定已按规则处理，并已写入操作日志。"
          : "代理已启用。系统已尝试重新匹配可用上游，并已写入操作日志。"
      );
      await fetchAdminData();
      return response;
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : "修改代理状态失败";
      setError(message);
      return { ok: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }

  async function importUpstreams(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setNotice(null);
    setImportResult(null);
    try {
      const response = await fetch(`${API_BASE}/api/admin/upstreams/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.token ?? ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: upstreamText })
      });
      const json = (await response.json()) as UpstreamImportResponse & { error?: string };
      if (!response.ok && response.status !== 207) throw new Error(json.error || "导入上游失败");

      setImportResult(json);
      setNotice(`导入完成：新增 ${json.created} 条，重复 ${json.duplicates} 条，失败 ${json.failed} 条。`);
      if (json.created > 0 && json.failed === 0) setUpstreamText("");
      await fetchAdminData();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "导入上游失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function createAdminEntries(form: EntryFormState): Promise<CreateProxyEntryResult | null> {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    const count = Math.max(1, Math.min(20, Number(form.count || 1)));
    const copies: string[] = [];
    let failed = 0;
    const userId = Number(form.userId || 0);

    try {
      for (let index = 0; index < count; index += 1) {
        const response = await fetch(`${API_BASE}/api/admin/proxy-entries`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.token ?? ""}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId,
            targetCountry: form.targetCountry,
            targetRegion: form.targetRegion.trim() || undefined,
            targetCity: form.targetCity.trim() || undefined
          })
        });
        const json = (await response.json()) as { clientProxy?: { copyText: string }; error?: string; ok?: boolean };

        if (!response.ok || json.ok === false) {
          failed += 1;
          if (copies.length === 0) throw new Error(json.error || "创建代理失败");
          break;
        }

        if (!json.clientProxy) {
          failed += 1;
          if (copies.length === 0) throw new Error("创建代理失败");
          break;
        }

        copies.push(json.clientProxy.copyText);
      }

      setNotice(`已生成 ${copies.length} 条代理${failed > 0 ? `，另有 ${failed} 条因库存不足未生成` : ""}。密码只显示这一回。`);
      await fetchAdminData();
      return { copies, failed };
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建代理失败");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function copyText(text: string, successMessage: string) {
    setError(null);
    try {
      const ok = await copyTextToClipboard(text);
      if (!ok) throw new Error("copy failed");
      setNotice(successMessage);
    } catch {
      setNotice(null);
      setError("复制失败，请手动复制这段内容。");
    }
  }

  return (
    <main className="app-shell">
      <AdminRecoveredWorkspace
        activeEntries={activeEntries}
        activePage={activePage}
        activeUsers={activeUsers}
        copyText={copyText}
        createAdminEntries={createAdminEntries}
        createUser={createUser}
        entries={entries}
        entryStats={entryStats}
        error={error}
        importResult={importResult}
        importUpstreams={importUpstreams}
        isLoading={isLoading}
        isSaving={isSaving}
        lastLoadedAt={lastLoadedAt}
        loginForm={loginForm}
        monthTraffic={monthTraffic}
        notice={notice}
        onLoginSubmit={login}
        onLogout={logout}
        onRefresh={refreshData}
        operationLogs={operationLogs}
        readOnlyIntent={readOnlyIntent}
        regions={regions}
        resetUserPassword={resetUserPassword}
        session={session}
        setActivePage={setActivePage}
        setLoginForm={setLoginForm}
        setReadOnlyIntent={setReadOnlyIntent}
        setUpstreamText={setUpstreamText}
        setUserForm={setUserForm}
        surface="admin"
        systemConfig={systemConfig}
        todayTraffic={todayTraffic}
        trafficRows={trafficRows}
        updateProxyEntryStatus={updateProxyEntryStatus}
        updateUserSettings={updateUserSettings}
        upstreamStats={upstreamStats}
        upstreamText={upstreamText}
        upstreams={upstreams}
        userForm={userForm}
        users={users}
      />
    </main>
  );
}

function readStoredSession(storageKey: string, role: AppMode): AuthSession | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.token || !parsed.user || parsed.user.role !== role) return null;
    return parsed as AuthSession;
  } catch {
    return null;
  }
}

function countStatuses(statuses: string[]): Record<string, number> {
  return statuses.reduce<Record<string, number>>((counts, status) => {
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

function buildRegionInventory(upstreams: UpstreamProxy[]): RegionInventory[] {
  const regionMap = new Map<string, RegionInventory>();

  for (const upstream of upstreams) {
    const country = upstream.country || "unknown";
    const region = upstream.region || "any";
    const city = upstream.city || "any";
    const key = `${country}/${region}/${city}`;
    const current = regionMap.get(key) ?? {
      bad: 0,
      city: upstream.city,
      country: upstream.country,
      free: 0,
      key,
      label: formatLocation(country, region, city),
      locked: 0,
      region: upstream.region,
      total: 0
    };

    current.total += 1;
    if (upstream.status === "free") current.free += 1;
    if (upstream.status === "locked") current.locked += 1;
    if (["bad", "disabled", "cooldown"].includes(upstream.status)) current.bad += 1;
    regionMap.set(key, current);
  }

  return [...regionMap.values()].sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}

function formatLocation(country: string | null, region: string | null, city: string | null): string {
  return [country?.toUpperCase(), region, city].filter(Boolean).join(" / ") || "不限";
}

function sumStrings(values: string[]): number {
  return values.reduce((total, value) => {
    const numeric = Number(value);
    return total + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);
}

function isToday(date: string): boolean {
  return date === new Date().toISOString().slice(0, 10);
}

function isThisMonth(date: string): boolean {
  return date.startsWith(new Date().toISOString().slice(0, 7));
}
