import { type ReactNode } from "react";

type TopBarProps = {
  isLoading: boolean;
  lastLoadedAt: Date | null;
  onRefresh: () => void;
  onLogout?: () => void;
  surface: "admin" | "user";
  username?: string;
};

type SideNavProps = {
  children: ReactNode;
  label: string;
};

type NavButtonProps = {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
};

type MessageStackProps = {
  error: string | null;
  notice: string | null;
};

type LoginShellProps = {
  form: {
    password: string;
    username: string;
  };
  isSaving: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  setForm: (next: { password: string; username: string }) => void;
  surface: "admin" | "user";
};

export function TopBar(props: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">UX-113</p>
        <h1>{props.surface === "admin" ? "管理员后台" : "用户面板"}</h1>
        <p className="subtitle">
          {props.surface === "admin"
            ? "查看总览、用户、上游资源、地区库存、代理运行、日志和设置。"
            : "查看额度总览、生成代理、我的代理和流量记录。"}
        </p>
      </div>
      <div className="topbar-actions">
        {props.username ? (
          <span className="refresh-status">
            {props.isLoading ? "刷新中..." : props.lastLoadedAt ? `最后刷新：${formatTime(props.lastLoadedAt)}` : "等待刷新"}
          </span>
        ) : null}
        <button className="refresh-button" type="button" onClick={props.onRefresh} disabled={props.isLoading} title="刷新" aria-label="刷新">
          ↻
        </button>
        {props.onLogout ? (
          <button type="button" onClick={props.onLogout}>
            退出
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function SideNav(props: SideNavProps) {
  return (
    <nav className="side-nav" aria-label={props.label}>
      {props.children}
    </nav>
  );
}

export function NavButton(props: NavButtonProps) {
  return (
    <button className={props.active ? "nav-button active" : "nav-button"} type="button" onClick={props.onClick}>
      {props.children}
    </button>
  );
}

export function MessageStack(props: MessageStackProps) {
  if (!props.error && !props.notice) return null;
  return (
    <section className="message-stack" aria-live="polite">
      {props.error ? <p className="message error">{props.error}</p> : null}
      {props.notice ? <p className="message success">{props.notice}</p> : null}
    </section>
  );
}

export function LoginShell(props: LoginShellProps) {
  return (
    <section className="login-shell">
      <form className="login-panel" onSubmit={props.onSubmit}>
        <div className="section-heading">
          <h2>{props.surface === "admin" ? "管理员登录" : "用户登录"}</h2>
          <span>{props.surface === "admin" ? "访问后台管理功能" : "访问自己的代理和流量"}</span>
        </div>

        <div className="hint-list">
          <span>
            {props.surface === "admin"
              ? "请使用管理员账号登录后台，普通用户账号不能进入管理员页面。"
              : "请使用管理员发给你的普通用户账号登录，只能查看你自己的代理和流量。"}
          </span>
          <span>
            {props.surface === "admin"
              ? "如果管理员密码忘记了，请先回到项目保存的安全记录处理，不要在这里猜密码。"
              : "如果忘记密码，请联系管理员重置，系统不会显示旧密码。"}
          </span>
        </div>

        <label>
          用户名
          <span className="field-note">输入登录账号的用户名，不是备注名。</span>
          <input autoComplete="username" value={props.form.username} onChange={(event) => props.setForm({ ...props.form, username: event.target.value })} />
        </label>

        <label>
          密码
          <span className="field-note">输入当前密码，密码输错时请重新检查大小写和空格。</span>
          <input
            autoComplete="current-password"
            type="password"
            value={props.form.password}
            onChange={(event) => props.setForm({ ...props.form, password: event.target.value })}
          />
        </label>

        <button className="primary-button" disabled={props.isSaving} type="submit">
          登录
        </button>
      </form>
    </section>
  );
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(value);
}
