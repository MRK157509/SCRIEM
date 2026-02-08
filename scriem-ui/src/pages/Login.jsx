import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAuth } from "../lib/auth";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("user");
  const [password, setPassword] = useState("user123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Login failed (${res.status})`);
      }

      const data = await res.json();
      setAuth({
        token: data.access_token,
        role: data.role,
        username,
      });

      nav("/", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-white/10 bg-white/5 rounded-2xl p-6">
        <div className="text-white text-2xl font-semibold">SCRIEM Login</div>
        <div className="text-white/50 text-sm mt-1">
          Sign in to access the SOC workspace.
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label className="text-xs text-white/60">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-white/10 bg-black/30 text-white/90 outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="user / analyst / admin"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-xs text-white/60">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full h-11 px-3 rounded-xl border border-white/10 bg-black/30 text-white/90 outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="password"
              autoComplete="current-password"
            />
          </div>

          {err ? (
            <div className="text-sm text-red-300 border border-red-500/30 bg-red-500/10 rounded-xl p-3">
              {err}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="w-full h-11 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-[12px] text-white/45 pt-2">
            Dev accounts:
            <div className="mt-1 font-mono text-[11px] text-white/60">
              user / user123<br />
              analyst / analyst123<br />
              admin / admin123
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
