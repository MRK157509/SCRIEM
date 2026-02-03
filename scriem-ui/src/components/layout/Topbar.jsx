import Icon from "../ui/Icon";

export default function Topbar() {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-black/25 backdrop-blur">
      <div className="text-white/70 text-sm">SOC Overview</div>

      <div className="flex items-center gap-3">
        <button className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white/70 flex items-center gap-2">
          <Icon name="refresh" size={16} />
          30s
        </button>
        <button className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 grid place-items-center">
          <Icon name="bell" size={18} />
        </button>
      </div>
    </header>
  );
}
