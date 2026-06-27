import { EmptyState, Metric, Panel } from "./shared";

type Props = {
  activeEntries: number;
  activeUsers: number;
  entryStats: Record<string, number>;
  monthTraffic: number;
  onNavigate: (page: "dashboard" | "geo" | "logs" | "proxies" | "upstreams" | "users" | "settings") => void;
  regions: Array<{ free: number; label: string; total: number; key: string }>;
  todayTraffic: number;
  trafficRows: Array<{ date: string; totalBytes: string }>;
  upstreamStats: { bad?: number; cooldown?: number; disabled?: number; free?: number; locked?: number };
  upstreams: unknown[];
  users: Array<{ id: number; username: string; trafficQuotaBytes: string; trafficUsedBytes: string }>;
};

export function AdminDashboard(props: Props) {
  const issueCount = (props.upstreamStats.bad ?? 0) + (props.upstreamStats.disabled ?? 0) + (props.upstreamStats.cooldown ?? 0);
  const riskyUsers = props.users.filter((user) => quotaRatio(Number(user.trafficUsedBytes), Number(user.trafficQuotaBytes)) >= 85);
  const lowRegions = props.regions.filter((region) => region.total > 0 && region.free < 2).slice(0, 6);

  return (
    <>
      <section className="metric-grid">
        <Metric label="启用用户" value={`${props.activeUsers}/${props.users.length}`} />
        <Metric label="启用代理" value={`${props.activeEntries}/${sumCounts(props.entryStats)}`} />
        <Metric label="今日流量" value={formatBytes(props.todayTraffic)} />
        <Metric label="本月流量" value={formatBytes(props.monthTraffic)} />
        <Metric label="上游资源" value={String(props.upstreams.length)} />
        <Metric label="异常上游" value={String(issueCount)} tone={issueCount > 0 ? "warn" : "ok"} />
      </section>

      <section className="split-grid">
        <Panel title="数据仪表">
          <div className="bar-list">
            <BarRow label="空闲" value={props.upstreamStats.free ?? 0} tone="ok" />
            <BarRow label="已绑定" value={props.upstreamStats.locked ?? 0} tone="info" />
            <BarRow label="冷却" value={props.upstreamStats.cooldown ?? 0} tone="warn" />
            <BarRow label="失败/停用" value={issueCount} tone="bad" />
          </div>
        </Panel>

        <Panel title="近 7 日流量">
          <TrafficBars rows={props.trafficRows} />
        </Panel>
      </section>

      <section className="split-grid">
        <Panel title="待处理事项">
          <div className="task-list">
            <button type="button" onClick={() => props.onNavigate("upstreams")}>
              <span>异常上游</span>
              <strong>{issueCount}</strong>
            </button>
            <button type="button" onClick={() => props.onNavigate("geo")}>
              <span>低库存地区</span>
              <strong>{lowRegions.length}</strong>
            </button>
            <button type="button" onClick={() => props.onNavigate("users")}>
              <span>额度风险用户</span>
              <strong>{riskyUsers.length}</strong>
            </button>
            <button type="button" onClick={() => props.onNavigate("logs")}>
              <span>操作日志</span>
              <strong>查看</strong>
            </button>
          </div>
        </Panel>

        <Panel title="系统健康">
          <div className="health-line">
            <span>空闲上游</span>
            <strong>{props.upstreamStats.free ?? 0}</strong>
          </div>
          <div className="health-line">
            <span>已绑定上游</span>
            <strong>{props.upstreamStats.locked ?? 0}</strong>
          </div>
          <div className="health-line">
            <span>冷却/失败</span>
            <strong>{(props.upstreamStats.cooldown ?? 0) + (props.upstreamStats.disabled ?? 0)}</strong>
          </div>
          <div className="health-line">
            <span>停用代理</span>
            <strong>{props.entryStats.disabled ?? 0}</strong>
          </div>
        </Panel>
      </section>

      <section className="split-grid">
        <Panel title="需要关注">
          {riskyUsers.length === 0 && lowRegions.length === 0 ? (
            <EmptyState text="当前没有明显风险。" />
          ) : (
            <div className="alert-list">
              {riskyUsers.map((user) => (
                <span key={user.id}>额度接近用完：{user.username}</span>
              ))}
              {lowRegions.map((region) => (
                <span key={region.key}>库存偏低：{region.label}</span>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </>
  );
}

function BarRow(props: { label: string; tone: string; value: number }) {
  return (
    <div className="bar-row">
      <div className="bar-meta">
        <span>{props.label}</span>
        <strong>{props.value}</strong>
      </div>
      <div className="bar-track">
        <span className={`bar-fill ${props.tone}`} style={{ width: `${Math.max(3, props.value)}%` }} />
      </div>
    </div>
  );
}

function TrafficBars(props: { rows: Array<{ date: string; totalBytes: string }> }) {
  const days = lastSevenDays();
  const data = days.map((day) => {
    const total = sumBytes(props.rows.filter((row) => row.date === day).map((row) => row.totalBytes));
    return { date: day, total };
  });
  const max = Math.max(1, ...data.map((item) => item.total));

  return (
    <div className="traffic-bars">
      {data.map((item) => (
        <div className="traffic-day" key={item.date}>
          <div className="traffic-column">
            <span style={{ height: `${Math.max(4, Math.round((item.total / max) * 100))}%` }} />
          </div>
          <strong>{formatBytes(item.total)}</strong>
          <em>{item.date.slice(5)}</em>
        </div>
      ))}
    </div>
  );
}

function sumCounts(value: Record<string, number>): number {
  return Object.values(value).reduce((total, item) => total + item, 0);
}

function sumBytes(values: string[]): number {
  return values.reduce((total, value) => {
    const bytes = Number(value);
    return total + (Number.isFinite(bytes) ? bytes : 0);
  }, 0);
}

function quotaRatio(used: number, quota: number): number {
  return !quota || quota <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((used / quota) * 100)));
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function lastSevenDays(): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
}
