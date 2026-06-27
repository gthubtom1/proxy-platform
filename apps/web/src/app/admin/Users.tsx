import { useMemo, useState, type FormEvent } from "react";
import { COUNTRY_OPTIONS, type ProxyEntry, type User } from "../types";
import { ApiError, adminApi } from "../api";
import { formatBytes, formatCountries, formatDate, statusLabel } from "../format";
import { Button, Card, CopyButton, DataTable, EmptyState, Field, MessageBar, Modal, StatusBadge, TablePager, usePaged } from "../ui";

type Props = {
  users: User[];
  proxies: ProxyEntry[];
  onChanged: () => void;
  onMessage: (message: { tone: "error" | "success"; text: string }) => void;
};

const ALL_COUNTRY_VALUES = COUNTRY_OPTIONS.map((option) => option.value);

function quotaText(quotaBytes: string, usedBytes: string): string {
  const quota = Number(quotaBytes);
  if (!Number.isFinite(quota) || quota <= 0) return `${formatBytes(usedBytes)} · 不限`;
  return `${formatBytes(usedBytes)} / ${formatBytes(quotaBytes)}`;
}

function bytesToGbInput(value: string): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0";
  const gb = bytes / 1024 / 1024 / 1024;
  return Number.isInteger(gb) ? String(gb) : gb.toFixed(2);
}

function CountryPicker(props: { value: string[]; onChange: (next: string[]) => void }) {
  function toggle(code: string, checked: boolean) {
    const next = checked ? [...props.value, code] : props.value.filter((item) => item !== code);
    props.onChange(next);
  }

  return (
    <div className="country-picker">
      {COUNTRY_OPTIONS.map((option) => {
        const checked = props.value.includes(option.value);
        return (
          <label key={option.value} className={checked ? "country-chip checked" : "country-chip"}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => toggle(option.value, event.target.checked)}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

type CreateForm = {
  username: string;
  password: string;
  trafficQuotaGb: string;
  trafficQuotaHostingGb: string;
  allowedCountries: string[];
  allowedSourceIps: string;
};

const EMPTY_CREATE_FORM: CreateForm = {
  username: "",
  password: "",
  trafficQuotaGb: "0",
  trafficQuotaHostingGb: "0",
  allowedCountries: ALL_COUNTRY_VALUES,
  allowedSourceIps: ""
};

// Split a comma/space/newline-separated list of IPs/CIDRs into trimmed entries.
function parseSourceIpInput(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function CreateUserModal(props: { onClose: () => void; onChanged: () => void; onMessage: Props["onMessage"] }) {
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ username: string; initialPassword: string } | null>(null);

  const canSubmit =
    form.username.trim().length > 0 &&
    form.allowedCountries.length > 0 &&
    Number(form.trafficQuotaGb) >= 0 &&
    Number(form.trafficQuotaHostingGb) >= 0 &&
    (form.password.trim().length === 0 || form.password.trim().length >= 8);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await adminApi.createUser({
        username: form.username.trim(),
        password: form.password.trim() || undefined,
        trafficQuotaGb: Number(form.trafficQuotaGb),
        trafficQuotaHostingGb: Number(form.trafficQuotaHostingGb),
        allowedCountries: form.allowedCountries,
        allowedSourceIps: parseSourceIpInput(form.allowedSourceIps)
      });
      setResult({ username: response.user.username, initialPassword: response.initialPassword });
      props.onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "创建用户失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Modal title="用户已创建" onClose={props.onClose} width={520}>
        <p className="muted-text">
          用户 <strong>{result.username}</strong> 已创建。初始密码只显示这一次，请立刻复制保存。
        </p>
        <div className="proxy-result" style={{ marginTop: 16 }}>
          <code className="proxy-copy-line">{result.initialPassword}</code>
          <CopyButton value={result.initialPassword} label="复制初始密码" size="md" />
        </div>
        <div className="proxy-result-foot">
          <Button variant="primary" onClick={props.onClose}>
            我已保存
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="新建用户" onClose={props.onClose} width={520}>
      <form className="form-grid" onSubmit={submit}>
        {error ? <MessageBar tone="error" text={error} onDismiss={() => setError(null)} /> : null}

        <Field label="用户名" hint="登录时使用，建议用容易区分的英文或数字。">
          <input
            value={form.username}
            autoComplete="off"
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder="例如 tom"
          />
        </Field>

        <Field label="初始密码（可选）" hint="留空则系统自动生成；手动填写时至少 8 位。">
          <input
            type="text"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="留空自动生成"
          />
        </Field>

        <div className="form-row">
          <Field label="住宅额度 GB" hint="住宅线路单独计量，填 0 表示不限。">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.trafficQuotaGb}
              onChange={(event) => setForm({ ...form, trafficQuotaGb: event.target.value })}
            />
          </Field>
          <Field label="机房额度 GB" hint="机房线路单独计量，填 0 表示不限。">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.trafficQuotaHostingGb}
              onChange={(event) => setForm({ ...form, trafficQuotaHostingGb: event.target.value })}
            />
          </Field>
        </div>

        <Field label="允许国家" hint="至少保留 1 个；用户只能生成已勾选国家的代理。">
          <CountryPicker value={form.allowedCountries} onChange={(next) => setForm({ ...form, allowedCountries: next })} />
        </Field>

        <Field label="允许来源 IP（可选）" hint="留空=不限制。填写后只有这些 IP/网段能用该账号连代理。支持单个 IP 或 CIDR，逗号或换行分隔，例如 203.0.113.5, 10.0.0.0/24。">
          <textarea
            rows={2}
            value={form.allowedSourceIps}
            onChange={(event) => setForm({ ...form, allowedSourceIps: event.target.value })}
            placeholder="留空不限制"
          />
        </Field>

        <div className="form-actions">
          <Button variant="ghost" onClick={props.onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
            新建用户
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type EditForm = {
  status: string;
  trafficQuotaGb: string;
  trafficQuotaHostingGb: string;
  allowedCountries: string[];
  allowedSourceIps: string;
};

function EditUserModal(props: { user: User; onClose: () => void; onChanged: () => void; onMessage: Props["onMessage"] }) {
  const [form, setForm] = useState<EditForm>({
    status: props.user.status,
    trafficQuotaGb: bytesToGbInput(props.user.trafficQuotaBytes),
    trafficQuotaHostingGb: bytesToGbInput(props.user.trafficQuotaHostingBytes),
    allowedCountries:
      props.user.allowedCountries.length > 0 ? props.user.allowedCountries : ALL_COUNTRY_VALUES,
    allowedSourceIps: props.user.allowedSourceIps.join("\n")
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    ["active", "disabled"].includes(form.status) &&
    form.allowedCountries.length > 0 &&
    Number(form.trafficQuotaGb) >= 0 &&
    Number(form.trafficQuotaHostingGb) >= 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.updateUser(props.user.id, {
        status: form.status,
        trafficQuotaGb: Number(form.trafficQuotaGb),
        trafficQuotaHostingGb: Number(form.trafficQuotaHostingGb),
        allowedCountries: form.allowedCountries,
        allowedSourceIps: parseSourceIpInput(form.allowedSourceIps)
      });
      props.onChanged();
      props.onMessage({ tone: "success", text: `已保存 ${props.user.username} 的设置。` });
      props.onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存设置失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`编辑设置 · ${props.user.username}`} onClose={props.onClose} width={520}>
      <form className="form-grid" onSubmit={submit}>
        {error ? <MessageBar tone="error" text={error} onDismiss={() => setError(null)} /> : null}

        <Field label="状态" hint="停用后用户无法登录或提取代理，已有代理也会被拦截。">
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="active">启用</option>
            <option value="disabled">停用</option>
          </select>
        </Field>

        <div className="form-row">
          <Field label="住宅额度 GB" hint="住宅线路单独计量，填 0 表示不限。">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.trafficQuotaGb}
              onChange={(event) => setForm({ ...form, trafficQuotaGb: event.target.value })}
            />
          </Field>
          <Field label="机房额度 GB" hint="机房线路单独计量，填 0 表示不限。">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.trafficQuotaHostingGb}
              onChange={(event) => setForm({ ...form, trafficQuotaHostingGb: event.target.value })}
            />
          </Field>
        </div>

        <Field label="允许国家" hint="至少保留 1 个。">
          <CountryPicker value={form.allowedCountries} onChange={(next) => setForm({ ...form, allowedCountries: next })} />
        </Field>

        <Field label="允许来源 IP（可选）" hint="留空=不限制。填写后只有这些 IP/网段能用该账号连代理。支持单个 IP 或 CIDR，逗号或换行分隔。">
          <textarea
            rows={2}
            value={form.allowedSourceIps}
            onChange={(event) => setForm({ ...form, allowedSourceIps: event.target.value })}
            placeholder="留空不限制"
          />
        </Field>

        <div className="form-actions">
          <Button variant="ghost" onClick={props.onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
            保存设置
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal(props: { user: User; onClose: () => void; onMessage: Props["onMessage"] }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const canSubmit = password.trim().length === 0 || password.trim().length >= 8;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await adminApi.resetPassword(props.user.id, password.trim() || undefined);
      setResult(response.newPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "重置密码失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Modal title="密码已重置" onClose={props.onClose} width={520}>
        <p className="muted-text">
          <strong>{props.user.username}</strong> 的新密码只显示这一次，请立刻复制保存。
        </p>
        <div className="proxy-result" style={{ marginTop: 16 }}>
          <code className="proxy-copy-line">{result}</code>
          <CopyButton value={result} label="复制新密码" size="md" />
        </div>
        <div className="proxy-result-foot">
          <Button variant="primary" onClick={props.onClose}>
            我已保存
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`重置密码 · ${props.user.username}`} onClose={props.onClose} width={520}>
      <form className="form-grid" onSubmit={submit}>
        {error ? <MessageBar tone="error" text={error} onDismiss={() => setError(null)} /> : null}
        <Field label="新密码（可选）" hint="留空则系统自动生成；手动填写时至少 8 位。">
          <input
            type="text"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="留空自动生成"
          />
        </Field>
        <div className="form-actions">
          <Button variant="ghost" onClick={props.onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
            确认重置
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteUserModal(props: {
  user: User;
  activeConnections: number;
  onClose: () => void;
  onChanged: () => void;
  onMessage: Props["onMessage"];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.deleteUser(props.user.id);
      props.onChanged();
      props.onMessage({ tone: "success", text: `已删除用户 ${props.user.username}。` });
      props.onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "删除用户失败，请稍后再试。");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="删除用户" onClose={props.onClose} width={460}>
      {error ? <MessageBar tone="error" text={error} onDismiss={() => setError(null)} /> : null}
      {props.activeConnections > 0 ? (
        <MessageBar
          tone="error"
          text={`该用户当前还有 ${props.activeConnections} 个活跃连接，删除会中断正在使用的请求。`}
        />
      ) : null}
      <p className="muted-text">
        确定删除用户 <strong>{props.user.username}</strong> 吗？该用户名下的 {props.user.proxyEntryCount} 个代理将一并删除、其绑定的上游会被释放回空闲池，此操作不可恢复。
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

export function AdminUsers(props: Props) {
  const { users, proxies, onChanged, onMessage } = props;

  function activeConnectionsForUser(userId: number): number {
    return proxies
      .filter((entry) => entry.userId === userId)
      .reduce((sum, entry) => sum + entry.activeConnections, 0);
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !query || user.username.toLowerCase().includes(query) || String(user.id).includes(query);
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  const paged = usePaged(filtered, 10);

  const activeCount = users.filter((user) => user.status === "active").length;
  const disabledCount = users.filter((user) => user.status === "disabled").length;

  async function toggleStatus(user: User) {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    setTogglingId(user.id);
    try {
      await adminApi.updateUser(user.id, { status: nextStatus });
      onChanged();
      onMessage({
        tone: "success",
        text: `${user.username} 已${nextStatus === "active" ? "启用" : "停用"}。`
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
        title="用户管理"
        subtitle={`共 ${users.length} 个用户 · 启用 ${activeCount} · 停用 ${disabledCount}`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            新建用户
          </Button>
        }
      >
        <div className="table-tools">
          <input
            className="table-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索用户名或 ID"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">全部状态</option>
            <option value="active">启用</option>
            <option value="disabled">停用</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            text={users.length === 0 ? "还没有用户" : "没有符合条件的用户"}
            hint={users.length === 0 ? "点右上角「新建用户」创建第一个账号。" : "换个搜索词或筛选条件试试。"}
          />
        ) : (
          <>
          <DataTable minWidth={940}>
            <thead>
              <tr>
                <th>用户</th>
                <th>状态</th>
                <th>住宅流量（已用 / 额度）</th>
                <th>机房流量（已用 / 额度）</th>
                <th className="num">代理数</th>
                <th>允许国家</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.pageItems.map((user) => {
                const isAdmin = user.role !== "user";
                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.username}</strong>
                      {isAdmin ? <span className="row-tag">管理员</span> : null}
                    </td>
                    <td>
                      <StatusBadge status={user.status} label={statusLabel(user.status)} />
                    </td>
                    <td>{quotaText(user.trafficQuotaBytes, user.trafficUsedBytes)}</td>
                    <td>{quotaText(user.trafficQuotaHostingBytes, user.trafficUsedHostingBytes)}</td>
                    <td className="num">{user.proxyEntryCount}</td>
                    <td>{formatCountries(user.allowedCountries)}</td>
                    <td className="col-time">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <Button
                          size="sm"
                          onClick={() => toggleStatus(user)}
                          loading={togglingId === user.id}
                          disabled={isAdmin}
                          title={isAdmin ? "管理员账号不可在此操作" : undefined}
                        >
                          {user.status === "active" ? "停用" : "启用"}
                        </Button>
                        <Button size="sm" onClick={() => setEditUser(user)} disabled={isAdmin}>
                          设置
                        </Button>
                        <Button size="sm" onClick={() => setResetUser(user)} disabled={isAdmin}>
                          重置密码
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteUser(user)} disabled={isAdmin}>
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
          <TablePager paged={paged} unit="个" />
          </>
        )}
      </Card>

      {showCreate ? (
        <CreateUserModal onClose={() => setShowCreate(false)} onChanged={onChanged} onMessage={onMessage} />
      ) : null}
      {editUser ? (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} onChanged={onChanged} onMessage={onMessage} />
      ) : null}
      {resetUser ? (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onMessage={onMessage} />
      ) : null}
      {deleteUser ? (
        <DeleteUserModal
          user={deleteUser}
          activeConnections={activeConnectionsForUser(deleteUser.id)}
          onClose={() => setDeleteUser(null)}
          onChanged={onChanged}
          onMessage={onMessage}
        />
      ) : null}
    </div>
  );
}
