import { useState } from "react";
import {
  ActionRow,
  DetailItem,
  DisabledAction,
  EmptyState,
  Modal,
  Panel,
  Status,
  formatBytes,
  formatDate,
  formatLocation,
  statusLabel
} from "./shared";

export type AdminReadOnlyPage = "logs" | "proxies" | "upstreams" | "users";

export type ProxyEntryStatusAction = "active" | "disabled";

export type UpdateProxyEntryStatusResponse = {
  ok?: boolean;
  entry?: {
    id: number;
    username: string;
    status: string;
    currentUpstreamId: number | null;
    currentIp: string | null;
    currentCountry: string | null;
    currentRegion: string | null;
    currentCity: string | null;
    updatedAt: string;
  };
  error?: string;
};

export type ProxyEntry = {
  id: number;
  username: string;
  targetCountry: string;
  targetRegion: string | null;
  targetCity: string | null;
  currentUpstreamId: number | null;
  currentIp: string | null;
  currentCountry: string | null;
  currentRegion: string | null;
  currentCity: string | null;
  status: string;
  trafficUsedBytes: string;
  activeConnections: number;
  lastUsedAt: string | null;
  lastCheckedAt: string | null;
  user: {
    username: string;
  };
  lockedUpstream: {
    id: number;
  } | null;
};

export type ProxyEntryDetailProps = {
  entry: ProxyEntry | null;
  isSaving: boolean;
  onOpenAdminReadOnlyPage: (page: AdminReadOnlyPage, options: { country?: string | null; search?: string }) => void;
  updateProxyEntryStatus: (entryId: number, status: ProxyEntryStatusAction) => Promise<UpdateProxyEntryStatusResponse>;
};

type PendingStatusAction = {
  activeConnections: number;
  currentIp: string | null;
  currentStatus: string;
  entryId: number;
  lockedUpstreamId: number | null;
  status: ProxyEntryStatusAction;
  targetCity: string | null;
  targetCountry: string;
  targetRegion: string | null;
  username: string;
};

export function ProxyEntryDetail(props: ProxyEntryDetailProps) {
  const [pendingAction, setPendingAction] = useState<PendingStatusAction | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  if (!props.entry && !pendingAction) {
    return (
      <Panel title="代理详情">
        <EmptyState text="请选择一条代理。" />
      </Panel>
    );
  }

  const currentEntry = props.entry;
  const statusAction =
    currentEntry?.status === "active"
      ? { nextStatus: "disabled" as const, buttonLabel: "停用代理" }
      : currentEntry?.status === "disabled" || currentEntry?.status === "dead"
        ? { nextStatus: "active" as const, buttonLabel: "启用代理" }
        : null;

  async function confirmStatusChange() {
    if (!pendingAction) return;

    setStatusError(null);
    const result = await props.updateProxyEntryStatus(pendingAction.entryId, pendingAction.status);
    if (result.ok) {
      setPendingAction(null);
      setStatusError(null);
      return;
    }

    setStatusError(result.error || "修改代理状态失败");
  }

  return (
    <>
      {currentEntry ? (
        <aside className="detail-panel">
          <div className="section-heading">
            <h2>代理详情</h2>
            <Status status={currentEntry.status} />
          </div>

          <div className="detail-title">
            <strong>#{currentEntry.id}</strong>
            <span>{currentEntry.username}</span>
          </div>

          <div className="detail-grid">
            <DetailItem label="所属用户" value={currentEntry.user.username} />
            <DetailItem label="目标地区" value={formatLocation(currentEntry.targetCountry, currentEntry.targetRegion, currentEntry.targetCity)} />
            <DetailItem label="当前出口 IP" value={currentEntry.currentIp || "未绑定"} />
            <DetailItem label="当前地区" value={formatLocation(currentEntry.currentCountry, currentEntry.currentRegion, currentEntry.currentCity)} />
            <DetailItem label="已用流量" value={formatBytes(currentEntry.trafficUsedBytes)} />
            <DetailItem label="活跃连接" value={String(currentEntry.activeConnections)} />
            <DetailItem label="当前上游" value={currentEntry.lockedUpstream ? `#${currentEntry.lockedUpstream.id}` : "无"} />
            <DetailItem label="最后使用" value={formatDate(currentEntry.lastUsedAt)} />
            <DetailItem label="最后检测" value={formatDate(currentEntry.lastCheckedAt)} />
          </div>

          <div className="deferred-actions">
            <p>重绑、删除仍然属于高风险动作，先继续禁用。启用/停用现在先走确认流程，避免误操作。</p>

            <ActionRow>
              <button type="button" onClick={() => props.onOpenAdminReadOnlyPage("users", { search: currentEntry.user.username || "" })}>
                查看用户
              </button>
              <button
                type="button"
                onClick={() =>
                  props.onOpenAdminReadOnlyPage("upstreams", {
                    country: currentEntry.currentCountry ?? currentEntry.targetCountry ?? null,
                    search: currentEntry.lockedUpstream ? String(currentEntry.lockedUpstream.id) : currentEntry.currentIp || ""
                  })
                }
              >
                查看上游
              </button>
              <button
                type="button"
                onClick={() =>
                  props.onOpenAdminReadOnlyPage("logs", {
                    search: currentEntry.currentIp || String(currentEntry.currentUpstreamId ?? currentEntry.id ?? "")
                  })
                }
              >
                查看日志
              </button>
              <button
                type="button"
                disabled={!statusAction}
                onClick={() => {
                  if (!statusAction) return;
                  setPendingAction({
                    activeConnections: currentEntry.activeConnections,
                    currentIp: currentEntry.currentIp ?? null,
                    currentStatus: currentEntry.status,
                    entryId: currentEntry.id,
                    lockedUpstreamId: currentEntry.lockedUpstream?.id ?? null,
                    status: statusAction.nextStatus,
                    targetCity: currentEntry.targetCity ?? null,
                    targetCountry: currentEntry.targetCountry ?? "",
                    targetRegion: currentEntry.targetRegion ?? null,
                    username: currentEntry.username
                  });
                  setStatusError(null);
                }}
              >
                {statusAction ? statusAction.buttonLabel : "当前状态暂不支持启用或停用"}
              </button>
              <DisabledAction label="重绑" />
              <DisabledAction label="删除" />
            </ActionRow>
          </div>
        </aside>
      ) : (
        <Panel title="代理详情">
          <EmptyState text="当前列表已变化，但这次确认仍然锁定在你刚才打开的那条代理。" />
        </Panel>
      )}

      {pendingAction ? (
        <Modal
          title={pendingAction.status === "disabled" ? "确认停用代理" : "确认启用代理"}
          onClose={() => {
            setPendingAction(null);
            setStatusError(null);
          }}
        >
          <div className="modal-form">
            <div className="section-heading">
              <h2>{pendingAction.username}</h2>
              <span>{formatLocation(pendingAction.targetCountry, pendingAction.targetRegion, pendingAction.targetCity)}</span>
            </div>

            <div className="hint-list">
              {pendingAction.status === "disabled" ? (
                <>
                  <span>停用后，这条代理会停止使用当前上游。</span>
                  <span>如果当前有绑定，上游会按系统规则释放。</span>
                  {pendingAction.activeConnections > 0 ? (
                    <span>当前还有 {pendingAction.activeConnections} 个活跃连接，立即停用可能会影响正在使用这条代理的人。</span>
                  ) : null}
                  <span>本次操作会写入管理员操作日志。</span>
                </>
              ) : (
                <>
                  {pendingAction.currentStatus === "dead" ? <span>这条代理当前处于失效状态，本次启用会尝试把它恢复到可用状态。</span> : null}
                  <span>启用后，系统会按目标地区自动尝试重新匹配一个可用上游。</span>
                  <span>如果当前没有可用且已扫描的上游，启用会安全失败，不会偷偷改成别的结果。</span>
                  <span>本次操作会写入管理员操作日志。</span>
                </>
              )}
            </div>

            <div className="detail-grid">
              <DetailItem label="当前状态" value={statusLabel(pendingAction.currentStatus)} />
              <DetailItem label="当前上游" value={pendingAction.lockedUpstreamId ? `#${pendingAction.lockedUpstreamId}` : "无"} />
              <DetailItem label="当前出口 IP" value={pendingAction.currentIp || "未绑定"} />
              <DetailItem label="活跃连接" value={String(pendingAction.activeConnections)} />
            </div>

            {statusError ? <p className="empty-state">{statusError}</p> : null}

            <div className="modal-actions">
              <button
                type="button"
                disabled={props.isSaving}
                onClick={() => {
                  setPendingAction(null);
                  setStatusError(null);
                }}
              >
                取消
              </button>
              <button className="primary-button" type="button" disabled={props.isSaving} onClick={() => void confirmStatusChange()}>
                {pendingAction.status === "disabled" ? "确认停用，并释放当前绑定" : "确认启用，并尝试重新匹配"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
