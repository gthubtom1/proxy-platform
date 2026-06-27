import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AdminReadOnlyPage } from "./ProxyEntryDetail";
import {
  ActionRow,
  CountSummary,
  DataTable,
  DetailItem,
  DisabledAction,
  EmptyState,
  EmptySummary,
  FilterSummary,
  Metric,
  Modal,
  Panel,
  Status,
  formatDate,
  formatLocation
} from "./shared";

type UpstreamProxy = {
  id: number;
  host: string;
  port: number;
  username: string;
  status: string;
  currentIp: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latencyMs: number | null;
  score: number;
  failCount: number;
  successCount: number;
  lastErrorType: string | null;
  lastCheckedAt: string | null;
};

type UpstreamImportResponse = {
  created: number;
  duplicates: number;
  failed: number;
};

type ReadOnlyIntent = {
  country: string | null;
  page: "upstreams";
  search: string;
  token: number;
};

type Props = {
  importResult: UpstreamImportResponse | null;
  importUpstreams: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSaving: boolean;
  onOpenAdminReadOnlyPage: (page: AdminReadOnlyPage, options: { country?: string | null; search?: string }) => void;
  readOnlyIntent: ReadOnlyIntent | null;
  setReadOnlyIntent: (intent: null) => void;
  setUpstreamText: (text: string) => void;
  upstreamStats: Record<string, number>;
  upstreamText: string;
  upstreams: UpstreamProxy[];
};

const COUNTRY_OPTIONS = [
  { value: "us", label: "US" },
  { value: "gb", label: "GB" },
  { value: "fr", label: "FR" },
  { value: "ca", label: "CA" },
  { value: "au", label: "AU" }
] as const;

export function AdminUpstreams(props: Props) {
  const [showImport, setShowImport] = useState(false);
  const [selectedUpstreamId, setSelectedUpstreamId] = useState<number | null>(props.upstreams[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  const countriesInData = useMemo(
    () => [...new Set(props.upstreams.map((upstream) => upstream.country).filter(Boolean))].sort() as string[],
    [props.upstreams]
  );

  const filteredUpstreams = useMemo(() => {
    const query = search.trim().toLowerCase();
    return props.upstreams.filter((upstream) => {
      const matchesSearch =
        !query ||
        upstream.host.toLowerCase().includes(query) ||
        upstream.username.toLowerCase().includes(query) ||
        String(upstream.id).includes(query) ||
        (upstream.currentIp || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || upstream.status === statusFilter;
      const matchesCountry = countryFilter === "all" || upstream.country === countryFilter;
      return matchesSearch && matchesStatus && matchesCountry;
    });
  }, [countryFilter, props.upstreams, search, statusFilter]);

  const pagedUpstreams = usePagedRows(filteredUpstreams, 8);
  const selectedUpstream = filteredUpstreams.find((upstream) => upstream.id === selectedUpstreamId) ?? filteredUpstreams[0] ?? null;
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || countryFilter !== "all";

  useEffect(() => {
    if (!props.readOnlyIntent) return;
    if (props.readOnlyIntent.search) setSearch(props.readOnlyIntent.search);
    if (props.readOnlyIntent.country) setCountryFilter(props.readOnlyIntent.country);
    setStatusFilter("all");
    props.setReadOnlyIntent(null);
  }, [props.readOnlyIntent, props.setReadOnlyIntent]);

  return (
    <>
      <section className="metric-grid compact">
        <Metric label="总上游" value={String(props.upstreams.length)} />
        <Metric label="空闲" value={String(props.upstreamStats.free ?? 0)} />
        <Metric label="已绑定" value={String(props.upstreamStats.locked ?? 0)} />
        <Metric label="冷却" value={String(props.upstreamStats.cooldown ?? 0)} />
        <Metric label="失败/停用" value={String((props.upstreamStats.bad ?? 0) + (props.upstreamStats.disabled ?? 0))} />
      </section>

      <section className="split-grid">
        <Panel title="上游状态分布">
          <StatusBars
            items={[
              { label: "空闲", value: props.upstreamStats.free ?? 0, tone: "ok" },
              { label: "已绑定", value: props.upstreamStats.locked ?? 0, tone: "info" },
              { label: "冷却", value: props.upstreamStats.cooldown ?? 0, tone: "warn" },
              { label: "失败", value: props.upstreamStats.bad ?? 0, tone: "bad" },
              { label: "停用", value: props.upstreamStats.disabled ?? 0, tone: "muted" }
            ]}
          />
        </Panel>
        <Panel title="国家库存">
          <InventoryBars upstreams={props.upstreams} />
        </Panel>
      </section>

      <section className="action-strip">
        <div>
          <h2>上游资源工作区</h2>
          <p>先看库存和异常，再用筛选定位具体上游。导入口收进弹窗，避免页面被表单撑长。</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setShowImport(true)}>
          导入上游
        </button>
      </section>

      {props.importResult ? (
        <Panel title="最近导入结果">
          <div className="result-list inline">
            <span>新增 {props.importResult.created}</span>
            <span>重复 {props.importResult.duplicates}</span>
            <span>失败 {props.importResult.failed}</span>
          </div>
        </Panel>
      ) : null}

      <section className="master-detail">
        <Panel title="上游资源" count={filteredUpstreams.length}>
          <div className="hint-list">
            <span>搜索可以输入上游 ID、host、用户名或出口 IP；状态和国家筛选可以一起用。</span>
          </div>
          <div className="table-tools">
            <label>
              搜索
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID、host、用户名、出口 IP" />
            </label>
            <label>
              状态
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">全部状态</option>
                <option value="free">空闲</option>
                <option value="locked">已绑定</option>
                <option value="cooldown">冷却</option>
                <option value="bad">失败</option>
                <option value="disabled">停用</option>
              </select>
            </label>
            <label>
              国家
              <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
                <option value="all">全部国家</option>
                {countriesInData.map((country) => (
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
          <CountSummary shown={filteredUpstreams.length} total={props.upstreams.length} />

          <DataTable minWidth={760} maxHeight={500}>
            <thead>
              <tr>
                <th>ID</th>
                <th>上游</th>
                <th>状态</th>
                <th>出口 IP</th>
                <th>地区</th>
                <th>延迟</th>
                <th>最后检测</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedUpstreams.rows.map((upstream) => (
                <tr className={selectedUpstream?.id === upstream.id ? "selected-row" : undefined} key={upstream.id}>
                  <td>#{upstream.id}</td>
                  <td>
                    <strong>
                      {upstream.host}:{upstream.port}
                    </strong>
                  </td>
                  <td>
                    <Status status={upstream.status} />
                  </td>
                  <td>{upstream.currentIp || "未检测"}</td>
                  <td>{formatLocation(upstream.country, upstream.region, upstream.city)}</td>
                  <td>{formatLatency(upstream.latencyMs)}</td>
                  <td>{formatDate(upstream.lastCheckedAt)}</td>
                  <td>
                    <button type="button" onClick={() => setSelectedUpstreamId(upstream.id)}>
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <Pagination page={pagedUpstreams.page} totalPages={pagedUpstreams.totalPages} onPageChange={pagedUpstreams.setPage} />
          <EmptySummary shown={filteredUpstreams.length} total={props.upstreams.length} emptyText="暂无上游资源。" filteredText="没有符合筛选条件的上游资源" />
        </Panel>

        <UpstreamDetail onOpenAdminReadOnlyPage={props.onOpenAdminReadOnlyPage} upstream={selectedUpstream} />
      </section>

      {showImport ? (
        <Modal title="导入上游" onClose={() => setShowImport(false)}>
          <form className="modal-form" onSubmit={props.importUpstreams}>
            <label>
              上游列表
              <span className="field-note">一行填一条，格式固定为 `host:port:username:password`。</span>
              <span className="field-note">重复的上游不会重复创建；格式不对的行会记到失败结果里。</span>
              <textarea value={props.upstreamText} onChange={(event) => props.setUpstreamText(event.target.value)} placeholder="host:port:username:password" />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowImport(false)}>
                取消
              </button>
              <button className="primary-button" type="submit" disabled={props.isSaving || !props.upstreamText.trim()}>
                导入上游
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

function UpstreamDetail(props: {
  onOpenAdminReadOnlyPage: (page: "logs" | "proxies" | "upstreams" | "users", options: { country?: string | null; search?: string }) => void;
  upstream: UpstreamProxy | null;
}) {
  if (!props.upstream) {
    return (
      <Panel title="上游详情">
        <EmptyState text="请选择一条上游资源。" />
      </Panel>
    );
  }

  return (
    <aside className="detail-panel">
      <div className="section-heading">
        <h2>上游详情</h2>
        <Status status={props.upstream.status} />
      </div>
      <div className="detail-title">
        <strong>#{props.upstream.id}</strong>
        <span>
          {props.upstream.host}:{props.upstream.port}
        </span>
      </div>
      <div className="detail-grid">
        <DetailItem label="用户名" value={props.upstream.username} />
        <DetailItem label="出口 IP" value={props.upstream.currentIp || "未检测"} />
        <DetailItem label="地区" value={formatLocation(props.upstream.country, props.upstream.region, props.upstream.city)} />
        <DetailItem label="延迟" value={formatLatency(props.upstream.latencyMs)} />
        <DetailItem label="成功/失败" value={`${props.upstream.successCount}/${props.upstream.failCount}`} />
        <DetailItem label="最后检测" value={formatDate(props.upstream.lastCheckedAt)} />
        <DetailItem label="最后错误" value={props.upstream.lastErrorType || "无"} />
        <DetailItem label="评分" value={String(props.upstream.score)} />
      </div>
      <div className="deferred-actions">
        <p>危险操作暂缓到安全操作会话处理。</p>
        <ActionRow>
          <button
            type="button"
            onClick={() =>
              props.onOpenAdminReadOnlyPage("proxies", {
                country: props.upstream?.country ?? null,
                search: props.upstream ? String(props.upstream.id) : ""
              })
            }
          >
            查看代理
          </button>
          <button type="button" onClick={() => props.onOpenAdminReadOnlyPage("logs", { search: props.upstream ? String(props.upstream.id) : "" })}>
            查看日志
          </button>
          <DisabledAction label="检测" />
          <DisabledAction label="停用" />
          <DisabledAction label="删除" />
        </ActionRow>
      </div>
    </aside>
  );
}

function StatusBars(props: { items: Array<{ label: string; tone: "bad" | "info" | "muted" | "ok" | "warn"; value: number }> }) {
  const total = Math.max(1, props.items.reduce((sum, item) => sum + item.value, 0));

  return (
    <div className="bar-list">
      {props.items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-meta">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="bar-track">
            <span className={`bar-fill ${item.tone}`} style={{ width: `${Math.max(3, Math.round((item.value / total) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InventoryBars(props: { upstreams: UpstreamProxy[] }) {
  const items = COUNTRY_OPTIONS.map((country) => {
    const rows = props.upstreams.filter((upstream) => upstream.country === country.value);
    return {
      free: rows.filter((row) => row.status === "free").length,
      label: country.label,
      value: rows.length
    };
  });
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="inventory-list">
      {items.map((item) => (
        <div className="inventory-row" key={item.label}>
          <span>{item.label}</span>
          <div className="bar-track">
            <span className="bar-fill info" style={{ width: `${Math.max(3, Math.round((item.value / max) * 100))}%` }} />
          </div>
          <strong>
            {item.free}/{item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

function Pagination(props: { onPageChange: (page: number) => void; page: number; totalPages: number }) {
  if (props.totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        type="button"
        aria-label="上一页"
        disabled={props.page <= 1}
        onClick={() => props.onPageChange(props.page - 1)}
        title="上一页"
      >
        上一页
      </button>
      <span>
        第 {props.page} / 共 {props.totalPages} 页
      </span>
      <button
        type="button"
        aria-label="下一页"
        disabled={props.page >= props.totalPages}
        onClick={() => props.onPageChange(props.page + 1)}
        title="下一页"
      >
        下一页
      </button>
    </div>
  );
}

function usePagedRows<T>(rows: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  return {
    page: safePage,
    rows: rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    setPage,
    totalPages
  };
}

function formatLatency(value: number | null): string {
  return typeof value === "number" ? `${value} ms` : "未测";
}

function statusLabel(status: string): string {
  return (
    {
      bad: "失败",
      cooldown: "冷却",
      disabled: "停用",
      free: "空闲",
      locked: "已绑定"
    }[status] || status
  );
}
