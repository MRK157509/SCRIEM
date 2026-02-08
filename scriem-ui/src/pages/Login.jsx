import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { setSession } from "../lib/auth";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();

  const from = useMemo(() => {
    // if you later store "from" in router state, you can read it here
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
      // expected: { access_token, role, token_type }
      const token = data?.access_token;
      const role = data?.role;

      if (!token || !role) throw new Error("Invalid login response");

      setSession({ token, role, username });

      // go to dashboard
      nav(from, { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="w-full max-w-md border border-slate-800 rounded-2xl bg-slate-950/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-white text-xl font-semibold">Sign in</div>
            <div className="text-white/50 text-sm mt-1">
              SCRIEM SOC Console — role-based access
            </div>
          </div>

          <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 grid place-items-center">
            <Icon name="user" size={18} />
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label className="text-xs text-white/50">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-white/10 bg-white/5 text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              placeholder="user / analyst / admin"
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
              "w-full h-11 rounded-xl font-medium transition",
              loading
                ? "bg-cyan-500/10 text-cyan-200/50 border border-cyan-500/20 cursor-not-allowed"
                : "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/25",
            ].join(" ")}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-[11px] text-white/40 leading-relaxed">
            Tip: Use different roles to see RBAC in action. USER has masked IOCs, SOC_ANALYST
            sees full IOCs, ADMIN sees raw JSON.
          </div>
        </form>
      </div>
    </div>
  );
}
