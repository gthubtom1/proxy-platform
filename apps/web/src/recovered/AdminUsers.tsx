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
  formatBytes,
  formatDate
} from "./shared";

type CountryOption = {
  label: string;
  value: string;
};

type UserFormState = {
  username: string;
  password: string;
  trafficQuotaGb: string;
  maxProxyEntries: string;
  allowedCountries: string[];
};

type UserSettingsFormState = {
  status: string;
  trafficQuotaGb: string;
  maxProxyEntries: string;
  allowedCountries: string[];
};

type EntryFormState = {
  userId: string;
  targetCountry: string;
  targetRegion: string;
  targetCity: string;
  count: string;
};

type AdminUser = {
  id: number;
  username: string;
  role: string;
  status: string;
  trafficQuotaBytes: string;
  trafficUsedBytes: string;
  allowedCountries?: string[];
  maxProxyEntries: number;
  maxConcurrentConnections: number;
  proxyEntryCount: number;
  createdAt: string;
};

type CreateUserResult = {
  user: AdminUser;
  initialPassword: string;
};

type CreateProxyEntryResult = {
  copies: string[];
  failed: number;
};

type ResetUserPasswordResponse = {
  ok?: boolean;
  newPassword?: string;
  error?: string;
};

type UpdateUserResponse = {
  ok?: boolean;
  error?: string;
};

type ReadOnlyIntent = {
  country: string | null;
  page: "users";
  search: string;
  token: number;
};

type Props = {
  copyText: (text: string, successMessage: string) => Promise<void>;
  createAdminEntries: (form: EntryFormState) => Promise<CreateProxyEntryResult | null>;
  createUser: (event: FormEvent<HTMLFormElement>) => Promise<CreateUserResult | null>;
  isLoading: boolean;
  isSaving: boolean;
  onOpenAdminReadOnlyPage: (page: AdminReadOnlyPage, options: { country?: string | null; search?: string }) => void;
  readOnlyIntent: ReadOnlyIntent | null;
  resetUserPassword: (userId: number, password: string) => Promise<ResetUserPasswordResponse>;
  setReadOnlyIntent: (intent: null) => void;
  setUserForm: (form: UserFormState) => void;
  updateUserSettings: (userId: number, form: UserSettingsFormState) => Promise<UpdateUserResponse>;
  userForm: UserFormState;
  users: AdminUser[];
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { value: "us", label: "US" },
  { value: "gb", label: "GB" },
  { value: "fr", label: "FR" },
  { value: "ca", label: "CA" },
  { value: "au", label: "AU" }
];

export function AdminUsers(props: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [createResult, setCreateResult] = useState<CreateUserResult | null>(null);
  const [entryResult, setEntryResult] = useState<CreateProxyEntryResult | null>(null);
  const [entryForm, setEntryForm] = useState<EntryFormState>({
    userId: "",
    targetCountry: "us",
    targetRegion: "",
    targetCity: "",
    count: "1"
  });
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<UserSettingsFormState>({
    status: "active",
    trafficQuotaGb: "0",
    maxProxyEntries: "10",
    allowedCountries: COUNTRY_OPTIONS.map((country) => country.value)
  });
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetResult, setResetResult] = useState<ResetUserPasswordResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(props.users[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return props.users.filter((user) => {
      const matchesSearch =
        !query ||
        user.username.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query) ||
        String(user.id).includes(query);
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [props.users, search, statusFilter]);

  const pagedUsers = usePagedRows(filteredUsers, 8);
  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null;
  const quotaRiskUsers = props.users.filter((user) => quotaPercent(Number(user.trafficUsedBytes), Number(user.trafficQuotaBytes)) >= 85);
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";

  useEffect(() => {
    if (!props.readOnlyIntent) return;
    if (props.readOnlyIntent.search) setSearch(props.readOnlyIntent.search);
    setStatusFilter("all");
    props.setReadOnlyIntent(null);
  }, [props.readOnlyIntent, props.setReadOnlyIntent]);

  useEffect(() => {
    if (!selectedUser) return;
    const allowedCountries =
      selectedUser.allowedCountries && selectedUser.allowedCountries.length > 0
        ? selectedUser.allowedCountries
        : COUNTRY_OPTIONS.map((country) => country.value);
    setEntryResult(null);
    setEntryForm((current) => ({
      ...current,
      userId: String(selectedUser.id),
      targetCountry: allowedCountries.includes(current.targetCountry) ? current.targetCountry : (allowedCountries[0] ?? "us")
    }));
  }, [selectedUser]);

  async function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    const result = await props.createUser(event);
    if (!result) return;
    setCreateResult(result);
    setSelectedUserId(result.user.id);
  }

  async function submitCreateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    const result = await props.createAdminEntries({ ...entryForm, userId: String(selectedUser.id) });
    if (result) setEntryResult(result);
  }

  async function submitUserSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editUser) return;
    const result = await props.updateUserSettings(editUser.id, editForm);
    if (!result.ok) return;
    setSelectedUserId(editUser.id);
    setEditUser(null);
  }

  async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetUser) return;
    const result = await props.resetUserPassword(resetUser.id, resetPassword);
    if (result.ok) {
      setResetPassword("");
      setResetResult(result);
    }
  }

  function openUserSettings(user: AdminUser) {
    setEditUser(user);
    setEditForm({
      status: user.status,
      trafficQuotaGb: bytesToGbInput(user.trafficQuotaBytes),
      maxProxyEntries: String(user.maxProxyEntries),
      allowedCountries:
        user.allowedCountries && user.allowedCountries.length > 0
          ? user.allowedCountries
          : COUNTRY_OPTIONS.map((country) => country.value)
    });
  }

  function openPasswordReset(user: AdminUser) {
    setResetUser(user);
    setResetPassword("");
    setResetResult(null);
  }

  function closeCreateUser() {
    setShowCreate(false);
    setCreateResult(null);
  }

  function closePasswordReset() {
    setResetUser(null);
    setResetPassword("");
    setResetResult(null);
  }

  return (
    <>
      <section className="metric-grid compact">
        <Metric label="总用户" value={String(props.users.length)} />
        <Metric label="启用用户" value={String(props.users.filter((user) => user.status === "active").length)} />
        <Metric label="停用用户" value={String(props.users.filter((user) => user.status === "disabled").length)} />
        <Metric label="额度风险" value={String(quotaRiskUsers.length)} tone={quotaRiskUsers.length > 0 ? "warn" : undefined} />
        <Metric label="代理总数" value={String(props.users.reduce((total, user) => total + user.proxyEntryCount, 0))} />
      </section>

      <section className="action-strip">
        <div>
          <h2>用户管理工作区</h2>
          <p>先看用户健康和额度风险，再查看单个用户详情。新建用户收进弹窗，避免管理页变成表单页。</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setShowCreate(true)}>
          新建用户
        </button>
      </section>

      <section className="master-detail">
        <Panel title="用户管理" count={filteredUsers.length} loading={props.isLoading}>
          <div className="hint-list">
            <span>搜索可以输入用户 ID、用户名或角色；状态筛选只会保留对应状态的用户。</span>
          </div>
          <div className="table-tools">
            <label>
              搜索
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ID、用户名、角色" />
            </label>
            <label>
              状态
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">全部状态</option>
                <option value="active">启用</option>
                <option value="disabled">停用</option>
              </select>
            </label>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                重置筛选
              </button>
            ) : null}
          </div>

          <FilterSummary
            items={[
              { label: "搜索", value: search.trim() || null, onClear: search.trim() ? () => setSearch("") : null },
              { label: "状态", value: statusFilter === "all" ? null : statusLabel(statusFilter), onClear: statusFilter === "all" ? null : () => setStatusFilter("all") }
            ]}
          />
          <CountSummary shown={filteredUsers.length} total={props.users.length} />

          <DataTable minWidth={760} maxHeight={500}>
            <thead>
              <tr>
                <th>用户</th>
                <th>状态</th>
                <th>已用流量</th>
                <th>剩余额度</th>
                <th>代理数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.rows.map((user) => (
                <tr className={selectedUser?.id === user.id ? "selected-row" : undefined} key={user.id}>
                  <td>
                    <strong>{user.username}</strong>
                  </td>
                  <td>
                    <Status status={user.status} />
                  </td>
                  <td>{formatBytes(user.trafficUsedBytes)}</td>
                  <td>{formatRemaining(user.trafficQuotaBytes, user.trafficUsedBytes)}</td>
                  <td>
                    {user.proxyEntryCount}/{user.maxProxyEntries}
                  </td>
                  <td>
                    <ActionRow>
                      <button type="button" onClick={() => setSelectedUserId(user.id)}>
                        查看
                      </button>
                      <button type="button" disabled={user.role !== "user"} onClick={() => openUserSettings(user)}>
                        编辑设置
                      </button>
                      <button type="button" disabled={user.role !== "user"} onClick={() => openPasswordReset(user)}>
                        重置密码
                      </button>
                    </ActionRow>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          <Pagination page={pagedUsers.page} totalPages={pagedUsers.totalPages} onPageChange={pagedUsers.setPage} />
          <EmptySummary shown={filteredUsers.length} total={props.users.length} emptyText="暂无用户。" filteredText="没有符合条件的用户" />
        </Panel>

        <UserDetail
          user={selectedUser}
          onEditUser={openUserSettings}
          onOpenAdminReadOnlyPage={props.onOpenAdminReadOnlyPage}
          onResetPassword={openPasswordReset}
        />
      </section>

      {selectedUser ? (
        <Panel title={`为 ${selectedUser.username} 创建代理`} count={entryResult?.copies.length ?? 0}>
          {entryResult?.copies.length ? (
            <>
              <ProxyCopyGuide passwordText="代理密码只显示这一回，关闭或刷新后不能再次查看。" />
              <div className="copy-toolbar">
                <button
                  type="button"
                  onClick={() => props.copyText(entryResult.copies.join("\n"), `已复制 ${entryResult.copies.length} 条代理，请立即保存。`)}
                >
                  复制全部
                </button>
              </div>
              <div className="copy-list">
                {entryResult.copies.map((copy) => {
                  const parsedCopy = parseClientProxyCopy(copy);
                  return (
                    <div className="copy-row" key={copy}>
                      <div className="copy-content">
                        <code>{copy}</code>
                        {parsedCopy ? (
                          <div className="copy-meta">
                            <span>
                              <strong>主机</strong>
                              <code>{parsedCopy.host}</code>
                            </span>
                            <span>
                              <strong>端口</strong>
                              <code>{parsedCopy.port}</code>
                            </span>
                            <span>
                              <strong>用户名</strong>
                              <code>{parsedCopy.username}</code>
                            </span>
                            <span>
                              <strong>密码</strong>
                              <code>{parsedCopy.password}</code>
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <button type="button" onClick={() => props.copyText(copy, "已复制代理，请立即保存。")}>
                        复制代理
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <form className="form-surface" onSubmit={submitCreateEntry}>
              <div className="section-heading">
                <h2>创建代理</h2>
                <span>{selectedUser.username}</span>
              </div>
              <div className="hint-list">
                <span>这里会直接为当前选中的用户创建代理，密码仍然只会显示一次。</span>
              </div>
              <AdminSelectedUserEntryForm
                allowedCountries={
                  selectedUser.allowedCountries && selectedUser.allowedCountries.length > 0
                    ? COUNTRY_OPTIONS.filter((country) => selectedUser.allowedCountries?.includes(country.value))
                    : COUNTRY_OPTIONS
                }
                form={entryForm}
                isSaving={props.isSaving}
                setForm={setEntryForm}
              />
            </form>
          )}
        </Panel>
      ) : null}

      {showCreate ? (
        <Modal title="新建用户" onClose={closeCreateUser}>
          {createResult?.initialPassword ? (
            <div className="modal-form">
              <div className="section-heading">
                <h2>初始密码只显示这一回</h2>
                <span>{createResult.user.username}</span>
              </div>
              <div className="copy-row">
                <code>{createResult.initialPassword}</code>
                <button type="button" onClick={() => void props.copyText(createResult.initialPassword, "已复制初始密码，请立即保存。")}>
                  复制初始密码
                </button>
              </div>
              <p className="empty-state">请现在保存这个初始密码。关闭窗口后，系统不会再次显示这串明文密码。</p>
              <div className="modal-actions">
                <button className="primary-button" type="button" onClick={closeCreateUser}>
                  我已保存
                </button>
              </div>
            </div>
          ) : (
            <form className="modal-form" onSubmit={submitCreateUser}>
              <div className="form-grid three">
                <label>
                  用户名
                  <span className="field-note">登录时会用这个名字，建议用容易区分的英文或数字。</span>
                  <input
                    value={props.userForm.username}
                    onChange={(event) => props.setUserForm({ ...props.userForm, username: event.target.value })}
                    placeholder="tom"
                  />
                </label>
                <label>
                  初始密码
                  <span className="field-note">可不填，留空后系统会自动生成一个新密码，并且只显示一次。</span>
                  <input
                    autoComplete="new-password"
                    minLength={8}
                    type="text"
                    value={props.userForm.password}
                    onChange={(event) => props.setUserForm({ ...props.userForm, password: event.target.value })}
                    placeholder="不填则自动生成"
                  />
                </label>
                <label>
                  总额度 GB
                  <span className="field-note">填 0 表示不限流量；填其他数字表示这个用户总共能用多少 GB。</span>
                  <input
                    min="0"
                    type="number"
                    value={props.userForm.trafficQuotaGb}
                    onChange={(event) => props.setUserForm({ ...props.userForm, trafficQuotaGb: event.target.value })}
                  />
                </label>
                <label>
                  代理上限
                  <span className="field-note">表示这个用户最多能同时拥有多少条代理。</span>
                  <input
                    min="1"
                    max="100"
                    type="number"
                    value={props.userForm.maxProxyEntries}
                    onChange={(event) => props.setUserForm({ ...props.userForm, maxProxyEntries: event.target.value })}
                  />
                </label>
              </div>
              <div className="country-picker">
                <span className="country-picker-title">允许国家</span>
                <span className="field-note">至少保留 1 个国家。这里勾选哪些国家，这个用户之后就只能生成这些国家的代理。</span>
                <div className="country-checkbox-grid">
                  {COUNTRY_OPTIONS.map((country) => {
                    const checked = props.userForm.allowedCountries.includes(country.value);
                    return (
                      <label className="country-checkbox" key={country.value}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...props.userForm.allowedCountries, country.value]
                              : props.userForm.allowedCountries.filter((value) => value !== country.value);
                            props.setUserForm({ ...props.userForm, allowedCountries: next });
                          }}
                        />
                        <span>{country.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={closeCreateUser}>
                  取消
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={props.isSaving || !props.userForm.username.trim() || props.userForm.allowedCountries.length < 1}
                >
                  新建用户
                </button>
              </div>
            </form>
          )}
        </Modal>
      ) : null}

      {editUser ? (
        <Modal title="编辑用户设置" onClose={() => setEditUser(null)}>
          <form className="modal-form" onSubmit={submitUserSettings}>
            <div className="section-heading">
              <h2>{editUser.username}</h2>
              <span>只调整普通用户的启用状态、总额度和代理上限。</span>
            </div>
            <div className="form-grid three">
              <label>
                状态
                <span className="field-note">启用后用户可以正常登录和使用；停用后用户不能继续使用。</span>
                <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                  <option value="active">启用</option>
                  <option value="disabled">停用</option>
                </select>
              </label>
              <label>
                总额度 GB
                <span className="field-note">填 0 表示不限流量；填其他数字表示这个用户还会按这个上限使用。</span>
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={editForm.trafficQuotaGb}
                  onChange={(event) => setEditForm({ ...editForm, trafficQuotaGb: event.target.value })}
                />
              </label>
              <label>
                代理上限
                <span className="field-note">表示这个用户最多能同时保留多少条代理。</span>
                <input
                  min="1"
                  max="100"
                  type="number"
                  value={editForm.maxProxyEntries}
                  onChange={(event) => setEditForm({ ...editForm, maxProxyEntries: event.target.value })}
                />
              </label>
            </div>
            <div className="country-picker">
              <span className="country-picker-title">允许国家</span>
              <span className="field-note">至少保留 1 个国家。这里勾选哪些国家，用户端就只能生成这些国家的代理。</span>
              <div className="country-checkbox-grid">
                {COUNTRY_OPTIONS.map((country) => {
                  const checked = editForm.allowedCountries.includes(country.value);
                  return (
                    <label className="country-checkbox" key={country.value}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...editForm.allowedCountries, country.value]
                            : editForm.allowedCountries.filter((value) => value !== country.value);
                          setEditForm({ ...editForm, allowedCountries: next });
                        }}
                      />
                      <span>{country.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <p className="empty-state">保存后会写入管理员操作日志；不会显示或保存任何明文密码。</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setEditUser(null)}>
                取消
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={
                  props.isSaving ||
                  !["active", "disabled"].includes(editForm.status) ||
                  Number(editForm.trafficQuotaGb) < 0 ||
                  editForm.allowedCountries.length < 1 ||
                  Number(editForm.maxProxyEntries) < 1 ||
                  Number(editForm.maxProxyEntries) > 100
                }
              >
                保存设置
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {resetUser ? (
        <Modal title="重置用户密码" onClose={closePasswordReset}>
          {resetResult?.newPassword ? (
            <div className="modal-form">
              <div className="section-heading">
                <h2>新密码只显示这一回</h2>
                <span>{resetUser.username}</span>
              </div>
              <div className="copy-row">
                <code>{resetResult.newPassword}</code>
                <button type="button" onClick={() => void props.copyText(resetResult.newPassword ?? "", "已复制新密码，请立即保存。")}>
                  复制新密码
                </button>
              </div>
              <p className="empty-state">请现在保存这个新密码。关闭窗口后，系统不会再次显示这串明文密码。</p>
              <div className="modal-actions">
                <button className="primary-button" type="button" onClick={closePasswordReset}>
                  我已保存
                </button>
              </div>
            </div>
          ) : (
            <form className="modal-form" onSubmit={submitPasswordReset}>
              <div className="section-heading">
                <h2>{resetUser.username}</h2>
                <span>手填新密码，或留空自动生成</span>
              </div>
              <label>
                新密码
                <span className="field-note">可不填；留空后系统会自动生成一个新密码。手动填写时至少 8 位。</span>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  type="text"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="不填则系统自动生成"
                />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={closePasswordReset}>
                  取消
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={props.isSaving || (resetPassword.length > 0 && resetPassword.trim().length < 8)}
                >
                  确认重置
                </button>
              </div>
            </form>
          )}
        </Modal>
      ) : null}
    </>
  );
}

function AdminSelectedUserEntryForm(props: {
  allowedCountries: CountryOption[];
  form: EntryFormState;
  isSaving: boolean;
  setForm: (form: EntryFormState) => void;
}) {
  useEffect(() => {
    if (props.allowedCountries.length === 0) return;
    if (props.allowedCountries.some((country) => country.value === props.form.targetCountry)) return;
    props.setForm({ ...props.form, targetCountry: props.allowedCountries[0].value });
  }, [props.allowedCountries, props.form, props.setForm]);

  return (
    <>
      <div className="hint-list">
        <span>创建后会立即绑定可用上游，并且只显示这一回代理密码。</span>
        <span>国家是必填项，州/地区和城市可以留空；留空就按更大范围找可用资源。</span>
      </div>
      <div className="form-grid four">
        <label>
          国家
          <select value={props.form.targetCountry} onChange={(event) => props.setForm({ ...props.form, targetCountry: event.target.value })}>
            {props.allowedCountries.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          州 / 地区
          <span className="field-note">可不填，留空表示不限州 / 地区。</span>
          <input
            value={props.form.targetRegion}
            onChange={(event) => props.setForm({ ...props.form, targetRegion: event.target.value })}
            placeholder="可不填"
          />
        </label>
        <label>
          城市
          <span className="field-note">可不填，留空表示不限城市。</span>
          <input
            value={props.form.targetCity}
            onChange={(event) => props.setForm({ ...props.form, targetCity: event.target.value })}
            placeholder="可不填"
          />
        </label>
        <label>
          数量
          <span className="field-note">通常填 1；如果想一次创建多条，可以填更大的数字。</span>
          <input
            min="1"
            max="20"
            type="number"
            value={props.form.count}
            onChange={(event) => props.setForm({ ...props.form, count: event.target.value })}
          />
        </label>
      </div>
      <button className="primary-button" type="submit" disabled={props.isSaving || !props.form.userId}>
        创建代理
      </button>
    </>
  );
}

function UserDetail(props: {
  user: AdminUser | null;
  onEditUser: (user: AdminUser) => void;
  onOpenAdminReadOnlyPage: (page: "logs" | "proxies" | "upstreams" | "users", options: { country?: string | null; search?: string }) => void;
  onResetPassword: (user: AdminUser) => void;
}) {
  if (!props.user) {
    return (
      <Panel title="用户详情">
        <EmptyState text="请选择一个用户。" />
      </Panel>
    );
  }

  const user = props.user;

  return (
    <aside className="detail-panel">
      <div className="section-heading">
        <h2>用户详情</h2>
        <Status status={user.status} />
      </div>
      <div className="detail-title">
        <strong>{user.username}</strong>
        <span>用户 ID #{user.id}</span>
      </div>
      <div className="detail-grid">
        <DetailItem label="已用流量" value={formatBytes(user.trafficUsedBytes)} />
        <DetailItem label="总额度" value={formatQuota(user.trafficQuotaBytes)} />
        <DetailItem label="剩余额度" value={formatRemaining(user.trafficQuotaBytes, user.trafficUsedBytes)} />
        <DetailItem label="代理数量" value={`${user.proxyEntryCount}/${user.maxProxyEntries}`} />
        <DetailItem label="并发上限" value={String(user.maxConcurrentConnections)} />
        <DetailItem label="允许国家" value={formatAllowedCountries(user.allowedCountries)} />
        <DetailItem label="创建时间" value={formatDate(user.createdAt)} />
      </div>
      <div className="deferred-actions">
        <p>这里可以直接进入常用管理动作。删除仍然属于危险操作，先保持禁用。</p>
        <ActionRow>
          <button type="button" onClick={() => props.onOpenAdminReadOnlyPage("proxies", { search: user.username })}>
            查看代理
          </button>
          <button type="button" onClick={() => props.onOpenAdminReadOnlyPage("logs", { search: user.username })}>
            查看日志
          </button>
          <button type="button" onClick={() => props.onEditUser(user)}>
            编辑设置
          </button>
          <button type="button" onClick={() => props.onResetPassword(user)}>
            重置密码
          </button>
          <DisabledAction label="删除" />
        </ActionRow>
      </div>
    </aside>
  );
}

function ProxyCopyGuide(props: { passwordText: string }) {
  return (
    <div className="copy-guide">
      <span>{props.passwordText}</span>
      <ol>
        <li>先复制整行代理字符串。</li>
        <li>如果软件不能整行导入，就看下面拆开的主机、端口、用户名、密码。</li>
        <li>按顺序填写：主机、端口、用户名、密码。</li>
      </ol>
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

function parseClientProxyCopy(value: string): { host: string; password: string; port: string; username: string } | null {
  const parts = value.split(":");
  if (parts.length < 4) return null;
  const [host, port, username, ...passwordParts] = parts;
  const password = passwordParts.join(":");
  if (!host || !port || !username || !password) return null;
  return { host, port, username, password };
}

function quotaPercent(used: number, quota: number): number {
  if (!quota || quota <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / quota) * 100)));
}

function formatRemaining(quotaValue: string, usedValue: string): string {
  const quota = Number(quotaValue);
  const used = Number(usedValue);
  if (!quota || quota <= 0) return "不限";
  return formatBytes(String(Math.max(0, quota - used)));
}

function formatAllowedCountries(values?: string[]): string {
  if (!values || values.length === 0) return "未设置";
  return values
    .map((value) => COUNTRY_OPTIONS.find((country) => country.value === value)?.label || value.toUpperCase())
    .join(", ");
}

function formatQuota(value: string): string {
  return Number(value) > 0 ? formatBytes(value) : "不限";
}

function bytesToGbInput(value: string): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0";
  const gb = bytes / 1024 / 1024 / 1024;
  return Number.isInteger(gb) ? String(gb) : gb.toFixed(2);
}

function statusLabel(status: string): string {
  return (
    {
      active: "启用",
      disabled: "停用"
    }[status] || status
  );
}
