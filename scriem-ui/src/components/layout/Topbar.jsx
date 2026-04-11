import { useEffect, useMemo, useState } from "react";
import Icon from "../ui/Icon";
import { clearSession, getRole, getUsername, isLoggedIn } from "../../lib/auth";

function roleBadgeClass(role) {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "bg-purple-500/15 text-purple-200 border-purple-500/30";
  if (r === "SOC_ANALYST") return "bg-cyan-500/15 text-cyan-200 border-cyan-500/30";
  return "bg-slate-700/40 text-slate-200 border-slate-600/60";
}

export default function Topbar() {
  const [snap, setSnap] = useState(() => ({
    loggedIn: isLoggedIn(),
    role: getRole(),
    user: getUsername(),
  }));

  // live updates when login/logout happens
  useEffect(() => {
    const onAuth = () =>
      setSnap({
        loggedIn: isLoggedIn(),
        role: getRole(),
        user: getUsername(),
      });

    window.addEventListener("scriem:auth:changed", onAuth);
    return () => window.removeEventListener("scriem:auth:changed", onAuth);
  }, []);

  const badgeCls = useMemo(() => roleBadgeClass(snap.role), [snap.role]);

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/10 bg-slate-950/55 backdrop-blur-xl">
      <div className="flex items-center gap-4 min-w-0">
        <div className="hidden md:flex flex-col">
          <div className="text-[10px] uppercase tracking-[0.35em] text-white/35">
            Mission Control
          </div>
          <div className="text-white/72 text-sm">
            Alerts, timelines, cases, and AI analysis in one workspace
          </div>
        </div>

        <div className="md:hidden text-white/80 text-sm">SOC Overview</div>

        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 text-[11px] rounded-full border ${badgeCls}`} title="Role">
            {snap.role}
          </span>
          <span className="text-white/50 text-xs truncate" title="Username">
            {snap.user || "anonymous"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-white/5 text-xs text-white/60">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
          Live
        </div>

        <button
          className="h-10 px-3 rounded-2xl border border-white/10 bg-white/5 text-white/70 flex items-center gap-2 hover:bg-white/10 hover:text-white transition"
          title="Refresh interval"
        >
          <Icon name="refresh" size={16} />
          <span className="hidden sm:inline">30s</span>
        </button>

        <button
          className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10 transition"
          title="Notifications"
        >
          <Icon name="bell" size={18} />
        </button>

        {snap.loggedIn ? (
          <button
            onClick={() => {
              clearSession();
              window.location.href = "/";
            }}
            className="h-10 px-3 rounded-2xl border border-white/10 bg-white/5 text-white/70 flex items-center gap-2 hover:bg-white/10 hover:text-white transition"
            title="Logout"
          >
            <Icon name="logout" size={16} />
            <span className="hidden md:inline">Logout</span>
          </button>
        ) : (
          <span className="text-white/40 text-xs">Not logged in</span>
        )}
      </div>
    </header>
  );
}
