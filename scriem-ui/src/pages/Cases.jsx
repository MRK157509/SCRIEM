import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createCase, listCases } from "../lib/cases";

function badgeClass(v) {
  const s = String(v || "").toLowerCase();
  if (s === "critical") return "bg-red-600/20 text-red-300 border-red-500/30";
  if (s === "high") return "bg-orange-600/20 text-orange-300 border-orange-500/30";
  if (s === "medium") return "bg-yellow-600/20 text-yellow-200 border-yellow-500/30";
  if (s === "low") return "bg-green-600/20 text-green-200 border-green-500/30";
  return "bg-slate-700/40 text-slate-200 border-slate-600/60";
}

export default function Cases() {
  const nav = useNavigate();
  const [refresh, setRefresh] = useState(0);

  const cases = useMemo(() => listCases(), [refresh]);

  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");

  const onCreate = (e) => {
    e.preventDefault();
    const c = createCase({ title, description, severity });
    setTitle("");
    setDescription("");
    setSeverity("MEDIUM");
    setRefresh((x) => x + 1);
    nav(`/cases/${c.id}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-semibold">Cases</div>
          <div className="text-white/50 text-sm">Track investigations & evidence</div>
        </div>
      </div>

      {/* Create Case */}
      <form
        onSubmit={onCreate}
        className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4 space-y-3"
      >
        <div className="text-white/80 text-sm font-medium">Create a Case</div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Case title (e.g., Malware execution on win-laptop-01)"
            className="h-11 px-3 rounded-xl border border-white/10 bg-white/5 text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-11 px-3 rounded-xl border border-white/10 bg-white/5 text-white/80 focus:outline-none"
          >
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <button className="h-11 px-4 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition">
            Create
          </button>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description / initial hypothesis…"
          className="min-h-[84px] w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        />
      </form>

      {/* Cases Table */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-900/60 border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
          <div className="col-span-4">Title</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Items</div>
          <div className="col-span-2">Updated</div>
        </div>

        {cases.length === 0 ? (
          <div className="px-4 py-8 text-white/60">No cases yet.</div>
        ) : (
          cases.map((c) => (
            <Link
              to={`/cases/${c.id}`}
              key={c.id}
              className="grid grid-cols-12 px-4 py-3 border-b border-slate-900 hover:bg-slate-900/40 transition"
            >
              <div className="col-span-4 min-w-0">
                <div className="text-white truncate">{c.title}</div>
                <div className="text-xs text-white/40">{c.id}</div>
              </div>

              <div className="col-span-2">
                <span className={`px-2 py-0.5 text-xs rounded-md font-medium border ${badgeClass(c.severity)}`}>
                  {c.severity}
                </span>
              </div>

              <div className="col-span-2 text-white/70">{c.status}</div>
              <div className="col-span-2 text-white/70 tabular-nums">
                {Array.isArray(c.items) ? c.items.length : 0}
              </div>
              <div className="col-span-2 text-white/50 text-xs">
                {c.updated_at ? new Date(c.updated_at).toLocaleString() : "—"}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
