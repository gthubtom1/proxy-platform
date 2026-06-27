import type { Gateway, TrafficRow, User, UserProxyEntry } from "../types";
import { formatBytes, formatCountries, greeting } from "../format";
import { GATEWAY_DISPLAY, GATEWAY_PORT } from "../api";
import { Card, StatTile } from "../ui";
import { BarList, CHART_COLORS, ChartEmpty, LineChart } from "../charts";
import { Icon } from "../icons";
import { buildDailySeries, sumField, sumProxiesByCountry } from "../metrics";

export function UserOverview(props: {
  user: User;
  entries: UserProxyEntry[];
  rows: TrafficRow[];
  gateway?: Gateway | null;
}) {
  const { user, entries, rows, gateway } = props;
  const gatewayDisplay = gateway ? `${gateway.host}:${gateway.port}` : GATEWAY_DISPLAY;
  const gatewayPort = gateway ? gateway.port : GATEWAY_PORT;

  const quota = Number(user.trafficQuotaBytes || 0);
  const used = Number(user.trafficUsedBytes || 0);
  const unlimitedQuota = quota <= 0;
  const percent = unlimitedQuota ? 0 : Math.min(100, Math.round((used / quota) * 100));
  const remaining = unlimitedQuota ? 0 : Math.max(0, quota - used);
  const quotaTone = unlimitedQuota ? "good" : percent >= 100 ? "bad" : percent >= 85 ? "warn" : "good";

  // Datacenter (hosting) bucket: metered and capped independently from residential.
  const hostingQuota = Number(user.trafficQuotaHostingBytes || 0);
  const hostingUsed = Number(user.trafficUsedHostingBytes || 0);
  const hostingUnlimited = hostingQuota <= 0;
  const hostingPercent = hostingUnlimited ? 0 : Math.min(100, Math.round((hostingUsed / hostingQuota) * 100));
  const hostingRemaining = hostingUnlimited ? 0 : Math.max(0, hostingQuota - hostingUsed);
  const hostingTone = hostingUnlimited ? "good" : hostingPercent >= 100 ? "bad" : hostingPercent >= 85 ? "warn" : "good";

  const activeCount = entries.reduce((total, entry) => (entry.status === "active" ? total + 1 : total), 0);
  const allowedCount = user.allowedCountries.length;

  const daily = buildDailySeries(rows, 30);
  const xLabels = daily.map((point) => point.date.slice(5));
  const used30 = sumField(daily, "total");
  const proxyByCountry = sumProxiesByCountry(entries);

  return (
    <div className="page page-wide">
      <section className={`quota-hero tone-${quotaTone}`}>
        <div className="quota-hero-head">
          <div>
            <strong className="quota-hero-greeting">
              {greeting()}，{user.username}
            </strong>
            <span className="quota-hero-sub">住宅线路 · 用户面板</span>
          </div>
        </div>
        <div className="quota-figures">
          <div className="quota-figure">
            <span className="quota-figure-label">已用</span>
            <strong className="quota-figure-value">{formatBytes(used)}</strong>
          </div>
          <div className="quota-figure quota-figure-primary">
            <span className="quota-figure-label">剩余</span>
            <strong className={`quota-figure-value tone-${quotaTone}`}>
              {unlimitedQuota ? "不限" : formatBytes(remaining)}
            </strong>
          </div>
          <div className="quota-figure">
            <span className="quota-figure-label">总额度</span>
            <strong className="quota-figure-value">{unlimitedQuota ? "不限" : formatBytes(quota)}</strong>
          </div>
        </div>
        {unlimitedQuota ? null : (
          <div className="quota-bar quota-hero-bar">
            <span
              className={`quota-fill ${quotaTone === "good" ? "" : `tone-${quotaTone}`}`}
              style={{ width: `${Math.max(2, percent)}%` }}
            />
          </div>
        )}
        <div className="quota-hero-foot">
          {unlimitedQuota ? "额度不限" : `已用 ${percent}% · 剩余 ${formatBytes(remaining)}`}
        </div>
      </section>

      <Card title="机房额度" subtitle="机房线路与住宅线路分开计量，互不占用">
        <div className="quota-figures">
          <div className="quota-figure">
            <span className="quota-figure-label">已用</span>
            <strong className="quota-figure-value">{formatBytes(hostingUsed)}</strong>
          </div>
          <div className="quota-figure quota-figure-primary">
            <span className="quota-figure-label">剩余</span>
            <strong className={`quota-figure-value tone-${hostingTone}`}>
              {hostingUnlimited ? "不限" : formatBytes(hostingRemaining)}
            </strong>
          </div>
          <div className="quota-figure">
            <span className="quota-figure-label">总额度</span>
            <strong className="quota-figure-value">{hostingUnlimited ? "不限" : formatBytes(hostingQuota)}</strong>
          </div>
        </div>
        {hostingUnlimited ? null : (
          <div className="quota-bar quota-hero-bar">
            <span
              className={`quota-fill ${hostingTone === "good" ? "" : `tone-${hostingTone}`}`}
              style={{ width: `${Math.max(2, hostingPercent)}%` }}
            />
          </div>
        )}
        <div className="quota-hero-foot">
          {hostingUnlimited ? "额度不限" : `已用 ${hostingPercent}% · 剩余 ${formatBytes(hostingRemaining)}`}
        </div>
      </Card>

      <div className="stat-grid">
        <StatTile
          label="已用流量"
          value={formatBytes(used)}
          hint={unlimitedQuota ? "额度不限" : `近 30 天 ${formatBytes(used30)}`}
          icon={<Icon name="activity" />}
          accent="amber"
        />
        <StatTile
          label="我的代理"
          value={entries.length}
          hint="数量不限"
          icon={<Icon name="key" />}
          accent="teal"
        />
        <StatTile
          label="运行中"
          value={activeCount}
          hint={`共 ${entries.length} 条`}
          tone={activeCount > 0 ? "good" : "default"}
          icon={<Icon name="link" />}
          accent="green"
        />
        <StatTile
          label="可用国家"
          value={allowedCount === 0 ? "全部" : allowedCount}
          hint={formatCountries(user.allowedCountries)}
          icon={<Icon name="pin" />}
          accent="blue"
        />
      </div>

      <div className="dash-row">
        <Card title="我的流量趋势" subtitle="近 30 天上行 / 下行">
          {daily.length === 0 ? (
            <ChartEmpty text="暂无流量数据" hint="开始使用代理后，这里会显示你每天的流量趋势。" />
          ) : (
            <LineChart
              series={[
                { label: "上行", color: CHART_COLORS.up, values: daily.map((point) => point.up) },
                { label: "下行", color: CHART_COLORS.down, values: daily.map((point) => point.down) }
              ]}
              xLabels={xLabels}
              formatValue={formatBytes}
            />
          )}
        </Card>

        <Card title="我的代理分布" subtitle="按目标国家">
          {proxyByCountry.length === 0 ? (
            <ChartEmpty text="暂无代理" hint="提取代理后，这里会按国家显示你的代理分布。" />
          ) : (
            <BarList items={proxyByCountry} formatValue={(value) => `${value} 条`} color={CHART_COLORS.teal} />
          )}
        </Card>
      </div>

      <Card title="连接信息" subtitle="代理统一连接地址">
        <div className="info-cell">
          <span className="info-cell-label">
            <Icon name="globe" size={15} />
            代理网关
          </span>
          <strong className="info-cell-value">{gatewayDisplay}</strong>
          <span className="info-cell-hint">所有代理共用此地址，端口 {gatewayPort}</span>
        </div>
      </Card>
    </div>
  );
}
