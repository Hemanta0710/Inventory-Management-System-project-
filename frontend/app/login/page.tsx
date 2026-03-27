"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(typeof payload?.message === "string" ? payload.message : "Login failed.");
        return;
      }

      const payload = await response.json().catch(() => ({}));
      const role = payload?.role === "employee" ? "employee" : "manager";
      router.replace(role === "employee" ? "/cart" : "/");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page login-page">
      <section className="panel login-panel">
        <p className="eyebrow">Inventory Management System</p>
        <h1>Sign In</h1>
        <p className="empty">Use your account to access dashboard and cart operations.</p>

        <form className="login-form" onSubmit={submit}>
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign In"}</button>
        </form>

        {error && <p className="field-errors">{error}</p>}
        <p className="form-hint">
          Manager: admin / admin123 (or IMS_MANAGER_USER and IMS_MANAGER_PASSWORD). Employee: employee / employee123 (or IMS_EMPLOYEE_USER and IMS_EMPLOYEE_PASSWORD).
        </p>
      </section>
    </main>
  );
}
