import { NavLink } from "react-router-dom";
import { getRole, getUsername } from "../../lib/auth";

const LS_LAST_Q = "scriem:timeline:lastQuery";

function timelineHref() {
  const last = (localStorage.getItem(LS_LAST_Q) || "").trim();
  return last ? `/timeline?q=${encodeURIComponent(last)}` : "/timeline?q=HIGH";
}

const baseLink =
  "block px-4 py-3 rounded-2xl transition border border-transparent";
const activeLink =
  "bg-cyan-500/12 border-cyan-400/25 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]";
const idleLink = "text-white/68 hover:bg-white/5 hover:text-white";

export default function Sidebar() {
  const role = getRole();
  const user = getUsername();

  return (
    <aside className="hidden lg:flex w-[290px] shrink-0 border-r border-white/10 bg-slate-950/70 backdrop-blur-xl flex-col">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/70">
            SCRIEM
          </div>
          <div className="text-white font-semibold tracking-wide">
            Security Workbench
          </div>
        </div>
        <div className="h-10 w-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 grid place-items-center text-cyan-200 text-xs font-semibold">
          {role.slice(0, 1)}
        </div>
      </div>

      <div className="px-5 pt-5 pb-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
            Session
          </div>
          <div className="mt-2 text-white font-medium truncate">
            {user || "Analyst"}
          </div>
          <div className="mt-1 text-sm text-white/55">{role}</div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-white/55">
            <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/20">
              Live
            </span>
            <span className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-200 border border-cyan-500/20">
              SOC
            </span>
          </div>
        </div>
      </div>

      <nav className="px-3 pb-4 space-y-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : idleLink}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/alerts"
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : idleLink}`
          }
        >
          Alerts
        </NavLink>

        {/* ✅ Timeline remembers last query */}
        <NavLink
          to={timelineHref()}
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : idleLink}`
          }
        >
          Timeline
        </NavLink>

        <NavLink
          to="/cases"
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : idleLink}`
          }
        >
          Cases
        </NavLink>
      </nav>

      <div className="mt-auto p-5">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
            Focus
          </div>
          <div className="mt-2 text-sm text-white/80 leading-relaxed">
            Search, pin, and promote suspicious activity into cases without leaving the console.
          </div>
        </div>
      </div>
    </aside>
  );
}
