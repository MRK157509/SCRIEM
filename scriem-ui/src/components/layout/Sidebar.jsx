export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-black/25 backdrop-blur">
      <div className="h-16 px-5 flex items-center border-b border-white/10">
        <div className="text-white font-semibold tracking-wide">SCRIEM</div>
      </div>

      <nav className="p-3 space-y-1 text-sm">
        {["Dashboard", "Alerts", "Timeline", "Cases", "Settings"].map((item, i) => (
          <button
            key={item}
            className={`w-full text-left px-3 py-2 rounded-xl transition ${
              i === 0
                ? "bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/25"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}
