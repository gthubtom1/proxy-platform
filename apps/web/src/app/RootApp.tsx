import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthUser } from "./types";
import { clearToken, getToken, loginAny, sessionApi } from "./api";
import { LoginView } from "./AppShell";
import { Loading } from "./ui";
import { AdminApp } from "./admin/AdminApp";
import { UserApp } from "./user/UserApp";

// Single entry point: one neutral login page authenticates either role, then the
// shell for the account's role is rendered. Admin -> admin console, user -> user panel.
export function RootApp() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bootedRef = useRef(false);

  const logout = useCallback(() => {
    clearToken();
    setAuthUser(null);
    setForm({ username: "", password: "" });
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const token = getToken();
    if (!token) {
      setBooting(false);
      return;
    }

    sessionApi
      .me()
      .then((result) => setAuthUser(result.user))
      .catch(() => clearToken())
      .finally(() => setBooting(false));
  }, []);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const user = await loginAny(form.username.trim(), form.password);
      setForm({ username: "", password: "" });
      setAuthUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败。");
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return (
      <div className="boot-screen">
        <Loading text="正在进入…" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <LoginView
        username={form.username}
        password={form.password}
        loading={loading}
        error={error}
        onChange={setForm}
        onSubmit={handleLogin}
      />
    );
  }

  return authUser.role === "admin" ? (
    <AdminApp bootUser={authUser} onLogout={logout} />
  ) : (
    <UserApp bootUser={authUser} onLogout={logout} />
  );
}
