import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthUser, Gateway, TrafficRow, User, UserProxyEntry } from "../types";
import { ApiError, userApi } from "../api";
import { Shell, type NavItem } from "../AppShell";
import { Loading } from "../ui";
import { UserOverview } from "./Overview";
import { UserExtract } from "./Extract";

const NAV: NavItem[] = [
  { key: "overview", label: "概览" },
  { key: "extract", label: "提取代理" }
];

type UserData = {
  user: User | null;
  entries: UserProxyEntry[];
  rows: TrafficRow[];
  gateway: Gateway | null;
};

const EMPTY_DATA: UserData = { user: null, entries: [], rows: [], gateway: null };

export function UserApp(props: { bootUser: AuthUser; onLogout: () => void }) {
  const { bootUser, onLogout } = props;
  const [booting, setBooting] = useState(true);

  const [page, setPage] = useState("overview");
  const [data, setData] = useState<UserData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const bootedRef = useRef(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const dashboard = await userApi.dashboard();
      setData({
        user: dashboard.user,
        entries: dashboard.entries,
        rows: dashboard.rows,
        gateway: dashboard.gateway
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

  // Auto-refresh data (traffic usage, entries) while logged in, silently so the
  // top-bar refresh indicator does not flash. Aligned with the gateway's traffic
  // flush cadence (~30s), so the usage bar stays close to live without a manual refresh.
  useEffect(() => {
    if (booting) return;
    const id = setInterval(() => void loadData(true), 30_000);
    return () => clearInterval(id);
  }, [booting, loadData]);

  if (booting) {
    return (
      <div className="boot-screen">
        <Loading text="正在进入…" />
      </div>
    );
  }

  return (
    <Shell
      surface="user"
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
      {!data.user ? (
        <div className="page">
          <Loading text="读取账号信息…" />
        </div>
      ) : page === "extract" ? (
        <UserExtract user={data.user} onCreated={loadData} />
      ) : (
        <UserOverview user={data.user} entries={data.entries} rows={data.rows} gateway={data.gateway} />
      )}
    </Shell>
  );
}
