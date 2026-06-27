import { useMemo, useState } from "react";
import type { ProxyEntry } from "../types";
import { ApiError, adminApi } from "../api";
import { formatBytes, formatDate, formatLocation, statusLabel } from "../format";
import { Button, Card, DataTable, EmptyState, MessageBar, Modal, StatusBadge, TablePager, usePaged } from "../ui";

type Props = {
  proxies: ProxyEntry[];
  onChanged: () => void;
  onMessage: (message: { tone: "error" | "success"; text: string }) => void;
};

function DeleteModal(props: { entry: ProxyEntry; onClose: () => void; onChanged: () => void; onMessage: Props["onMessage"] }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.deleteProxyEntry(props.entry.id);
      props.onChanged();
      props.onMessage({ tone: "success", text: `已删除代理 ${props.entry.username}。` });
      props.onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "删除代理失败，请稍后再试。");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="删除代理" onClose={props.onClose} width={460}>
      {error ? <MessageBar tone="error" text={error} onDismiss={() => setError(null)} /> : null}
      {props.entry.activeConnections > 0 ? (
        <MessageBar
          tone="error"
          text={`该代理当前还有 ${props.entry.activeConnections} 个活跃连接，删除会中断正在使用它的请求。`}
        />
      ) : null}
      <p className="muted-text">
        确定删除代理 <strong>{props.entry.username}</strong>（用户 {props.entry.user.username}）吗？它绑定的上游会被释放回空闲池，此操作不可恢复。
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

export function AdminProxies(props: Props) {
  const { proxies, onChanged, onMessage } = props;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<ProxyEntry | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return proxies.filter((entry) => {
      const matchesSearch =
        !query ||
        entry.username.toLowerCase().includes(query) ||
        entry.user.username.toLowerCase().includes(query) ||
        (entry.currentIp ?? "").toLowerCase().includes(query) ||
        entry.targetCountry.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [proxies, search, statusFilter]);

  const paged = usePaged(filtered, 10);

  const activeCount = proxies.filter((entry) => entry.status === "active").length;
  const disabledCount = proxies.filter((entry) => entry.status === "disabled").length;

  async function toggleStatus(entry: ProxyEntry) {
    const nextStatus = entry.status === "active" ? "disabled" : "active";
    setTogglingId(entry.id);
    try {
      await adminApi.setProxyStatus(entry.id, nextStatus);
      onChanged();
      onMessage({
        tone: "success",
        text: `代理 ${entry.username} 已${nextStatus === "active" ? "启用" : "停用"}。`
      });
    } catch (err) {
      onMessage({ tone: "error", text: err instanceof ApiError ? err.message : "操作失败，请稍后再试。" });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="page page-wide">
      <Card
        title="代理运行"
        subtitle={`共 ${proxies.length} 条 · 运行中 ${activeCount} · 停用 ${disabledCount}`}
      >
        <div className="table-tools">
          <input
            className="table-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索代理账号 / 用户 / IP / 国家"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">全部状态</option>
            <option value="active">运行中</option>
            <option value="disabled">停用</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            text={proxies.length === 0 ? "还没有代理" : "没有符合条件的代理"}
            hint={proxies.length === 0 ? "在「用户」页给用户创建代理，或用户自行提取后会显示在这里。" : "换个搜索词或筛选条件试试。"}
          />
        ) : (
          <>
          <DataTable minWidth={1000}>
            <thead>
              <tr>
                <th>代理账号</th>
                <th>所属用户</th>
                <th>状态</th>
                <th>目标位置</th>
                <th>当前出口</th>
                <th className="num">已用流量</th>
                <th className="num">连接</th>
                <th>最近使用</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.pageItems.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.username}</strong>
                  </td>
                  <td>{entry.user.username}</td>
                  <td>
                    <StatusBadge status={entry.status} label={statusLabel(entry.status)} />
                  </td>
                  <td>{formatLocation(entry.targetCountry, entry.targetRegion, entry.targetCity)}</td>
                  <td>
                    {entry.currentIp
                      ? `${entry.currentIp}（${formatLocation(entry.currentCountry, entry.currentRegion, entry.currentCity)}）`
                      : "未绑定"}
                  </td>
                  <td className="num">{formatBytes(entry.trafficUsedBytes)}</td>
                  <td className="num">{entry.activeConnections}</td>
                  <td className="col-time">{formatDate(entry.lastUsedAt)}</td>
                  <td>
                    <div className="row-actions">
                      <Button size="sm" onClick={() => toggleStatus(entry)} loading={togglingId === entry.id}>
                        {entry.status === "active" ? "停用" : "启用"}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(entry)}>
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <TablePager paged={paged} unit="条" />
          </>
        )}
      </Card>

      {deleteTarget ? (
        <DeleteModal
          entry={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onChanged={onChanged}
          onMessage={onMessage}
        />
      ) : null}
    </div>
  );
}
