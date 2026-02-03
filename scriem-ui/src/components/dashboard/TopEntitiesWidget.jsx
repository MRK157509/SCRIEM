import { useState } from "react";

export default function TopEntitiesWidget({ data }) {
  const [tab, setTab] = useState("hosts");
  const list = data?.[tab] ?? [];

  const tabs = [
    { key: "hosts", label: "Hosts" },
    { key: "users", label: "Users" },
    { key: "rules", label: "Rules" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="text-white font-semibold">Top Entities (24h)</div>

        <div className="flex gap-1 rounded-xl bg-black/20 p-1 border border-white/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "px-2.5 py-1 rounded-lg text-xs transition",
                tab === t.key ? "bg-cyan-500/15 text-cyan-200" : "text-white/60 hover:text-white",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {list.map((it) => (
          <div key={it.name} className="flex items-center justify-between text-sm">
            <div className="text-white/75 truncate">{it.name}</div>
            <div className="text-white/90 font-medium tabular-nums">{it.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
