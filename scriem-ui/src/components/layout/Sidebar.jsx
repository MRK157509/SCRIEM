import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Alerts", to: "/alerts" },
  { label: "Timeline", to: "/timeline" },
  { label: "Cases", to: "/cases" },
  { label: "Settings", to: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-black/25 backdrop-blur">
      <div className="h-16 px-5 flex items-center border-b border-white/10">
        <div className="text-white font-semibold tracking-wide">SCRIEM</div>
      </div>

      <nav className="p-3 space-y-1 text-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block w-full text-left px-3 py-2 rounded-xl transition ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/25"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`
            }
            end={item.to === "/"}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
