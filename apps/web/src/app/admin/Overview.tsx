import type { ReactNode } from "react";
import { COUNTRY_OPTIONS, type ProxyEntry, type SystemConfig, type TrafficRow, type Upstream, type User } from "../types";
import { formatBytes, greeting } from "../format";
import { GATEWAY_DISPLAY } from "../api";
import { Card, DataTable, EmptyState } from "../ui";
import { BarList, CHART_COLORS, ChartEmpty, Donut, LineChart, Sparkline } from "../charts";
import { Icon, type IconName } from "../icons";
import { buildDailySeries, sumField, sumTrafficByCountry, sumUpstreamsByCountry, topUsersByTraffic } from "../metrics";

function countBy<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.reduce((total, item) => (predicate(item) ? total + 1 : total), 0);
}

function sumBytes(values: string[]): number {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function Metric(props: {
  icon: IconName;
  accent: string;
  label: string;
  value: ReactNode;
  sub?: string;
  spark?: number[];
  sparkColor?: string;
}) {
  return (
    <div className="metric-row">
      <span className={`metric-icon accent-${props.accent}`}>
        <Icon name={props.icon} size={17} />
      </span>
      <div className="metric-text">
        <span className="metric-label">{props.label}</span>
        <strong className="metric-value">{props.value}</strong>
        {props.sub ? <span className="metric-sub">{props.sub}</span> : null}
      </div>
      {props.spark ? <Sparkline values={props.spark} color={props.sparkColor} /> : null}
    </div>
  );
}

export function AdminOverview(props: {
  users: User[];
  upstreams: Upstream[];
  proxies: ProxyEntry[];
  traffic: TrafficRow[];
  systemConfig: SystemConfig | null;
  username?: string;
  onNavigate?: (key: string) => void;
}) {
  const { users, upstreams, proxies, traffic, systemConfig, username, onNavigate } = props;

  const usersActive = countBy(users, (user) => user.status === "active");
  const upstreamFree = countBy(upstreams, (item) => item.status === "free");
  const upstreamLocked = countBy(upstreams, (item) => item.status === "locked");
  const upstreamDisabled = countBy(upstreams, (item) => item.status === "disabled");
  const proxiesActive = countBy(proxies, (item) => item.status === "active");
  const totalTraffic = sumBytes(users.map((user) => user.trafficUsedBytes));

  const daily = buildDailySeries(traffic, 30);
  const hasTraffic = daily.length > 0;
  const xLabels = daily.map((point) => point.date.slice(5));
  const connections30 = sumField(daily, "connections");
  const countryTraffic = sumTrafficByCountry(traffic);
  const topUsers = topUsersByTraffic(traffic, 5);
  const upstreamsByCountry = sumUpstreamsByCountry(upstreams);

  // Per-country upstream inventory: how much residential / datacenter stock is
  // currently extractable (status=free) per country, plus how many are bound.
  const countryLabel = (code: string) => COUNTRY_OPTIONS.find((option) => option.value === code)?.label ?? code.toUpperCase();
  const inventoryByCountry = (() => {
    const map = new Map<string, { total: number; resiFree: number; dcFree: number; locked: number }>();
    for (const item of upstreams) {
      if (!item.country) continue;
      const row = map.get(item.country) ?? { total: 0, resiFree: 0, dcFree: 0, locked: 0 };
      row.total += 1;
      if (item.status === "free") {
        if (item.ipType === "hosting") row.dcFree += 1;
        else row.resiFree += 1;
      } else if (item.status === "locked") {
        row.locked += 1;
      }
      map.set(item.country, row);
    }
    return [...map.entries()]
      .map(([country, value]) => ({ country, ...value }))
      .sort((a, b) => b.total - a.total);
  })();

  const upstreamSegments = [
    { label: "空闲", value: upstreamFree, color: CHART_COLORS.free },
    { label: "已绑定", value: upstreamLocked, color: CHART_COLORS.locked },
    { label: "停用", value: upstreamDisabled, color: CHART_COLORS.disabled }
  ];

  return (
    <div className="page page-wide">
      <div className="greeting">
        <strong>{greeting()}，{username ?? "管理员"}</strong>
        <span>住宅代理管理后台 · 当前共 {users.length} 个用户、{upstreams.length} 条上游</span>
      </div>

      <div className="metric-grid">
        <Card title="用户与代理">
          <div className="metric-list">
            <Metric icon="users" accent="blue" label="普通用户" value={users.length} sub={`${usersActive} 个启用`} />
            <Metric icon="key" accent="teal" label="代理账号" value={proxies.length} sub={`${proxiesActive} 个运行中`} />
          </div>
        </Card>
        <Card title="上游资源">
          <div className="metric-list">
            <Metric icon="server" accent="green" label="上游总数" value={upstreams.length} sub={`空闲 ${upstreamFree}`} />
            <Metric icon="link" accent="amber" label="已绑定" value={upstreamLocked} sub={`停用 ${upstreamDisabled}`} />
          </div>
        </Card>
        <Card title="流量统计">
          <div className="metric-list">
            <Metric
              icon="activity"
              accent="blue"
              label="总用量"
              value={formatBytes(totalTraffic)}
              spark={daily.map((point) => point.total)}
              sparkColor={CHART_COLORS.up}
            />
            <Metric
              icon="link"
              accent="teal"
              label="近 30 天连接"
              value={connections30}
              spark={daily.map((point) => point.connections)}
              sparkColor={CHART_COLORS.teal}
            />
          </div>
        </Card>
        <Card title="网关与系统">
          <div className="metric-list">
            <Metric
              icon="globe"
              accent="slate"
              label="代理网关"
              value={systemConfig ? `${systemConfig.gatewayHost}:${systemConfig.gatewayPort}` : GATEWAY_DISPLAY}
              sub="用户连接地址"
            />
            <Metric
              icon="gauge"
              accent="green"
              label="自动扫描"
              value={systemConfig ? (systemConfig.workerRepeat ? "开启" : "关闭") : "—"}
              sub={systemConfig ? `间隔 ${Math.max(1, Math.round(systemConfig.scanIntervalMs / 60000))} 分钟` : undefined}
            />
          </div>
        </Card>
      </div>

      {proxies.length === 0 ? (
        <Card
          title="开始使用"
          subtitle="还没有代理与流量"
          actions={
            onNavigate ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate("users")}>
                去用户管理
              </button>
            ) : undefined
          }
        >
          <p className="muted-text">到「用户」页给用户创建代理；用户开始使用后，这里会显示流量趋势、各国家流量和用量 Top 用户。</p>
        </Card>
      ) : null}

      <div className="dash-row">
        <Card
          title="流量分析"
          subtitle={hasTraffic ? "近 30 天上行 / 下行（单位自动换算）" : "各国家上游分布（条）"}
        >
          {hasTraffic ? (
            <LineChart
              series={[
                { label: "上行", color: CHART_COLORS.up, values: daily.map((point) => point.up) },
                { label: "下行", color: CHART_COLORS.down, values: daily.map((point) => point.down) }
              ]}
              xLabels={xLabels}
              formatValue={formatBytes}
              height={180}
            />
          ) : upstreamsByCountry.length > 0 ? (
            <BarList items={upstreamsByCountry} formatValue={(value) => `${value} 条`} color={CHART_COLORS.primary} emptyText="暂无上游" />
          ) : (
            <ChartEmpty text="暂无数据" hint="导入上游或产生流量后，这里会显示图表。" />
          )}
        </Card>
        <Card title="上游状态" subtitle="空闲 / 已绑定 / 停用">
          {upstreams.length === 0 ? (
            <EmptyState text="暂无上游" hint="先在「上游代理」导入上游。" />
          ) : (
            <Donut segments={upstreamSegments} centerValue={String(upstreams.length)} centerLabel="上游总数" />
          )}
        </Card>
      </div>

      <Card title="各国上游库存" subtitle="按国家统计当前可提取的住宅 / 机房库存（空闲池）与已绑定数">
        {inventoryByCountry.length === 0 ? (
          <EmptyState text="暂无上游" hint="先在「上游代理」导入上游。" />
        ) : (
          <DataTable minWidth={520}>
            <thead>
              <tr>
                <th>国家</th>
                <th className="num">总数</th>
                <th className="num">住宅可用</th>
                <th className="num">机房可用</th>
                <th className="num">已绑定</th>
              </tr>
            </thead>
            <tbody>
              {inventoryByCountry.map((row) => (
                <tr key={row.country}>
                  <td>{countryLabel(row.country)}</td>
                  <td className="num">{row.total}</td>
                  <td className="num">{row.resiFree}</td>
                  <td className="num">{row.dcFree}</td>
                  <td className="num">{row.locked}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      {hasTraffic ? (
        <div className="chart-grid-2">
          <Card title="各国家流量" subtitle="按代理目标国家汇总">
            <BarList items={countryTraffic} formatValue={formatBytes} color={CHART_COLORS.primary} emptyText="暂无流量数据" />
          </Card>
          <Card title="用量 Top 用户" subtitle="累计流量最高的用户">
            <BarList items={topUsers} formatValue={formatBytes} color={CHART_COLORS.teal} emptyText="暂无流量数据" />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
