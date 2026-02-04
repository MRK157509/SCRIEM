export default function LatestAlertsTable({ rows = [], onRowClick }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="text-white font-semibold">SOC Activity</div>
        <div className="text-xs text-white/50">Latest Alerts</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr className="border-b border-white/10">
              <th className="text-left font-medium px-4 py-3">Severity</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">Alert Title</th>
              <th className="text-left font-medium px-4 py-3">Host</th>
              <th className="text-left font-medium px-4 py-3">Time</th>
              <th className="text-left font-medium px-4 py-3">Assignee</th>
            </tr>
          </thead>

          <tbody className="text-white/90">
            {rows.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                onClick={() => onRowClick?.(row)}
                className="border-t border-white/10 cursor-pointer hover:bg-white/5 transition"
              >
                <td className="px-4 py-3">{row.severity}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{row.title}</td>
                <td className="px-4 py-3">{row.host}</td>
                <td className="px-4 py-3 tabular-nums text-white/70">{row.time}</td>
                <td className="px-4 py-3 text-white/70">{row.assignee}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-white/50" colSpan={6}>
                  No alerts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
