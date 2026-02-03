const severityPill = {
  critical: "bg-red-500/15 text-red-200 ring-red-500/30",
  high: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  medium: "bg-yellow-500/15 text-yellow-200 ring-yellow-500/30",
  low: "bg-sky-500/15 text-sky-200 ring-sky-500/30",
};

const statusChip = {
  open: "bg-white/5 text-white/70 ring-white/10",
  triage: "bg-cyan-500/10 text-cyan-200 ring-cyan-500/25",
  closed: "bg-green-500/10 text-green-200 ring-green-500/25",
};

export default function LatestAlertsTable({ rows }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="text-white font-semibold">SOC Activity</div>
        <div className="text-xs text-white/50">Latest Alerts</div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-white/60 bg-black/20">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Severity</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Alert Title</th>
              <th className="px-4 py-2 text-left font-medium">Host</th>
              <th className="px-4 py-2 text-left font-medium">Time</th>
              <th className="px-4 py-2 text-left font-medium">Assignee</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5 hover:bg-white/5 transition cursor-pointer">
                <td className="px-4 py-2">
                  <span className={["inline-flex px-2 py-1 rounded-lg text-xs ring-1", severityPill[r.severity]].join(" ")}>
                    {r.severity}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={["inline-flex px-2 py-1 rounded-lg text-xs ring-1", statusChip[r.status]].join(" ")}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-white/85">{r.title}</td>
                <td className="px-4 py-2 text-white/70">{r.host}</td>
                <td className="px-4 py-2 text-white/70 tabular-nums">{r.time}</td>
                <td className="px-4 py-2 text-white/70">{r.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
