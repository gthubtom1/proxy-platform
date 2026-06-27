import { useEffect, useMemo, useRef, useState } from "react";
import type { Upstream } from "../types";
import { ApiError, adminApi } from "../api";
import { formatDate, formatLocation, statusLabel } from "../format";
import { Button, Card, DataTable, EmptyState, Field, MessageBar, Modal, StatusBadge, TablePager, usePaged } from "../ui";

// Live "scan console": polls the lightweight activity feed and renders the most
// recently checked upstreams terminal-style, newest on top. Any scan (manual run,
// the worker's full sweep, or the in-use fast lane) updates lastCheckedAt, so this
// shows real-time progress without the operator hitting refresh.
type ScanActivityRow = {
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
  lastCheckedAt: string | null;
};

function hhmmss(value: string | null): string {
  if (!value) return "--:--:--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toTimeString().slice(0, 8);
}

// Friendlier console labels for raw scan error types.
const SCAN_ERROR_LABELS: Record<string, string> = {
  rate_limited: "供应商限流(402/429)",
  timeout: "超时",
  auth_failed: "认证失败(407)",
  connect_failed: "连不上",
  connect_aborted: "连接被断",
  empty_reply: "空响应",
  dns_failed: "DNS失败",
  ip_lookup_failed: "查地理失败",
  unsupported_country: "不支持的国家",
  decrypt_failed: "解密失败",
  unknown_error: "未知错误"
};

function scanErrorLabel(errorType: string | null): string {
  if (!errorType) return "失败";
  return SCAN_ERROR_LABELS[errorType] ?? errorType;
}

// Refine the raw upstream status into a clearer label + hover tooltip. The key
// case: a "cooldown" caused by provider throttle (HTTP 402) is NOT a failure of
// the upstream (it does not count as a fail or drop the grade), so it is shown as
// "限流退避中" — distinct from a real failure retry, which shows the actual reason.
function refinedStatus(item: { status: string; lastErrorType: string | null }): { label: string; title?: string } {
  if (item.status === "cooldown") {
    if (item.lastErrorType === "rate_limited") {
      return {
        label: "限流退避中",
        title: "被供应商限流(HTTP 402/429)，单独退避稍后自动重试；不计失败、不影响成功率与级别"
      };
    }
    return {
      label: "重试中",
      title: item.lastErrorType ? `失败原因：${scanErrorLabel(item.lastErrorType)}，冷却后自动重试` : "失败后冷却，稍后自动重试"
    };
  }
  if (item.status === "bad") {
    return {
      label: "待核验",
      title: item.lastErrorType ? `连续失败进入待核验：${scanErrorLabel(item.lastErrorType)}` : "连续失败进入待核验，等管理员处理"
    };
  }
  return { label: statusLabel(item.status) };
}

function UpstreamStatusCell({ item }: { item: { status: string; lastErrorType: string | null } }) {
  const s = refinedStatus(item);
  return (
    <span title={s.title}>
      <StatusBadge status={item.status} label={s.label} />
    </span>
  );
}

// Map each upstream to the user-facing extraction grade (line type × stability),
// mirroring the backend resolveExtractGrade so the admin distribution matches what
// users can actually pick. A proxy-flagged IP collapses to one grade regardless of
// stability; residential/unknown ip_type is the residential pool (fail-open).
const GRADE_ORDER = ["resi_premium", "resi_normal", "resi_dynamic", "proxy_flagged", "dc_static", "dc_dynamic"] as const;
const GRADE_LABELS: Record<string, string> = {
  resi_premium: "高级纯净住宅",
  resi_normal: "普通纯净住宅",
  resi_dynamic: "动态住宅",
  proxy_flagged: "代理标记IP",
  dc_static: "稳定机房",
  dc_dynamic: "动态机房"
};
const TIER_LABELS: Record<string, string> = { static: "静态", quasi: "准静态", dynamic: "动态" };

function upstreamGrade(item: { ipType: string | null; stabilityTier: string | null }): string {
  if (item.ipType === "proxy") return "proxy_flagged";
  if (item.ipType === "hosting") return item.stabilityTier === "static" ? "dc_static" : "dc_dynamic";
  if (item.stabilityTier === "static") return "resi_premium";
  if (item.stabilityTier === "quasi") return "resi_normal";
  return "resi_dynamic";
}

function gradeCell(item: Upstream) {
  const score = item.stabilityScore;
  return (
    <span title={`级别=${GRADE_LABELS[upstreamGrade(item)]}，稳定层=${TIER_LABELS[item.stabilityTier ?? ""] ?? "未知"}`}>
      {GRADE_LABELS[upstreamGrade(item)] ?? "—"}
      {score != null ? <span className="muted-text"> · {score}</span> : null}
    </span>
  );
}

// "Continuously-stable for how long": stableSince is the start of the current
// uninterrupted static streak (longer = more trusted, drives extraction priority).
function stableDurationCell(stableSince: string | null) {
  if (!stableSince) return <span className="muted-text">—</span>;
  const start = new Date(stableSince).getTime();
  if (Number.isNaN(start)) return <span className="muted-text">—</span>;
  const mins = Math.max(0, Math.floor((Date.now() - start) / 60000));
  let text: string;
  if (mins < 60) text = `${mins}分钟`;
  else if (mins < 24 * 60) text = `${Math.floor(mins / 60)}时${mins % 60}分`;
  else text = `${Math.floor(mins / 1440)}天${Math.floor((mins % 1440) / 60)}时`;
  return <span title={`连续稳定起点 ${new Date(stableSince).toLocaleString()}`}>{text}</span>;
}

function ScanConsole() {
  const [recent, setRecent] = useState<ScanActivityRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [summary, setSummary] = useState<{ total: number; free: number; cooldown: number; bad: number } | null>(null);
  const [offline, setOffline] = useState(false);
  const lastSeenRef = useRef<string | null>(null);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const data = await adminApi.scanActivity();
        if (!alive) return;
        setRecent(data.recent);
        setScanning(data.scanning);
        setSummary({ total: data.summary.total, free: data.summary.free, cooldown: data.summary.cooldown, bad: data.summary.bad });
        setOffline(false);
        // "live" dot pulses when the newest checked timestamp advanced this tick.
        const newest = data.recent[0]?.lastCheckedAt ?? null;
        setFresh(newest !== null && newest !== lastSeenRef.current);
        lastSeenRef.current = newest;
      } catch {
        if (alive) setOffline(true);
      }
    };
    void tick();
    const timer = window.setInterval(tick, 2500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const live = scanning || fresh;

  return (
    <div className="scan-console">
      <div className="scan-console-head">
        <span className={`scan-console-dot${live ? " live" : ""}`} />
        <span>实时扫描</span>
        <span className="scan-console-state">{offline ? "连接中断" : scanning ? "扫描中…" : "监听中"}</span>
      </div>
      {summary ? (
        <div className="scan-console-summary">
          共 {summary.total} · 成功池 {summary.free} · 重试 {summary.cooldown} · 待核验 {summary.bad}
        </div>
      ) : null}
      <div className="scan-console-body">
        {recent.length === 0 ? (
          <div className="scan-console-empty">等待扫描数据…（worker 每轮 / 点「立即扫描全部」都会在这里实时显示）</div>
        ) : (
          recent.map((row) => {
            const ok = !row.lastErrorType;
            return (
              <div key={row.id} className={`scan-line ${ok ? "ok" : "fail"}`}>
                <span className="scan-time">{hhmmss(row.lastCheckedAt)}</span>
                <span className="scan-ic">{ok ? "✓" : "✗"}</span>
                <span className="scan-host">{row.host}:{row.port}</span>
                {ok ? (
                  <>
                    <span className="scan-arrow">→</span>
                    <span className="scan-ip">{row.currentIp ?? "—"}</span>
                    <span className="scan-loc">{formatLocation(row.country, row.region, row.city)}</span>
                    <span className="scan-lat">{row.latencyMs != null ? `${row.latencyMs}ms` : ""}</span>
                  </>
                ) : (
                  <span className="scan-err">{scanErrorLabel(row.lastErrorType)}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

type Props = {
  upstreams: Upstream[];
  onChanged: () => void;
  onMessage: (message: { tone: "error" | "success"; text: string }) => void;
};

// Cumulative scan success rate. Low rates highlight flaky upstreams that keep
// recovering on the occasional success and would otherwise look healthy.
function successRateCell(successCount: number, failCount: number) {
  const total = successCount + failCount;
  if (total === 0) return <span className="muted-text">—</span>;
  const rate = Math.round((successCount / total) * 100);
  const className = rate < 60 ? "rate-bad" : rate < 85 ? "rate-warn" : "rate-ok";
  return <span className={className}>{rate}%</span>;
}

function ImportModal(props: { onClose: () => void; onChanged: () => void; onMessage: Props["onMessage"] }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lineCount = text.split("\n").filter((line) => line.trim().length > 0).length;

  async function submit() {
    if (lineCount === 0) {
      setError("请粘贴至少一行上游代理。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await adminApi.importUpstreams(text);
      props.onChanged();
      props.onMessage({
        tone: "success",
        text: `导入完成：新增 ${result.created}，重复 ${result.duplicates}，失败 ${result.failed}。`
      });
      props.onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "导入失败，请检查格式后重试。");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="导入上游代理" onClose={props.onClose} width={560}>
      <div className="form-grid">
        {error ? <MessageBar tone="error" text={error} onDismiss={() => setError(null)} /> : null}
        <Field label="上游列表" hint="每行一条，支持 host:port:用户名:密码 或 http://用户名:密码@host:port。">
          <textarea
            className="import-textarea"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"host:port:username:password\nhttp://username:password@host:port"}
            spellCheck={false}
          />
        </Field>
        <div className="form-actions">
          <span className="muted-text" style={{ marginRight: "auto" }}>
            已填 {lineCount} 行
          </span>
          <Button variant="ghost" onClick={props.onClose}>
            取消
          </Button>
          <Button variant="primary" loading={submitting} disabled={lineCount === 0} onClick={submit}>
            导入
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteModal(props: { upstream: Upstream; onClose: () => void; onChanged: () => void; onMessage: Props["onMessage"] }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.deleteUpstream(props.upstream.id);
      props.onChanged();
      props.onMessage({ tone: "success", text: `已删除上游 ${props.upstream.host}:${props.upstream.port}。` });
      props.onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "删除上游失败，请稍后再试。");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="删除上游" onClose={props.onClose} width={460}>
      {error ? <MessageBar tone="error" text={error} onDismiss={() => setError(null)} /> : null}
      <p className="muted-text">
        确定删除上游 <strong>{props.upstream.host}:{props.upstream.port}</strong> 吗？若它正被代理绑定，会先解绑再删除，此操作不可恢复。
      </p>
      <div className="proxy-result-foot" style={{ gap: 10 }}>
        <Button variant="ghost" onClick={props.onClose}>
          取消
        </Button>
        <Button variant="danger" loading={submitting} onClick={confirm}>
          确认删除
        </Button>
      </div>
    </Modal>
  );
}

export function AdminUpstreams(props: Props) {
  const { upstreams, onChanged, onMessage } = props;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Upstream | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [recoveringId, setRecoveringId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<"test" | "recover" | null>(null);
  const [scanningAll, setScanningAll] = useState(false);

  async function scanAll() {
    setScanningAll(true);
    try {
      // Scan the pool the admin is currently viewing (the status filter), not the
      // whole table — "all" still means every scannable upstream.
      const result = await adminApi.runScan(statusFilter);
      onMessage({ tone: "success", text: result.message });
      if (result.started) {
        // The scan runs in the background; reload a few times so its progress and
        // final pool changes show up without the operator hitting refresh.
        for (const delay of [3000, 8000, 15000, 25000]) {
          setTimeout(() => onChanged(), delay);
        }
      }
    } catch (err) {
      onMessage({ tone: "error", text: err instanceof ApiError ? err.message : "触发扫描失败，请稍后再试。" });
    } finally {
      setScanningAll(false);
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return upstreams.filter((item) => {
      const matchesSearch =
        !query ||
        item.host.toLowerCase().includes(query) ||
        String(item.port).includes(query) ||
        (item.currentIp ?? "").toLowerCase().includes(query) ||
        (item.country ?? "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesGrade = !gradeFilter || upstreamGrade(item) === gradeFilter;
      return matchesSearch && matchesStatus && matchesGrade;
    });
  }, [upstreams, search, statusFilter, gradeFilter]);

  const paged = usePaged(filtered, 10);

  // Distribution by extraction grade (line type × stability), computed from the
  // full pool so the admin sees real-time inventory per grade.
  const gradeDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of upstreams) {
      const grade = upstreamGrade(item);
      counts[grade] = (counts[grade] ?? 0) + 1;
    }
    return counts;
  }, [upstreams]);

  const freeCount = upstreams.filter((item) => item.status === "free").length;
  const lockedCount = upstreams.filter((item) => item.status === "locked").length;
  const cooldownCount = upstreams.filter((item) => item.status === "cooldown").length;
  const badCount = upstreams.filter((item) => item.status === "bad").length;
  const disabledCount = upstreams.filter((item) => item.status === "disabled").length;

  async function toggleStatus(item: Upstream) {
    const nextStatus = item.status === "disabled" ? "free" : "disabled";
    setTogglingId(item.id);
    try {
      await adminApi.setUpstreamStatus(item.id, nextStatus);
      onChanged();
      onMessage({
        tone: "success",
        text: `${item.host}:${item.port} 已${nextStatus === "free" ? "启用" : "停用"}。`
      });
    } catch (err) {
      onMessage({ tone: "error", text: err instanceof ApiError ? err.message : "操作失败，请稍后再试。" });
    } finally {
      setTogglingId(null);
    }
  }

  async function testNow(item: Upstream) {
    setTestingId(item.id);
    try {
      const result = await adminApi.rescanUpstream(item.id);
      onChanged();
      onMessage({
        tone: result.success ? "success" : "error",
        text: result.success
          ? `${item.host}:${item.port} 测试成功，出口 ${result.upstream?.currentIp ?? "—"}。`
          : `${item.host}:${item.port} 测试失败：${result.message}`
      });
    } catch (err) {
      onMessage({ tone: "error", text: err instanceof ApiError ? err.message : "测试失败，请稍后再试。" });
    } finally {
      setTestingId(null);
    }
  }

  async function recover(item: Upstream) {
    setRecoveringId(item.id);
    try {
      await adminApi.recoverUpstream(item.id);
      onChanged();
      onMessage({ tone: "success", text: `${item.host}:${item.port} 已恢复，将重新参与扫描。` });
    } catch (err) {
      onMessage({ tone: "error", text: err instanceof ApiError ? err.message : "恢复失败，请稍后再试。" });
    } finally {
      setRecoveringId(null);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage(pageIds: number[], checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function bulkTest() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy("test");
    try {
      const result = await adminApi.rescanUpstreams(ids);
      onChanged();
      setSelectedIds(new Set());
      onMessage({
        tone: "success",
        text: `批量测试完成：成功 ${result.succeeded}，失败 ${result.failed}${result.missing ? `，跳过 ${result.missing}` : ""}。`
      });
    } catch (err) {
      onMessage({ tone: "error", text: err instanceof ApiError ? err.message : "批量测试失败，请稍后再试。" });
    } finally {
      setBulkBusy(null);
    }
  }

  async function bulkRecover() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy("recover");
    try {
      const result = await adminApi.recoverUpstreams(ids);
      onChanged();
      setSelectedIds(new Set());
      onMessage({
        tone: "success",
        text: `批量恢复完成：已恢复 ${result.recovered}${result.skipped ? `，跳过 ${result.skipped}（非重试/待核验池）` : ""}。`
      });
    } catch (err) {
      onMessage({ tone: "error", text: err instanceof ApiError ? err.message : "批量恢复失败，请稍后再试。" });
    } finally {
      setBulkBusy(null);
    }
  }

  const statusCards: { key: string; label: string; count: number; tone: string }[] = [
    { key: "all", label: "全部", count: upstreams.length, tone: "slate" },
    { key: "free", label: "成功池", count: freeCount, tone: "green" },
    { key: "locked", label: "已绑定", count: lockedCount, tone: "blue" },
    { key: "cooldown", label: "重试池", count: cooldownCount, tone: "amber" },
    { key: "bad", label: "待核验", count: badCount, tone: "red" },
    { key: "disabled", label: "停用", count: disabledCount, tone: "slate" }
  ];

  return (
    <div className="page page-wide">
      <div className="status-cards">
        {statusCards.map((card) => (
          <button
            type="button"
            key={card.key}
            className={`status-card status-card-${card.tone}${statusFilter === card.key ? " is-active" : ""}`}
            onClick={() => {
              setStatusFilter(card.key);
              paged.setPage(1);
            }}
            aria-pressed={statusFilter === card.key}
          >
            <span className="status-card-count">{card.count}</span>
            <span className="status-card-label">{card.label}</span>
          </button>
        ))}
      </div>

      <Card title="级别分布" subtitle="按线路 × 稳定性统计当前上游池，与用户提取页的「用途档」一一对应；点卡片可筛选下方列表，再点一次取消">
        <div className="status-cards">
          {GRADE_ORDER.map((grade) => (
            <button
              type="button"
              key={grade}
              className={`status-card status-card-slate${gradeFilter === grade ? " is-active" : ""}`}
              onClick={() => {
                setGradeFilter((current) => (current === grade ? null : grade));
                paged.setPage(1);
              }}
              aria-pressed={gradeFilter === grade}
            >
              <span className="status-card-count">{gradeDist[grade] ?? 0}</span>
              <span className="status-card-label">{GRADE_LABELS[grade]}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="upstreams-split">
      <div className="upstreams-main">
      <Card
        title="上游代理"
        subtitle={`共 ${upstreams.length} 条 · 空闲 ${freeCount} · 已绑定 ${lockedCount} · 重试池 ${cooldownCount} · 待核验 ${badCount} · 停用 ${disabledCount}`}
        actions={
          <div className="row-actions">
            <Button
              size="sm"
              loading={scanningAll}
              onClick={scanAll}
              title={
                statusFilter === "all"
                  ? "对所有可扫描上游立即检测一次"
                  : `只扫描当前「${statusCards.find((card) => card.key === statusFilter)?.label ?? ""}」列表`
              }
            >
              {statusFilter === "all"
                ? "立即扫描全部"
                : `扫描${statusCards.find((card) => card.key === statusFilter)?.label ?? "当前"}`}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowImport(true)}>
              导入上游
            </Button>
          </div>
        }
      >
        <div className="table-tools">
          <input
            className="table-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索 host / 端口 / IP / 国家"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">全部状态</option>
            <option value="free">空闲（成功池）</option>
            <option value="locked">已绑定</option>
            <option value="cooldown">重试池</option>
            <option value="bad">待核验池</option>
            <option value="disabled">停用</option>
          </select>
        </div>

        {selectedIds.size > 0 ? (
          <div className="bulk-bar">
            <span className="bulk-bar-text">已选 {selectedIds.size} 条</span>
            <Button size="sm" loading={bulkBusy === "test"} onClick={bulkTest}>
              测试选中
            </Button>
            <Button size="sm" loading={bulkBusy === "recover"} onClick={bulkRecover}>
              恢复选中
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              清除选择
            </Button>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <EmptyState
            text={upstreams.length === 0 ? "还没有上游代理" : "没有符合条件的上游"}
            hint={upstreams.length === 0 ? "点右上角「导入上游」批量添加。" : "换个搜索词或筛选条件试试。"}
          />
        ) : (
          <>
          {(() => {
            const pageIds = paged.pageItems.map((item) => item.id);
            const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
            return (
          <DataTable minWidth={1240}>
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    aria-label="全选当前页"
                    checked={allOnPageSelected}
                    onChange={(event) => toggleSelectAllOnPage(pageIds, event.target.checked)}
                  />
                </th>
                <th>上游</th>
                <th>状态</th>
                <th>级别</th>
                <th>连续稳定</th>
                <th>出口 IP</th>
                <th>位置</th>
                <th className="num">延迟</th>
                <th className="num">成功/失败</th>
                <th className="num">成功率</th>
                <th>最近检测</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.pageItems.map((item) => {
                const locked = item.status === "locked";
                return (
                  <tr key={item.id}>
                    <td className="col-check">
                      <input
                        type="checkbox"
                        aria-label={`选择 ${item.host}:${item.port}`}
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td>
                      <strong>{item.host}:{item.port}</strong>
                    </td>
                    <td>
                      <UpstreamStatusCell item={item} />
                    </td>
                    <td>{gradeCell(item)}</td>
                    <td className="col-time">{stableDurationCell(item.stableSince)}</td>
                    <td>{item.currentIp ?? "—"}</td>
                    <td>{formatLocation(item.country, item.region, item.city)}</td>
                    <td className="num">{item.latencyMs != null ? `${item.latencyMs}ms` : "—"}</td>
                    <td className="num">
                      {item.successCount}/{item.failCount}
                    </td>
                    <td className="num">{successRateCell(item.successCount, item.failCount)}</td>
                    <td className="col-time">{formatDate(item.lastCheckedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <Button
                          size="sm"
                          onClick={() => testNow(item)}
                          loading={testingId === item.id}
                          disabled={item.status === "disabled"}
                          title={item.status === "disabled" ? "已停用，先启用再测试" : "立即测试这条上游能不能用"}
                        >
                          测试
                        </Button>
                        {item.status === "cooldown" || item.status === "bad" ? (
                          <Button
                            size="sm"
                            onClick={() => recover(item)}
                            loading={recoveringId === item.id}
                            title="清空失败计数，放回成功池重新参与扫描"
                          >
                            恢复
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          onClick={() => toggleStatus(item)}
                          loading={togglingId === item.id}
                          disabled={locked}
                          title={locked ? "已绑定代理，先解绑或删除对应代理" : undefined}
                        >
                          {item.status === "disabled" ? "启用" : "停用"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
            );
          })()}
          <TablePager paged={paged} unit="条" />
          </>
        )}
      </Card>
      </div>
      <ScanConsole />
      </div>

      {showImport ? (
        <ImportModal onClose={() => setShowImport(false)} onChanged={onChanged} onMessage={onMessage} />
      ) : null}
      {deleteTarget ? (
        <DeleteModal
          upstream={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onChanged={onChanged}
          onMessage={onMessage}
        />
      ) : null}
    </div>
  );
}
