import { useEffect, useMemo, useState } from "react";
import {
  ProxyEntry,
  ProxyEntryDetail,
  type AdminReadOnlyPage,
  type UpdateProxyEntryStatusResponse
} from "./ProxyEntryDetail";
import {
  CountSummary,
  DataTable,
  EmptySummary,
  FilterSummary,
  Metric,
  Panel,
  Status,
  formatBytes,
  formatLocation,
  statusLabel
} from "./shared";

type Props = {
  entries: ProxyEntry[];
  isSaving: boolean;
  onOpenAdminReadOnlyPage: (page: AdminReadOnlyPage, options: { country?: string | null; search?: string }) => void;
  readOnlyIntent: { country: string | null; page: "proxies"; search: string; token: number } | null;
  setReadOnlyIntent: (intent: null) => void;
  updateProxyEntryStatus: (entryId: number, status: "active" | "disabled") => Promise<UpdateProxyEntryStatusResponse>;
};

export function AdminProxies(props: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(props.entries[0]?.id ?? null);

  const countries = useMemo(
    () => [...new Set(props.entries.map((entry) => entry.targetCountry).filter(Boolean))].sort(),
    [props.entries]
  );

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    return props.entries.filter((entry) => {
      const textMatch =
        !text ||
        entry.username.toLowerCase().includes(text) ||
        entry.user.username.toLowerCase().includes(text) ||
        String(entry.id).includes(text) ||
        String(entry.currentUpstreamId ?? "").includes(text) ||
        (entry.currentIp || "").toLowerCase().includes(text) ||
        formatLocation(entry.targetCountry, entry.targetRegion, entry.targetCity).toLowerCase().includes(text);
      const statusMatch = statusFilter === "all" || entry.status === statusFilter;
      const countryMatch = countryFilter === "all" || entry.targetCountry === countryFilter;
      return textMatch && statusMatch && countryMatch;
    });
  }, [countryFilter, props.entries, search, statusFilter]);

  const selectedEntry = filtered.find((entry) => entry.id === selectedId) ?? filtered[0] ?? null;
  const hasFilters = !!search.trim() || statusFilter !== "all" || countryFilter !== "all";

  useEffect(() => {
    if (!props.readOnlyIntent) return;
    if (props.readOnlyIntent.search) setSearch(props.readOnlyIntent.search);
    if (props.readOnlyIntent.country) setCountryFilter(props.readOnlyIntent.country);
    setStatusFilter("all");
    props.setReadOnlyIntent(null);
  }, [props.readOnlyIntent, props.setReadOnlyIntent]);

  const activeCount = props.entries.filter((entry) => entry.status === "active").length;
  const disabledCount = props.entries.filter((entry) => entry.status === "disabled").length;
  const deadCount = props.entries.filter((entry) => entry.status === "dead").length;
  const liveConnections = props.entries.reduce((total, entry) => total + entry.activeConnections, 0);
  const totalTraffic = props.entries.reduce((total, entry) => total + Number(entry.trafficUsedBytes || 0), 0);

  return (
    <>
      <section className="metric-grid compact">
        <Metric label="代理总数" value={String(props.entries.length)} />
        <Metric label="启用" value={String(activeCount)} />
        <Metric label="停用" value={String(disabledCount)} />
        <Metric label="失效" value={String(deadCount)} />
        <Metric label="活跃连接" value={String(liveConnections)} />
        <Metric label="已用流量" value={formatBytes(totalTraffic)} />
      </section>

      <section className="action-strip">
        <div>
          <h2>代理运行工作区</h2>
          <p>先看代理状态、流量和连接数，再查看单条代理详情。重绑、禁用、删除先放在详情里走安全确认流程。</p>
        </div>
      </section>

      <section className="master-detail">
        <Panel title="代理运行" count={filtered.length}>
          <div className="hint-list">
            <span>搜索可以输入代理账号、所属用户、出口 IP 或地区；状态和国家筛选可以一起用。</span>
          </div>

          <div className="table-tools">
            <label>
              搜索
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID、代理账号、用户、出口 IP" />
            </label>
            <label>
              状态
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">全部状态</option>
                <option value="active">启用</option>
                <option value="disabled">停用</option>
                <option value="dead">失效</option>
              </select>
            </label>
            <label>
              国家
              <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
                <option value="all">全部国家</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setCountryFilter("all");
                }}
              >
                重置筛选
              </button>
            ) : null}
          </div>

          <FilterSummary
            items={[
              { label: "搜索", value: search.trim() || null, onClear: search.trim() ? () => setSearch("") : null },
              { label: "状态", value: statusFilter === "all" ? null : statusLabel(statusFilter), onClear: statusFilter === "all" ? null : () => setStatusFilter("all") },
              { label: "国家", value: countryFilter === "all" ? null : countryFilter.toUpperCase(), onClear: countryFilter === "all" ? null : () => setCountryFilter("all") }
            ]}
          />

          <CountSummary shown={filtered.length} total={props.entries.length} />

          <DataTable minWidth={760} maxHeight={500}>
            <thead>
              <tr>
                <th>代理账号</th>
                <th>用户</th>
                <th>目标地区</th>
                <th>状态</th>
                <th>流量</th>
                <th>连接</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className={selectedEntry?.id === entry.id ? "selected-row" : undefined}>
                  <td>
                    <strong>{entry.username}</strong>
                  </td>
                  <td>{entry.user.username}</td>
                  <td>{formatLocation(entry.targetCountry, entry.targetRegion, entry.targetCity)}</td>
                  <td>
                    <Status status={entry.status} />
                  </td>
                  <td>{formatBytes(entry.trafficUsedBytes)}</td>
                  <td>{entry.activeConnections}</td>
                  <td>
                    <button type="button" onClick={() => setSelectedId(entry.id)}>
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <EmptySummary shown={filtered.length} total={props.entries.length} emptyText="暂无代理运行记录。" filteredText="没有符合条件的代理运行记录" />
        </Panel>

        <ProxyEntryDetail
          entry={selectedEntry}
          isSaving={props.isSaving}
          onOpenAdminReadOnlyPage={props.onOpenAdminReadOnlyPage}
          updateProxyEntryStatus={props.updateProxyEntryStatus}
        />
      </section>
    </>
  );
}
