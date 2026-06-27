import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthUser, OperationLog, ProxyEntry, SystemConfig, TrafficRow, Upstream, User } from "../types";
import { ApiError, adminApi } from "../api";
import { Shell, type NavItem } from "../AppShell";
import { Loading } from "../ui";
import { AdminOverview } from "./Overview";
import { AdminUsers } from "./Users";
import { AdminUpstreams } from "./Upstreams";
import { AdminProxies } from "./Proxies";
import { AdminLogs } from "./Logs";
import { AdminSettings } from "./Settings";

const NAV: NavItem[] = [
  { key: "overview", label: "概览" },
  { key: "users", label: "用户" },
  { key: "upstreams", label: "上游代理" },
  { key: "proxies", label: "代理运行" },
  { key: "logs", label: "日志" },
  { key: "settings", label: "设置" }
];

type AdminData = {
  users: User[];
  upstreams: Upstream[];
  proxies: ProxyEntry[];
  logs: OperationLog[];
  traffic: TrafficRow[];
  systemConfig: SystemConfig | null;
};

const EMPTY_DATA: AdminData = {
  users: [],
  upstreams: [],
  proxies: [],
  logs: [],
  traffic: [],
  systemConfig: null
};

export function AdminApp(props: { bootUser: AuthUser; onLogout: () => void }) {
  const { bootUser, onLogout } = props;
  const [booting, setBooting] = useState(true);

  const [page, setPage] = useState("overview");
  const [data, setData] = useState<AdminData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const bootedRef = useRef(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [users, upstreams, proxies, logs, traffic, systemConfig] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listUpstreams(),
        adminApi.listProxyEntries(),
        adminApi.listOperationLogs(),
        adminApi.trafficDaily(),
        adminApi.systemConfig()
      ]);
      setData({
        users: users.users,
        upstreams: upstreams.upstreams,
        proxies: proxies.entries,
        logs: logs.logs,
        traffic: traffic.rows,
        systemConfig: systemConfig.config
      });
      setLastLoadedAt(new Date());
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onLogout();
      } else {
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "加载数据失败。" });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    loadData().finally(() => setBooting(false));
  }, [loadData]);

  // Auto-refresh admin data silently (~30s) so traffic/usage stays close to live.
  useEffect(() => {
    if (booting) return;
    const id = setInterval(() => void loadData(true), 30_000);
    return () => clearInterval(id);
  }, [booting, loadData]);

  if (booting) {
    return (
      <div className="boot-screen">
        <Loading text="正在进入后台…" />
      </div>
    );
  }

  return (
    <Shell
      surface="admin"
      username={bootUser.username}
      navItems={NAV}
      current={page}
      loading={loading}
      lastLoadedAt={lastLoadedAt}
      onNavigate={setPage}
      onRefresh={() => loadData()}
      onLogout={onLogout}
      message={message}
      onDismissMessage={() => setMessage(null)}
    >
      {page === "overview" ? (
        <AdminOverview
          users={data.users}
          upstreams={data.upstreams}
          proxies={data.proxies}
          traffic={data.traffic}
          systemConfig={data.systemConfig}
          username={bootUser.username}
          onNavigate={setPage}
        />
      ) : page === "users" ? (
        <AdminUsers users={data.users} proxies={data.proxies} onChanged={loadData} onMessage={setMessage} />
      ) : page === "upstreams" ? (
        <AdminUpstreams upstreams={data.upstreams} onChanged={loadData} onMessage={setMessage} />
      ) : page === "proxies" ? (
        <AdminProxies proxies={data.proxies} onChanged={loadData} onMessage={setMessage} />
      ) : page === "settings" ? (
        <AdminSettings onMessage={setMessage} />
      ) : (
        <AdminLogs logs={data.logs} />
      )}
    </Shell>
  );
}
