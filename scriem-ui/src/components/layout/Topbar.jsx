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
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-black/25 backdrop-blur">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-white/70 text-sm">SOC Overview</div>

        {/* Role + user */}
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 text-[11px] rounded-md border ${badgeCls}`}
            title="Role"
          >
            {snap.role}
          </span>
          <span className="text-white/50 text-xs truncate" title="Username">
            {snap.user}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Refresh */}
        <button
          className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white/70 flex items-center gap-2 hover:bg-white/10 hover:text-white transition"
          title="Refresh interval (UI placeholder)"
        >
          <Icon name="refresh" size={16} />
          30s
        </button>

        {/* Notifications */}
        <button
          className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10 transition"
          title="Notifications (UI placeholder)"
        >
          <Icon name="bell" size={18} />
        </button>

        {/* Logout */}
        {snap.loggedIn ? (
          <button
            onClick={() => {
              clearSession();
              // Hard reset so any cached state clears cleanly
              window.location.href = "/";
            }}
            className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white/70 flex items-center gap-2 hover:bg-white/10 hover:text-white transition"
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
