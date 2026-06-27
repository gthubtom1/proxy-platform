import type { ReactNode } from "react";

const STATUS_LABELS: Record<string, string> = {
  active: "启用",
  bad: "失败",
  cooldown: "冷却",
  dead: "失效",
  disabled: "停用",
  failed: "失败",
  free: "空闲",
  healthy: "充足",
  locked: "已绑定",
  low: "偏低",
  success: "成功"
};

const ACTION_LABELS: Record<string, string> = {
  admin_proxy_entry_create: "管理员创建代理",
  proxy_entry_status_update: "修改代理状态",
  upstream_import: "导入上游",
  user_create: "创建用户",
  user_password_reset: "重置用户密码",
  user_proxy_entry_create: "用户创建代理",
  idle_upstream_release: "闲置释放上游",
  proxy_entry_rebind: "代理重绑上游",
  user_settings_update: "修改用户设置"
};

const FIELD_LABELS: Record<string, string> = {
  allowedCountries: "允许国家",
  maxProxyEntries: "代理上限",
  status: "状态",
  trafficQuotaGb: "总额度"
};

const COUNTRY_LABELS: Record<string, string> = {
  au: "澳大利亚",
  ca: "加拿大",
  fr: "法国",
  gb: "英国",
  us: "美国"
};

const DEFERRED_ACTION_REASON = "待安全流程：需要确认、日志和回滚规则后再开放";

export function Panel(props: { children: ReactNode; count?: number; loading?: boolean; title: string }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{props.title}</h2>
        {props.count !== undefined ? <span>{props.loading ? "读取中" : `${props.count} 条`}</span> : null}
      </div>
      {props.children}
    </section>
  );
}

export function Metric(props: { label: string; tone?: string; value: string }) {
  return (
    <div className={props.tone ? `metric ${props.tone}` : "metric"}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

export function DetailItem(props: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

export function Status(props: { status: string }) {
  return <span className={`status ${props.status}`}>{statusLabel(props.status)}</span>;
}

export function ActionRow(props: { children: ReactNode }) {
  return <div className="action-row">{props.children}</div>;
}

export function Modal(props: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="modal-head">
          <h2>{props.title}</h2>
          <button type="button" onClick={props.onClose} aria-label="关闭">
            关闭
          </button>
        </div>
        {props.children}
      </section>
    </div>
  );
}

export function DisabledAction(props: { label: string }) {
  return (
    <button
      type="button"
      className="deferred-action-button"
      disabled
      title={DEFERRED_ACTION_REASON}
      aria-label={`${props.label}，${DEFERRED_ACTION_REASON}`}
    >
      <span>{props.label}</span>
      <em>待安全流程</em>
    </button>
  );
}

export function DataTable(props: { children: ReactNode; maxHeight?: number; minWidth: number }) {
  return (
    <>
      <p className="table-scroll-hint">表格列较多时，可以左右滚动查看更多。</p>
      <div
        className={props.maxHeight ? "table-wrap scroll-table" : "table-wrap"}
        style={props.maxHeight ? { maxHeight: props.maxHeight } : undefined}
      >
        <table style={{ minWidth: props.minWidth }}>{props.children}</table>
      </div>
    </>
  );
}

export function FilterSummary(props: {
  items: Array<{ label: string; onClear: (() => void) | null; value: string | null }>;
}) {
  const activeItems = props.items.filter((item) => item.value);
  if (activeItems.length === 0) return null;

  return (
    <div className="active-filters" aria-live="polite">
      <span className="active-filters-title">当前筛选</span>
      {activeItems.map((item) => (
        <span key={`${item.label}:${item.value}`}>
          <strong>{item.label}</strong>
          <em>{item.value}</em>
          {item.onClear ? (
            <button
              type="button"
              className="active-filters-clear"
              onClick={item.onClear}
              aria-label={`清除${item.label}筛选`}
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function CountSummary(props: { shown: number; total: number }) {
  const text =
    props.shown === props.total ? `当前显示全部 ${props.total} 条` : `当前筛选 ${props.shown} / 共 ${props.total} 条`;
  return <p className="filter-summary">{text}</p>;
}

export function EmptyState(props: { text: string }) {
  return <p className="empty-state">{props.text}</p>;
}

export function EmptySummary(props: { emptyText: string; filteredText: string; shown: number; total: number }) {
  if (props.shown > 0) return null;
  return <EmptyState text={props.total === 0 ? props.emptyText : `${props.filteredText}，可以重置筛选。`} />;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function operationActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export function formatLocation(country: string | null, region: string | null, city: string | null): string {
  return [country?.toUpperCase(), region, city].filter(Boolean).join(" / ") || "不限";
}

export function formatBytes(value: string | number): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDate(value: string | null): string {
  if (!value) return "无";
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

function formatCountryLabel(value: string): string {
  return COUNTRY_LABELS[value.toLowerCase()] || value.toUpperCase();
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return /password|passwd|pwd|secret|token|apikey|privatekey|accesskey|credential|authorization|auth|bearer|cookie|session|jwt|csrf|signature/.test(
    normalized
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function displayValue(value: unknown): string {
  if (value == null) return "无";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) {
      return value.map((item) => formatCountryLabel(item)).join(", ");
    }
    return `${value.length} 项`;
  }
  return "已记录";
}

function formatChangeDescription(key: string, value: unknown): string {
  const label = fieldLabel(key);
  if (key === "allowedCountries" && isRecord(value)) {
    return `${label} ${displayValue(value.from)} -> ${displayValue(value.to)}`;
  }

  if (isRecord(value) && "from" in value && "to" in value) {
    return `${label} ${displayValue(value.from)} -> ${displayValue(value.to)}`;
  }

  return label;
}

function formatObjectSummary(detail: unknown): string {
  if (!isRecord(detail)) return "无详情";
  const lines = Object.entries(detail)
    .filter(([key]) => !isSensitiveKey(key))
    .slice(0, 4)
    .map(([key, value]) => `${fieldLabel(key)}=${displayValue(value)}`);

  return lines.length > 0 ? lines.join("；") : "无可显示详情";
}

export function formatOperationLogSummary(log: { action: string; detail: unknown }): string {
  const detail = isRecord(log.detail) ? log.detail : {};
  const username = typeof detail.username === "string" ? detail.username : "";

  if (log.action === "user_password_reset") {
    const passwordSource = typeof detail.passwordSource === "string" ? detail.passwordSource : "new";
    return `${username || "用户"}：密码已重置（${passwordSource === "generated" ? "系统生成" : "手动填写"}），明文未入日志`;
  }

  if (log.action === "user_create") {
    const passwordSource = typeof detail.passwordSource === "string" ? detail.passwordSource : "generated";
    return `${username || "用户"}：已创建（密码${passwordSource === "generated" ? "系统生成" : "手动填写"}，总额度 ${displayValue(detail.trafficQuotaGb)} GB，代理上限 ${displayValue(detail.maxProxyEntries)}，允许国家 ${displayValue(detail.allowedCountries)}）`;
  }

  if (log.action === "admin_proxy_entry_create") {
    const proxyEntryUsername = typeof detail.proxyEntryUsername === "string" ? detail.proxyEntryUsername : "新代理";
    const passwordSource = typeof detail.passwordSource === "string" ? detail.passwordSource : "generated";
    return `${username || "用户"}：已创建代理 ${proxyEntryUsername}（${formatLocation(
      typeof detail.targetCountry === "string" ? detail.targetCountry : null,
      typeof detail.targetRegion === "string" ? detail.targetRegion : null,
      typeof detail.targetCity === "string" ? detail.targetCity : null
    )}，密码${passwordSource === "generated" ? "系统生成" : "手动填写"}）`;
  }

  if (log.action === "upstream_import") {
    return `已导入上游（新增 ${displayValue(detail.created)}，重复 ${displayValue(detail.duplicates)}，失败 ${displayValue(detail.failed)}，有效行 ${displayValue(detail.validLines)}，无效行 ${displayValue(detail.invalidLines)}）`;
  }

  if (log.action === "proxy_entry_status_update") {
    const proxyEntryUsername = typeof detail.proxyEntryUsername === "string" ? detail.proxyEntryUsername : "代理";
    const changes = isRecord(detail.changes) ? detail.changes : {};
    const statusChange = isRecord(changes.status) ? changes.status : null;
    const fromStatus = statusChange ? displayValue(statusChange.from) : "无";
    const toStatus = statusChange ? displayValue(statusChange.to) : "无";

    return `${username || "用户"}：代理 ${proxyEntryUsername} 状态 ${statusLabel(fromStatus)} -> ${statusLabel(toStatus)}（${formatLocation(
      typeof detail.targetCountry === "string" ? detail.targetCountry : null,
      typeof detail.targetRegion === "string" ? detail.targetRegion : null,
      typeof detail.targetCity === "string" ? detail.targetCity : null
    )}）`;
  }

  if (log.action === "user_proxy_entry_create") {
    const proxyEntryUsername = typeof detail.proxyEntryUsername === "string" ? detail.proxyEntryUsername : "新代理";
    const passwordSource = typeof detail.passwordSource === "string" ? detail.passwordSource : "generated";
    return `${username || "用户"}：已自助创建代理 ${proxyEntryUsername}（${formatLocation(
      typeof detail.targetCountry === "string" ? detail.targetCountry : null,
      typeof detail.targetRegion === "string" ? detail.targetRegion : null,
      typeof detail.targetCity === "string" ? detail.targetCity : null
    )}，密码${passwordSource === "generated" ? "系统生成" : "手动填写"}）`;
  }

  if (log.action === "user_settings_update") {
    const changes = isRecord(detail.changes) ? detail.changes : {};
    const entries = Object.entries(changes)
      .filter(([key]) => !isSensitiveKey(key))
      .map(([key, value]) => formatChangeDescription(key, value));

    return `${username || "用户"}：${entries.length > 0 ? entries.join("；") : "设置已更新"}`;
  }

  return formatObjectSummary(detail);
}
