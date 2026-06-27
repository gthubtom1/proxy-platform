const STATUS_LABELS: Record<string, string> = {
  active: "启用",
  bad: "待核验",
  cooldown: "重试中",
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
  proxy_entry_delete: "删除代理",
  upstream_import: "导入上游",
  upstream_status_update: "修改上游状态",
  upstream_delete: "删除上游",
  upstream_rescan: "手动测试上游",
  upstream_recover: "恢复上游重试",
  manual_scan_run: "手动扫描全部",
  user_create: "创建用户",
  user_delete: "删除用户",
  user_password_reset: "重置用户密码",
  user_proxy_entry_create: "用户提取代理",
  idle_upstream_release: "闲置释放上游",
  proxy_entry_rebind: "代理重绑上游",
  user_settings_update: "修改用户设置",
  app_settings_update: "修改系统设置"
};

const FIELD_LABELS: Record<string, string> = {
  allowedCountries: "允许国家",
  maxProxyEntries: "代理上限",
  maxConcurrentConnections: "并发上限",
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

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function operationActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export function countryLabel(value: string): string {
  return COUNTRY_LABELS[value.toLowerCase()] || value.toUpperCase();
}

export function formatCountries(values: string[]): string {
  if (values.length === 0) return "全部";
  return values.map(countryLabel).join("、");
}

export function formatLocation(
  country: string | null,
  region: string | null,
  city: string | null
): string {
  return [country ? country.toUpperCase() : null, region, city].filter(Boolean).join(" / ") || "不限";
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

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) return "凌晨好";
  if (hour < 12) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return /password|passwd|pwd|secret|token|apikey|privatekey|accesskey|credential|authorization|auth|bearer|cookie|session|jwt|csrf|signature/.test(
    normalized
  );
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

function displayValue(value: unknown): string {
  if (value == null) return "无";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) {
      return value.map((item) => countryLabel(item)).join(", ");
    }
    return `${value.length} 项`;
  }
  return "已记录";
}

function formatChangeDescription(key: string, value: unknown): string {
  const label = fieldLabel(key);
  if (isRecord(value) && "from" in value && "to" in value) {
    return `${label} ${displayValue(value.from)} → ${displayValue(value.to)}`;
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
  const location = formatLocation(
    typeof detail.targetCountry === "string" ? detail.targetCountry : null,
    typeof detail.targetRegion === "string" ? detail.targetRegion : null,
    typeof detail.targetCity === "string" ? detail.targetCity : null
  );

  if (log.action === "user_password_reset") {
    const passwordSource = typeof detail.passwordSource === "string" ? detail.passwordSource : "new";
    return `${username || "用户"}：密码已重置（${passwordSource === "generated" ? "系统生成" : "手动填写"}）`;
  }

  if (log.action === "user_create") {
    return `${username || "用户"}：已创建（额度 ${displayValue(detail.trafficQuotaGb)} GB，代理上限 ${displayValue(detail.maxProxyEntries)}）`;
  }

  if (log.action === "user_delete") {
    return `${username || "用户"}：已删除`;
  }

  if (log.action === "admin_proxy_entry_create" || log.action === "user_proxy_entry_create") {
    const proxyEntryUsername = typeof detail.proxyEntryUsername === "string" ? detail.proxyEntryUsername : "新代理";
    return `${username || "用户"}：代理 ${proxyEntryUsername}（${location}）`;
  }

  if (log.action === "proxy_entry_delete") {
    const proxyEntryUsername = typeof detail.proxyEntryUsername === "string" ? detail.proxyEntryUsername : "代理";
    return `已删除代理 ${proxyEntryUsername}`;
  }

  if (log.action === "upstream_import") {
    return `导入上游（新增 ${displayValue(detail.created)}，重复 ${displayValue(detail.duplicates)}，失败 ${displayValue(detail.failed)}）`;
  }

  if (log.action === "upstream_status_update" || log.action === "upstream_delete") {
    const host = typeof detail.host === "string" ? detail.host : "上游";
    return log.action === "upstream_delete" ? `已删除上游 ${host}` : `上游 ${host} 状态已更新`;
  }

  if (log.action === "proxy_entry_status_update") {
    const proxyEntryUsername = typeof detail.proxyEntryUsername === "string" ? detail.proxyEntryUsername : "代理";
    const changes = isRecord(detail.changes) ? detail.changes : {};
    const statusChange = isRecord(changes.status) ? changes.status : null;
    const fromStatus = statusChange ? displayValue(statusChange.from) : "无";
    const toStatus = statusChange ? displayValue(statusChange.to) : "无";
    return `${username || "用户"}：代理 ${proxyEntryUsername} 状态 ${statusLabel(fromStatus)} → ${statusLabel(toStatus)}`;
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
