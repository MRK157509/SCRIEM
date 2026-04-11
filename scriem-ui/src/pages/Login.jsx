import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { setSession } from "../lib/auth";

export default function Login() {
  const nav = useNavigate();

  const from = useMemo(() => {
    return "/";
  }, []);

  const [username, setUsername] = useState("user");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
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
      const token = data?.access_token;
      const role = data?.role;

      if (!token || !role) throw new Error("Invalid login response");

      // ✅ This is Task C4: single source of truth for auth storage + Topbar update
      setSession({ token, role, username });

      nav(from, { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] grid place-items-center px-4 py-8">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-[0_24px_120px_rgba(0,0,0,0.45)]">
        <div className="relative p-8 lg:p-10 overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_28%)]" />
          <div className="relative z-10 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-100 text-[11px] uppercase tracking-[0.28em]">
              Security Workbench
            </div>

            <div className="mt-6 text-4xl md:text-5xl font-semibold leading-[1.02] text-white">
              Operate the SOC from one focused command surface.
            </div>

            <p className="mt-5 text-white/65 text-base leading-7">
              Track alerts, build cases from evidence, pivot between timelines, and keep investigations
              moving without leaving the console.
            </p>

            <div className="mt-8 grid sm:grid-cols-3 gap-3">
              {[
                { label: "Alerts", value: "Live feed" },
                { label: "Cases", value: "Pinned evidence" },
                { label: "AI", value: "Triage support" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="text-xs uppercase tracking-[0.24em] text-white/35">{item.label}</div>
                  <div className="mt-2 text-white font-medium">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-white text-2xl font-semibold">Sign in</div>
              <div className="text-white/50 text-sm mt-1">
                SCRIEM SOC Console - role-based access
              </div>
            </div>

            <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
              <Icon name="dot" size={18} />
            </div>
          </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-white/50">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-white/10 bg-white/5 text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="user1 / analyst1 / admin1"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-xs text-white/50">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full h-11 px-3 rounded-xl border border-white/10 bg-white/5 text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {err ? (
            <div className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 rounded-xl p-3">
              {err}
            </div>
          ) : null}

          <button
            disabled={loading}
            className={[
              "w-full h-11 rounded-2xl font-medium transition",
              loading
                ? "bg-cyan-500/10 text-cyan-200/50 border border-cyan-500/20 cursor-not-allowed"
                : "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/25",
            ].join(" ")}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-[11px] text-white/40 leading-relaxed">
            Tip: Test roles:
            <br />
            USER: no raw/json/ioc copy • SOC_ANALYST: no raw/json/ioc copy • ADMIN: full
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
