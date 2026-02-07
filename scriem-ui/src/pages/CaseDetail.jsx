import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addCaseTimeline, getCaseById, updateCase } from "../lib/cases";

function badgeClass(v) {
  const s = String(v || "").toLowerCase();
  if (s === "critical") return "bg-red-600/20 text-red-300 border-red-500/30";
  if (s === "high") return "bg-orange-600/20 text-orange-300 border-orange-500/30";
  if (s === "medium") return "bg-yellow-600/20 text-yellow-200 border-yellow-500/30";
  if (s === "low") return "bg-green-600/20 text-green-200 border-green-500/30";
  return "bg-slate-700/40 text-slate-200 border-slate-600/60";
}

export default function CaseDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [refresh, setRefresh] = useState(0);

  const c = useMemo(() => getCaseById(id), [id, refresh]);

  const [note, setNote] = useState("");

  if (!c) {
    return (
      <div className="space-y-3">
        <div className="text-white text-xl font-semibold">Case not found</div>
        <Link className="text-cyan-200 underline" to="/cases">
          Back to cases
        </Link>
      </div>
    );
  }

  const setStatus = (status) => {
    updateCase(c.id, { status });
    addCaseTimeline(c.id, { action: "STATUS_CHANGED", note: `Status → ${status}` });
    setRefresh((x) => x + 1);
  };

  const setSeverity = (severity) => {
    updateCase(c.id, { severity });
    addCaseTimeline(c.id, { action: "SEVERITY_CHANGED", note: `Severity → ${severity}` });
    setRefresh((x) => x + 1);
  };

  const addNote = () => {
    const text = note.trim();
    if (!text) return;
    addCaseTimeline(c.id, { action: "NOTE", note: text });
    setNote("");
    setRefresh((x) => x + 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-semibold">{c.title}</div>
          <div className="text-white/40 text-sm">{c.id}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => nav("/cases")}
            className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            Back
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4 flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 text-xs rounded-md font-medium border ${badgeClass(c.severity)}`}>
            {c.severity}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-md font-medium border bg-white/5 text-white/70 border-white/10">
            {c.status}
          </span>
          <span className="text-xs text-white/40">
            Updated: {c.updated_at ? new Date(c.updated_at).toLocaleString() : "—"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={c.severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white/80"
          >
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={c.status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white/80"
          >
            <option value="OPEN">OPEN</option>
            <option value="TRIAGED">TRIAGED</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
        <div className="text-white/80 text-sm font-medium mb-2">Description</div>
        <div className="text-white/70 text-sm whitespace-pre-wrap">
          {c.description || "—"}
        </div>
      </div>

      {/* Items */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
        <div className="text-white/80 text-sm font-medium mb-2">
          Attached Evidence ({Array.isArray(c.items) ? c.items.length : 0})
        </div>

        {!c.items || c.items.length === 0 ? (
          <div className="text-white/50 text-sm">
            No items yet. Add items from Timeline pins.
          </div>
        ) : (
          <div className="space-y-2">
            {c.items.map((it, idx) => (
              <div
                key={`${idx}-${it.id ?? it.event_id ?? ""}`}
                className="border border-slate-800 rounded-xl bg-black/20 p-3"
              >
                <div className="text-white text-sm font-medium">
                  {(it.kind || (it.title ? "alert" : "event")).toUpperCase()} •{" "}
                  {it.title || `${it.event_type || "Event"} • ${it.action || "action"}`}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  host: {it.host || "—"} {it.user ? `• user: ${it.user}` : ""}{" "}
                  {it.severity ? `• severity: ${it.severity}` : ""}
                </div>

                <details className="mt-2">
                  <summary className="text-xs text-white/60 cursor-pointer">
                    Raw
                  </summary>
                  <pre className="text-xs whitespace-pre-wrap break-words text-white/80 mt-2">
                    {JSON.stringify(it, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline / notes */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4 space-y-3">
        <div className="text-white/80 text-sm font-medium">Case Timeline</div>

        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a case note…"
            className="flex-1 h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white/80 placeholder:text-white/30"
          />
          <button
            onClick={addNote}
            className="h-10 px-4 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {(c.timeline || []).slice(0, 20).map((t, i) => (
            <div
              key={i}
              className="border border-slate-800 rounded-xl bg-black/20 p-3"
            >
              <div className="text-xs text-white/50">
                {t.at ? new Date(t.at).toLocaleString() : "—"} •{" "}
                <span className="text-white/70">{t.action}</span>
              </div>
              <div className="text-sm text-white/80 mt-1 whitespace-pre-wrap">
                {t.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
