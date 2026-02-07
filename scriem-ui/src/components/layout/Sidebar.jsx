import { NavLink } from "react-router-dom";

const LS_LAST_Q = "scriem:timeline:lastQuery";

function timelineHref() {
  const last = (localStorage.getItem(LS_LAST_Q) || "").trim();
  return last ? `/timeline?q=${encodeURIComponent(last)}` : "/timeline?q=HIGH";
}

const baseLink =
  "block px-4 py-3 rounded-xl transition border border-transparent";
const activeLink = "bg-cyan-500/10 border-cyan-400/20 text-cyan-200";
const idleLink = "text-white/70 hover:bg-white/5 hover:text-white";

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-black/25 backdrop-blur">
      <div className="h-16 px-5 flex items-center border-b border-white/10">
        <div className="text-white font-semibold tracking-wide">SCRIEM</div>
      </div>

      <nav className="p-3 space-y-2">
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

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : idleLink}`
          }
        >
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
