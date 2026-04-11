const dotTone = {
  green: "bg-green-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
  cyan: "bg-cyan-400",
};

export default function SystemHealthWidget({ items }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-4">
      <div className="text-white font-semibold">System Health</div>
      <div className="mt-3 space-y-3">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-white/70">
              <span className={["h-2.5 w-2.5 rounded-full", dotTone[it.tone] || "bg-white/30"].join(" ")} />
              <span>{it.label}</span>
            </div>
            <div className="text-white/90 font-medium">{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
