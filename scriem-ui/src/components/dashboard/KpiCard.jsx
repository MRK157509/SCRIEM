const toneRing = {
  blue: "ring-cyan-500/30",
  red: "ring-red-500/30",
  amber: "ring-amber-500/30",
  cyan: "ring-sky-500/30",
};

const toneGlow = {
  blue: "shadow-[0_0_0_1px_rgba(34,211,238,0.15)]",
  red: "shadow-[0_0_0_1px_rgba(239,68,68,0.15)]",
  amber: "shadow-[0_0_0_1px_rgba(245,158,11,0.15)]",
  cyan: "shadow-[0_0_0_1px_rgba(56,189,248,0.15)]",
};

export default function KpiCard({ label, value, delta, tone = "blue" }) {
  return (
    <button
      className={[
        "text-left rounded-3xl p-4 border border-white/10 bg-slate-950/60 ring-1 transition shadow-[0_16px_60px_rgba(0,0,0,0.18)]",
        "hover:bg-white/7 hover:border-white/15 hover:-translate-y-0.5",
        toneRing[tone] || toneRing.blue,
        toneGlow[tone] || toneGlow.blue,
      ].join(" ")}
    >
      <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-2xl font-semibold tracking-tight text-white">{value}</div>
        <div className="text-xs text-white/60 max-w-[45%] text-right">{delta}</div>
      </div>
    </button>
  );
}
