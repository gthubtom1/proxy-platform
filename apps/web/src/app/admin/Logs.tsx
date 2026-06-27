import { useMemo, useState } from "react";
import type { OperationLog } from "../types";
import { formatDate, formatOperationLogSummary, operationActionLabel } from "../format";
import { Card, DataTable, EmptyState, TablePager, usePaged } from "../ui";

type Props = {
  logs: OperationLog[];
};

export function AdminLogs(props: Props) {
  const { logs } = props;

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const actions = useMemo(() => {
    const set = new Set(logs.map((log) => log.action));
    return [...set].sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const summary = formatOperationLogSummary(log).toLowerCase();
      const actor = (log.actor?.username ?? "").toLowerCase();
      const matchesSearch =
        !query || summary.includes(query) || actor.includes(query) || operationActionLabel(log.action).toLowerCase().includes(query);
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  const paged = usePaged(filtered, 10);

  return (
    <div className="page page-wide">
      <Card title="操作日志" subtitle={`共 ${logs.length} 条记录 · 仅展示，不可修改`}>
        <div className="table-tools">
          <input
            className="table-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索操作内容 / 操作人"
          />
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="all">全部动作</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {operationActionLabel(action)}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            text={logs.length === 0 ? "还没有操作日志" : "没有符合条件的日志"}
            hint={logs.length === 0 ? "管理员或用户的关键操作会记录在这里。" : "换个搜索词或筛选条件试试。"}
          />
        ) : (
          <>
          <DataTable minWidth={760}>
            <thead>
              <tr>
                <th>时间</th>
                <th>动作</th>
                <th>操作人</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {paged.pageItems.map((log) => (
                <tr key={log.id}>
                  <td className="col-time">{formatDate(log.createdAt)}</td>
                  <td>
                    <span className="badge badge-info">{operationActionLabel(log.action)}</span>
                  </td>
                  <td>{log.actor?.username ?? "系统"}</td>
                  <td className="col-summary">{formatOperationLogSummary(log)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <TablePager paged={paged} unit="条" />
          </>
        )}
      </Card>
    </div>
  );
}
