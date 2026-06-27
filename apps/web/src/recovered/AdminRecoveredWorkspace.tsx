import { AdminDashboard } from "./AdminDashboard";
import { AdminGeo, type RegionInventory } from "./AdminGeo";
import { AdminLogs } from "./AdminLogs";
import { AdminProxies } from "./AdminProxies";
import { AdminSettings } from "./AdminSettings";
import { LoginShell, MessageStack, NavButton, SideNav, TopBar } from "./AdminShell";
import type { AdminReadOnlyPage, ProxyEntry, UpdateProxyEntryStatusResponse } from "./ProxyEntryDetail";
import { AdminUpstreams } from "./AdminUpstreams";
import { AdminUsers } from "./AdminUsers";

export type AdminPage = "dashboard" | "users" | "upstreams" | "geo" | "proxies" | "logs" | "settings";
export type AppSurface = "admin" | "user";

type AuthUser = {
  role: AppSurface;
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
  id: number;
  username: string;
  role: string;
  status: string;
  trafficQuotaBytes: string;
  trafficUsedBytes: string;
  allowedCountries?: string[];
  maxProxyEntries: number;
  maxConcurrentConnections: number;
  proxyEntryCount: number;
  createdAt: string;
};

type UpstreamProxy = {
  city: string | null;
  country: string | null;
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
  username: string;
};

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

type CreateProxyEntryResult = {
  copies: string[];
  failed: number;
};

type CreateUserResult = {
  initialPassword: string;
  user: AdminUser;
};

type ResetUserPasswordResponse = {
  error?: string;
  newPassword?: string;
  ok?: boolean;
};

type UpdateUserResponse = {
  error?: string;
  ok?: boolean;
};

type UpstreamImportResponse = {
  created: number;
  duplicates: number;
  failed: number;
};

type OperationLog = {
  action: string;
  actor: {
    username: string | null;
  } | null;
  actorUserId: number | null;
  createdAt: string;
  detail: unknown;
  id: number;
  targetId: string | number;
  targetType: string;
};

type SystemConfig = {
  backupStatus?: string | null;
  gatewayPort?: number | null;
  geoCacheTtlMs?: number | null;
  scanBatchSize?: number | null;
  scanConcurrency?: number | null;
  scanIntervalMs?: number | null;
  scanTimeoutMs?: number | null;
  supportedCountries?: string[] | null;
  workerRepeat?: boolean | null;
} | null;

export type AdminReadOnlyIntent = {
  country: string | null;
  page: "logs" | "proxies" | "upstreams" | "users";
  search: string;
  token: number;
};

type UsersReadOnlyIntent = Extract<AdminReadOnlyIntent, { page: "users" }>;
type UpstreamsReadOnlyIntent = Extract<AdminReadOnlyIntent, { page: "upstreams" }>;
type ProxiesReadOnlyIntent = Extract<AdminReadOnlyIntent, { page: "proxies" }>;

type Props = {
  activeEntries: number;
  activePage: AdminPage;
  activeUsers: number;
  copyText: (text: string, successMessage: string) => Promise<void>;
  createAdminEntries: (form: EntryFormState) => Promise<CreateProxyEntryResult | null>;
  createUser: (event: React.FormEvent<HTMLFormElement>) => Promise<CreateUserResult | null>;
  entries: ProxyEntry[];
  entryStats: Record<string, number>;
  error: string | null;
  importResult: UpstreamImportResponse | null;
  importUpstreams: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  lastLoadedAt: Date | null;
  loginForm: LoginFormState;
  monthTraffic: number;
  notice: string | null;
  onLoginSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onLogout?: () => void;
  onRefresh: () => Promise<void> | void;
  operationLogs: OperationLog[];
  readOnlyIntent: AdminReadOnlyIntent | null;
  regions: RegionInventory[];
  resetUserPassword: (userId: number, password: string) => Promise<ResetUserPasswordResponse>;
  session: AuthSession | null;
  setActivePage: (page: AdminPage) => void;
  setLoginForm: (next: LoginFormState) => void;
  setReadOnlyIntent: (intent: AdminReadOnlyIntent | null) => void;
  setUpstreamText: (text: string) => void;
  setUserForm: (form: UserFormState) => void;
  surface: AppSurface;
  systemConfig: SystemConfig;
  todayTraffic: number;
  trafficRows: Array<{ date: string; totalBytes: string }>;
  updateProxyEntryStatus: (entryId: number, status: "active" | "disabled") => Promise<UpdateProxyEntryStatusResponse>;
  updateUserSettings: (userId: number, form: UserSettingsFormState) => Promise<UpdateUserResponse>;
  upstreamStats: Record<string, number>;
  upstreamText: string;
  upstreams: UpstreamProxy[];
  userForm: UserFormState;
  users: AdminUser[];
};

export function AdminRecoveredWorkspace(props: Props) {
  const usersReadOnlyIntent = props.readOnlyIntent?.page === "users" ? (props.readOnlyIntent as UsersReadOnlyIntent) : null;
  const upstreamsReadOnlyIntent =
    props.readOnlyIntent?.page === "upstreams" ? (props.readOnlyIntent as UpstreamsReadOnlyIntent) : null;
  const proxiesReadOnlyIntent = props.readOnlyIntent?.page === "proxies" ? (props.readOnlyIntent as ProxiesReadOnlyIntent) : null;

  if (!props.session) {
    return (
      <>
        <TopBar
          surface={props.surface}
          onRefresh={props.onRefresh}
          isLoading={props.isLoading || !props.session}
          lastLoadedAt={props.lastLoadedAt}
          onLogout={props.onLogout}
          username={undefined}
        />
        <MessageStack error={props.error} notice={props.notice} />
        <LoginShell
          form={props.loginForm}
          isSaving={props.isSaving}
          onSubmit={props.onLoginSubmit}
          setForm={props.setLoginForm}
          surface={props.surface}
        />
      </>
    );
  }

  return (
    <>
      <TopBar
        surface={props.surface}
        onRefresh={props.onRefresh}
        isLoading={props.isLoading}
        lastLoadedAt={props.lastLoadedAt}
        onLogout={props.onLogout}
        username={props.session.user.username}
      />
      <MessageStack error={props.error} notice={props.notice} />

      <section className="workspace">
        <SideNav label="管理员后台导航">
          <NavButton active={props.activePage === "dashboard"} onClick={() => props.setActivePage("dashboard")}>
            总览
          </NavButton>
          <NavButton active={props.activePage === "users"} onClick={() => props.setActivePage("users")}>
            用户管理
          </NavButton>
          <NavButton active={props.activePage === "upstreams"} onClick={() => props.setActivePage("upstreams")}>
            上游资源
          </NavButton>
          <NavButton active={props.activePage === "geo"} onClick={() => props.setActivePage("geo")}>
            地区库存
          </NavButton>
          <NavButton active={props.activePage === "proxies"} onClick={() => props.setActivePage("proxies")}>
            代理运行
          </NavButton>
          <NavButton active={props.activePage === "logs"} onClick={() => props.setActivePage("logs")}>
            日志
          </NavButton>
          <NavButton active={props.activePage === "settings"} onClick={() => props.setActivePage("settings")}>
            设置
          </NavButton>
        </SideNav>

        <section className="content">
          {props.activePage === "dashboard" ? (
            <AdminDashboard
              activeEntries={props.activeEntries}
              activeUsers={props.activeUsers}
              entryStats={props.entryStats}
              monthTraffic={props.monthTraffic}
              onNavigate={props.setActivePage}
              regions={props.regions}
              todayTraffic={props.todayTraffic}
              trafficRows={props.trafficRows}
              upstreamStats={props.upstreamStats}
              upstreams={props.upstreams}
              users={props.users}
            />
          ) : null}

          {props.activePage === "users" ? (
            <AdminUsers
              copyText={props.copyText}
              createAdminEntries={props.createAdminEntries}
              createUser={props.createUser}
              isLoading={props.isLoading}
              isSaving={props.isSaving}
              onOpenAdminReadOnlyPage={openAdminReadOnlyPage(props.setActivePage, props.setReadOnlyIntent)}
              readOnlyIntent={usersReadOnlyIntent}
              resetUserPassword={props.resetUserPassword}
              setReadOnlyIntent={props.setReadOnlyIntent}
              setUserForm={props.setUserForm}
              updateUserSettings={props.updateUserSettings}
              userForm={props.userForm}
              users={props.users}
            />
          ) : null}

          {props.activePage === "upstreams" ? (
            <AdminUpstreams
              importResult={props.importResult}
              importUpstreams={props.importUpstreams}
              isSaving={props.isSaving}
              onOpenAdminReadOnlyPage={openAdminReadOnlyPage(props.setActivePage, props.setReadOnlyIntent)}
              readOnlyIntent={upstreamsReadOnlyIntent}
              setReadOnlyIntent={props.setReadOnlyIntent}
              setUpstreamText={props.setUpstreamText}
              upstreamStats={props.upstreamStats}
              upstreamText={props.upstreamText}
              upstreams={props.upstreams}
            />
          ) : null}

          {props.activePage === "geo" ? (
            <AdminGeo
              onOpenAdminReadOnlyPage={openAdminReadOnlyPage(props.setActivePage, props.setReadOnlyIntent)}
              regions={props.regions}
            />
          ) : null}

          {props.activePage === "proxies" ? (
            <AdminProxies
              entries={props.entries}
              isSaving={props.isSaving}
              onOpenAdminReadOnlyPage={openAdminReadOnlyPage(props.setActivePage, props.setReadOnlyIntent)}
              readOnlyIntent={proxiesReadOnlyIntent}
              setReadOnlyIntent={props.setReadOnlyIntent}
              updateProxyEntryStatus={props.updateProxyEntryStatus}
            />
          ) : null}

          {props.activePage === "logs" ? (
            <AdminLogs
              operationLogs={props.operationLogs}
              readOnlyIntent={props.readOnlyIntent?.page === "logs" ? props.readOnlyIntent : null}
              setReadOnlyIntent={props.setReadOnlyIntent}
              upstreams={props.upstreams}
            />
          ) : null}

          {props.activePage === "settings" ? (
            <AdminSettings copyText={props.copyText} systemConfig={props.systemConfig} />
          ) : null}
        </section>
      </section>
    </>
  );
}

function openAdminReadOnlyPage(
  setActivePage: (page: AdminPage) => void,
  setReadOnlyIntent: (intent: AdminReadOnlyIntent | null) => void
) {
  return (page: AdminReadOnlyPage, options: { country?: string | null; search?: string }) => {
    setActivePage(page);
    setReadOnlyIntent({
      country: options.country ?? null,
      page,
      search: options.search?.trim() || "",
      token: Date.now()
    });
  };
}
