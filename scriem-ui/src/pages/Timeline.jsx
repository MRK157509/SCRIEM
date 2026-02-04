import { useState } from "react";
import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";

export default function Timeline() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const storyCards = [
    {
      id: "T-2001",
      title: "Login spike detected",
      severity: "Medium",
      status: "Investigate",
      host: "WIN-ACCT-02",
      user: "alice",
      ip: "10.10.12.8",
      details: "Rapid authentication attempts across multiple endpoints.",
    },
    {
      id: "T-2002",
      title: "Suspicious process chain",
      severity: "High",
      status: "Investigate",
      host: "FIN-SRV-01",
      user: "svc-fin",
      ip: "10.0.0.5",
      details: "Unusual parent-child process chain with encoded commands.",
    },
  ];

  const openDrawer = (item) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-white text-2xl font-semibold">Timeline</div>
        <div className="text-white/50 text-sm">Investigation View</div>
      </div>

      <div className="p-3 rounded-2xl border border-white/10 bg-white/5 flex flex-wrap gap-2 items-center">
        <input
          className="h-9 w-72 px-3 rounded-xl bg-black/40 border border-white/10 text-white/70 text-sm"
          placeholder="Search host…"
        />

        <select className="h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-white/70 text-sm">
          <option>Time Range: 24h</option>
          <option>1h</option>
          <option>24h</option>
          <option>7d</option>
        </select>

        <div className="ml-auto flex gap-2">
          <button className="h-9 px-3 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition text-sm">
            Story Mode
          </button>
          <button className="h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition text-sm">
            Raw Events
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {storyCards.map((c) => (
          <button
            key={c.id}
            onClick={() => openDrawer(c)}
            className="text-left p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            <div className="flex items-center justify-between">
              <div className="text-white font-semibold">{c.title}</div>
              <span className="px-2 py-1 rounded-lg border border-white/10 bg-black/30 text-xs text-white/70">
                {c.severity}
              </span>
            </div>
            <div className="mt-2 text-white/60 text-sm">{c.details}</div>
            <div className="mt-3 text-xs text-white/40">
              Host: {c.host} • User: {c.user || "N/A"} • IP: {c.ip || "N/A"}
            </div>
          </button>
        ))}
      </div>

      <RightDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? selectedItem.title : "Timeline Details"}
        severity={selectedItem?.severity}
      >
        <AlertDrawerContent alert={selectedItem} />
      </RightDrawer>
    </div>
  );
}
