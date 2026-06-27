import { useEffect, useMemo, useState } from "react";
import {
  CountSummary,
  DataTable,
  EmptySummary,
  FilterSummary,
  Metric,
  Panel,
  Status,
  formatDate,
  formatLocation,
  formatOperationLogSummary,
  operationActionLabel,
  statusLabel
} from "./shared";

type ScanLog = {
  city: string | null;
  country: string | null;
  createdAt: string;
  errorType: string | null;
  exitIp: string | null;
  id: number;
  message: string | null;
  region: string | null;
  success: boolean;
};

type UpstreamWithLogs = {
  host: string;
  id: number;
  scanLogs: ScanLog[];
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

type Props = {
  operationLogs: OperationLog[];
  readOnlyIntent: { search?: string; token: number } | null;
  setReadOnlyIntent: (intent: null) => void;
  upstreams: UpstreamWithLogs[];
};

type ScanLogRow = ScanLog & {
  host: string;
  upstreamId: number;
};

export function AdminLogs(props: Props) {
  const scanRows = useMemo<ScanLogRow[]>(
    () =>
      props.upstreams.flatMap((upstream) =>
        upstream.scanLogs.map((log) => ({
          ...log,
          host: upstream.host,
          upstreamId: upstream.id
        }))
      ),
    [props.upstreams]
  );

  const [operationSearch, setOperationSearch] = useState("");
  const [operationAction, setOperationAction] = useState("all");
  const [scanSearch, setScanSearch] = useState("");
  const [scanResult, setScanResult] = useState("all");

  useEffect(() => {
    if (!props.readOnlyIntent) return;
    if (props.readOnlyIntent.search) {
      setOperationSearch(props.readOnlyIntent.search);
      setScanSearch(props.readOnlyIntent.search);
    }
    setOperationAction("all");
    setScanResult("all");
    props.setReadOnlyIntent(null);
  }, [props.readOnlyIntent, props.setReadOnlyIntent]);

  const filteredOperationLogs = useMemo(() => {
    const text = operationSearch.trim().toLowerCase();
    return props.operationLogs.filter((log) => {
      const summary = formatOperationLogSummary(log).toLowerCase();
      const textMatch =
        !text ||
        log.action.toLowerCase().includes(text) ||
        log.targetType.toLowerCase().includes(text) ||
        String(log.targetId).toLowerCase().includes(text) ||
        (log.actor?.username || "").toLowerCase().includes(text) ||
        summary.includes(text);
      const actionMatch = operationAction === "all" || log.action === operationAction;
      return textMatch && actionMatch;
    });
  }, [operationAction, operationSearch, props.operationLogs]);

  const filteredScanLogs = useMemo(() => {
    const text = scanSearch.trim().toLowerCase();
    return scanRows.filter((row) => {
      const textMatch =
        !text ||
        String(row.upstreamId).toLowerCase().includes(text) ||
        row.host.toLowerCase().includes(text) ||
        (row.exitIp || "").toLowerCase().includes(text) ||
        formatLocation(row.country, row.region, row.city).toLowerCase().includes(text) ||
        (row.message || "").toLowerCase().includes(text) ||
        (row.errorType || "").toLowerCase().includes(text);
      const resultMatch =
        scanResult === "all" || (scanResult === "success" && row.success) || (scanResult === "failed" && !row.success);
      return textMatch && resultMatch;
    });
  }, [scanResult, scanRows, scanSearch]);

  const operationActions = useMemo(
    () => [...new Set(props.operationLogs.map((log) => log.action))].sort(),
    [props.operationLogs]
  );

  return (
    <>
      <section className="metric-grid compact">
        <Metric label="日志总数" value={String(scanRows.length + props.operationLogs.length)} />
        <Metric label="操作日志" value={String(filteredOperationLogs.length)} />
        <Metric label="成功" value={String(scanRows.filter((row) => row.success).length)} />
        <Metric
          label="失败"
          value={String(scanRows.filter((row) => !row.success).length)}
          tone={scanRows.some((row) => !row.success) ? "warn" : undefined}
        />
        <Metric label="类型" value="操作 + 扫描" />
        <Metric label="敏感信息" value="已隐藏" />
      </section>

      <section className="action-strip">
        <div>
          <h2>日志审计工作区</h2>
          <p>展示管理员操作和上游扫描日志。密码、密钥等敏感内容不会在这里显示。</p>
        </div>
      </section>

      <Panel title="管理员操作日志" count={filteredOperationLogs.length}>
        <div className="hint-list">
          <span>搜索可以输入管理员、动作、对象或摘要；动作筛选可以只看某一类操作。</span>
        </div>

        <div className="table-tools">
          <label>
            搜索
            <input value={operationSearch} onChange={(event) => setOperationSearch(event.target.value)} placeholder="管理员、动作、对象、摘要" />
          </label>
          <label>
            动作
            <select value={operationAction} onChange={(event) => setOperationAction(event.target.value)}>
              <option value="all">全部动作</option>
              {operationActions.map((action) => (
                <option key={action} value={action}>
                  {operationActionLabel(action)}
                </option>
              ))}
            </select>
          </label>
          {operationSearch.trim() || operationAction !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setOperationSearch("");
                setOperationAction("all");
              }}
            >
              重置筛选
            </button>
          ) : null}
        </div>

        <FilterSummary
          items={[
            { label: "搜索", value: operationSearch.trim() || null, onClear: operationSearch.trim() ? () => setOperationSearch("") : null },
            {
              label: "动作",
              value: operationAction === "all" ? null : operationActionLabel(operationAction),
              onClear: operationAction === "all" ? null : () => setOperationAction("all")
            }
          ]}
        />

        <CountSummary shown={filteredOperationLogs.length} total={props.operationLogs.length} />

        <DataTable minWidth={860} maxHeight={360}>
          <thead>
            <tr>
              <th>时间</th>
              <th>管理员</th>
              <th>动作</th>
              <th>对象</th>
              <th>摘要</th>
            </tr>
          </thead>
          <tbody>
            {filteredOperationLogs.map((log) => (
              <tr key={log.id}>
                <td>{formatDate(log.createdAt)}</td>
                <td>{log.actor?.username || `#${log.actorUserId ?? "-"}`}</td>
                <td>{operationActionLabel(log.action)}</td>
                <td>
                  {log.targetType} #{log.targetId}
                </td>
                <td>{formatOperationLogSummary(log)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <EmptySummary shown={filteredOperationLogs.length} total={props.operationLogs.length} emptyText="暂无管理员操作日志。" filteredText="没有符合条件的管理员操作日志" />
      </Panel>

      <Panel title="扫描日志" count={filteredScanLogs.length}>
        <div className="hint-list">
          <span>可以按上游编号、主机、出口 IP 或错误信息搜索，再按结果筛选。</span>
        </div>

        <div className="table-tools compact-tools">
          <label>
            搜索
            <input value={scanSearch} onChange={(event) => setScanSearch(event.target.value)} placeholder="上游编号、主机、出口 IP、错误信息" />
          </label>
          <label>
            结果
            <select value={scanResult} onChange={(event) => setScanResult(event.target.value)}>
              <option value="all">全部结果</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
            </select>
          </label>
          {scanSearch.trim() || scanResult !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setScanSearch("");
                setScanResult("all");
              }}
            >
              重置筛选
            </button>
          ) : null}
        </div>

        <FilterSummary
          items={[
            { label: "搜索", value: scanSearch.trim() || null, onClear: scanSearch.trim() ? () => setScanSearch("") : null },
            {
              label: "结果",
              value: scanResult === "all" ? null : statusLabel(scanResult),
              onClear: scanResult === "all" ? null : () => setScanResult("all")
            }
          ]}
        />

        <CountSummary shown={filteredScanLogs.length} total={scanRows.length} />

        <DataTable minWidth={820} maxHeight={560}>
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>对象</th>
              <th>结果</th>
              <th>出口 IP</th>
              <th>消息</th>
            </tr>
          </thead>
          <tbody>
            {filteredScanLogs.map((row) => (
              <tr key={`${row.upstreamId}-${row.id}`}>
                <td>{formatDate(row.createdAt)}</td>
                <td>scan_logs</td>
                <td>
                  #{row.upstreamId} {row.host}
                </td>
                <td>
                  <Status status={row.success ? "success" : "failed"} />
                </td>
                <td>{row.exitIp || "无"}</td>
                <td>{row.message || row.errorType || "无"}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        <EmptySummary shown={filteredScanLogs.length} total={scanRows.length} emptyText="暂无扫描日志。" filteredText="没有符合条件的扫描日志" />
      </Panel>
    </>
  );
}
