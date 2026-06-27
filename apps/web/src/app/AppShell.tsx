import { type FormEvent, type ReactNode } from "react";
import type { Surface } from "./types";
import { formatTime } from "./format";
import { Icon } from "./icons";
import { Button, Field, MessageBar } from "./ui";

const SURFACE_TITLE: Record<Surface, string> = {
  admin: "管理后台",
  user: "用户面板"
};

export type NavItem = { key: string; label: string };

export function LoginView(props: {
  username: string;
  password: string;
  loading: boolean;
  error: string | null;
  onChange: (next: { username: string; password: string }) => void;
  onSubmit: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onSubmit();
  }

  const brandMark = (
    <span className="login-logo-mark" aria-hidden="true">
      <Icon name="globe" size={22} />
    </span>
  );

  return (
    <div className="login-view">
      <div className="login-split">
        <aside className="login-hero">
          <div className="login-logo">
            {brandMark}
            <span className="login-logo-name">住宅代理</span>
          </div>
          <div className="login-hero-body">
            <h2 className="login-hero-title">欢迎回来</h2>
            <p className="login-hero-text">登录以继续管理你的住宅代理资源。</p>
          </div>
          <div className="login-hero-foot">© 住宅代理</div>
        </aside>

        <form className="login-form" onSubmit={submit}>
          <div className="login-logo login-form-logo">
            {brandMark}
            <span className="login-logo-name">住宅代理</span>
          </div>
          <div className="login-head">
            <h1 className="login-title">账号登录</h1>
            <p className="login-sub">请输入账号和密码。</p>
          </div>

          {props.error ? <MessageBar tone="error" text={props.error} /> : null}

          <Field label="用户名">
            <input
              autoComplete="username"
              value={props.username}
              onChange={(event) => props.onChange({ username: event.target.value, password: props.password })}
            />
          </Field>
          <Field label="密码">
            <input
              type="password"
              autoComplete="current-password"
              value={props.password}
              onChange={(event) => props.onChange({ username: props.username, password: event.target.value })}
            />
          </Field>

          <Button type="submit" variant="primary" loading={props.loading}>
            登录
          </Button>
        </form>
      </div>
    </div>
  );
}

export function Shell(props: {
  surface: Surface;
  username: string;
  navItems: NavItem[];
  current: string;
  loading: boolean;
  lastLoadedAt: Date | null;
  onNavigate: (key: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
  message: { tone: "error" | "success"; text: string } | null;
  onDismissMessage: () => void;
  children: ReactNode;
}) {
  const currentLabel = props.navItems.find((item) => item.key === props.current)?.label ?? "";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <strong>住宅代理</strong>
            <span>{SURFACE_TITLE[props.surface]}</span>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="主导航">
          {props.navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === props.current ? "nav-item active" : "nav-item"}
              aria-current={item.key === props.current ? "page" : undefined}
              onClick={() => props.onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{currentLabel}</h1>
            <span className="topbar-refresh">
              {props.loading ? "刷新中…" : props.lastLoadedAt ? `更新于 ${formatTime(props.lastLoadedAt)}` : ""}
            </span>
          </div>
          <div className="topbar-actions">
            <Button size="sm" onClick={props.onRefresh} disabled={props.loading} title="刷新数据">
              刷新
            </Button>
            <span className="topbar-user" title={props.username}>
              {props.username}
            </span>
            <Button size="sm" variant="ghost" onClick={props.onLogout}>
              退出
            </Button>
          </div>
        </header>

        <main className="content">
          {props.message ? (
            <div className="content-message">
              <MessageBar tone={props.message.tone} text={props.message.text} onDismiss={props.onDismissMessage} />
            </div>
          ) : null}
          {props.children}
        </main>
      </div>
    </div>
  );
}
