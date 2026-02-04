import { useState } from "react";
import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";

export default function Alerts() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const rows = [
    {
      id: "A-1001",
      title: "Suspicious PowerShell Execution",
      severity: "High",
      status: "Open",
      host: "WIN-ACCT-02",
      user: "alice",
      ip: "10.10.12.8",
      time: "2m ago",
    },
    {
      id: "A-1002",
      title: "Multiple Failed Logins",
      severity: "Medium",
      status: "Triage",
      host: "AD-DC-01",
      user: "bob",
      ip: "172.16.2.4",
      time: "12m ago",
    },
    {
      id: "A-1003",
      title: "Credential Dumping Pattern",
      severity: "Critical",
      status: "Open",
      host: "FIN-SRV-01",
      user: "svc-fin",
      ip: "10.0.0.5",
      time: "25m ago",
    },
  ];

  const openDrawer = (alert) => {
    setSelectedAlert(alert);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-2xl font-semibold">Alerts</div>
          <div className="text-white/50 text-sm">Triage Workspace</div>
        </div>

        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition">
            Save View
          </button>
          <button className="h-10 px-4 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition">
            Export
          </button>
        </div>
      </div>

      <div className="p-3 rounded-2xl border border-white/10 bg-white/5 flex flex-wrap gap-2 items-center">
        <select className="h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-white/70 text-sm">
          <option>Status: Any</option>
          <option>Open</option>
          <option>Triage</option>
          <option>Closed</option>
        </select>

        <select className="h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-white/70 text-sm">
          <option>Severity: Any</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <input
          className="h-9 w-64 px-3 rounded-xl bg-black/40 border border-white/10 text-white/70 text-sm"
          placeholder="Search host / user / IP / title…"
        />

        <div className="ml-auto flex gap-2">
          <button className="h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition text-sm">
            Clear Filters
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-white/80 text-sm">
          Latest Alerts
        </div>

        <table className="w-full text-sm">
          <thead className="bg-black/30 text-white/50">
            <tr>
              <th className="text-left px-4 py-2 w-10">
                <input type="checkbox" />
              </th>
              <th className="text-left px-4 py-2">Severity</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Title</th>
              <th className="text-left px-4 py-2">Host</th>
              <th className="text-left px-4 py-2">Time</th>
            </tr>
          </thead>

          <tbody className="text-white/80">
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => openDrawer(r)}
                className="border-t border-white/5 hover:bg-white/5 cursor-pointer transition"
              >
                <td className="px-4 py-3">
                  <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-lg border border-white/10 bg-black/30 text-xs">
                    {r.severity}
                  </span>
                </td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3">{r.title}</td>
                <td className="px-4 py-3">{r.host}</td>
                <td className="px-4 py-3 text-white/60">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RightDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedAlert ? selectedAlert.title : "Alert Details"}
        severity={selectedAlert?.severity}
      >
        <AlertDrawerContent alert={selectedAlert} />
      </RightDrawer>
    </div>
  );
}
