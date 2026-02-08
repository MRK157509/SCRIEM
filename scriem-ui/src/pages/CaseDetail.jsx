import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { canCopyEvidenceJson, canSeeRaw } from "../lib/rbac";

const LS_CASES = "scriem:cases:v1";

// ---------- safe localStorage helpers ----------
function readCases() {
  try {
    const raw = localStorage.getItem(LS_CASES);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeCases(next) {
  try {
    localStorage.setItem(LS_CASES, JSON.stringify(next));
  } catch {}
}

function getCaseById(id) {
  const cases = readCases();
  return cases.find((c) => String(c.id) === String(id)) || null;
}

function updateCaseNotes(id, notes) {
  const cases = readCases();
  const next = cases.map((c) =>
    String(c.id) === String(id)
      ? { ...c, notes: String(notes || ""), updated_at: new Date().toISOString() }
      : c
  );
  writeCases(next);
}

// ---------- UI helpers ----------
function sevBadge(sev) {
  const s = String(sev || "").toLowerCase();
  if (s === "critical") return "bg-red-600/20 text-red-300 border-red-500/30";
  if (s === "high") return "bg-orange-600/20 text-orange-300 border-orange-500/30";
  if (s === "medium") return "bg-yellow-600/20 text-yellow-300 border-yellow-500/30";
  if (s === "low") return "bg-green-600/20 text-green-300 border-green-500/30";
  return "bg-slate-700/40 text-slate-200 border-slate-600/60";
}

function statusBadge(st) {
  const s = String(st || "").toUpperCase();
  if (s === "OPEN") return "bg-slate-700/40 text-slate-200 border-slate-600/60";
  if (s === "TRIAGED") return "bg-yellow-500/15 text-yellow-200 border-yellow-500/30";
  if (s === "ESCALATED") return "bg-orange-500/15 text-orange-200 border-orange-500/30";
  if (s === "CLOSED") return "bg-green-500/15 text-green-200 border-green-500/30";
  return "bg-slate-800/40 text-slate-300 border-slate-700/60";
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function CaseDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [c, setC] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const allowCopyJson = canCopyEvidenceJson(); // ✅ ADMIN only
  const allowRaw = canSeeRaw(); // ✅ ADMIN only

  useEffect(() => {
    const next = getCaseById(id);
    setC(next || null);
    setNotes(next?.notes || "");
  }, [id]);

  const evidence = useMemo(() => (c?.items && Array.isArray(c.items) ? c.items : []), [c]);

  if (!c) {
    return (
      <div className="text-white/60 text-sm border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
        Case not found.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-semibold">{c.title}</div>
          <div className="text-white/50 text-sm mt-1">
            {c.id} • Created{" "}
            {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
          </div>

          {c.description ? (
            <div className="text-white/70 text-sm mt-2 whitespace-pre-wrap">
              {c.description}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs rounded-md border ${statusBadge(c.status)}`}>
            {String(c.status || "OPEN").toUpperCase()}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-md border ${sevBadge(c.severity)}`}>
            {String(c.severity || "MEDIUM").toUpperCase()}
          </span>

          <button
            onClick={() => nav("/cases")}
            className="h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            Back
          </button>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Evidence */}
        <div className="xl:col-span-2 border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-white font-semibold">Evidence ({evidence.length})</div>
              <div className="text-white/50 text-xs">pin-style actions</div>
            </div>
          </div>

          <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {evidence.length === 0 ? (
              <div className="text-white/50 text-sm">No evidence added yet.</div>
            ) : (
              evidence.map((it, idx) => {
                const isAlert = it?.title != null;
                const title = isAlert
                  ? it.title
                  : `${it?.event_type || "Event"} • ${it?.action || "action"}`;

                return (
                  <div
                    key={it?.id ?? it?.event_id ?? `${idx}`}
                    className="border border-slate-800 rounded-xl bg-black/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white text-sm font-medium truncate">{title}</div>
                        <div className="text-xs text-white/50 mt-1">
                          {it?.host ? `host: ${it.host}` : "host: —"}
                          {it?.user ? ` • user: ${it.user}` : ""}
                          {it?.severity ? ` • severity: ${it.severity}` : ""}
                          {it?.status ? ` • status: ${it.status}` : ""}
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            if (it?.host) nav(`/timeline?q=${encodeURIComponent(`host:${it.host}`)}`);
                            else nav(`/timeline?q=${encodeURIComponent(title)}`);
                          }}
                          className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        >
                          Pivot to Timeline
                        </button>

                        {/* ✅ Copy JSON: ADMIN only */}
                        {allowCopyJson ? (
                          <button
                            onClick={async () => {
                              const ok = await copyText(JSON.stringify(it, null, 2));
                              alert(ok ? "✅ Evidence JSON copied" : "Copy failed");
                            }}
                            className="px-3 py-1 text-xs rounded-lg border border-slate-600 bg-slate-700/30 text-slate-200 hover:bg-slate-600/40"
                          >
                            Copy JSON
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* ✅ Raw: ADMIN only */}
                    {allowRaw ? (
                      <div className="mt-3 border border-slate-800 rounded-lg bg-black/30 p-3">
                        <div className="text-white/60 text-xs mb-2">Raw</div>
                        <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
                          {JSON.stringify(it, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div className="text-white font-semibold">Investigation Notes</div>

            <button
              disabled={saving}
              onClick={() => {
                setSaving(true);
                try {
                  updateCaseNotes(id, notes);
                } finally {
                  setSaving(false);
                }
              }}
              className="h-9 px-4 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write findings, IOCs, hypotheses, next steps…"
            className="mt-3 w-full min-h-[320px] px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-y"
          />

          <div className="mt-3 text-[11px] text-white/40">
            Notes are stored with the case (localStorage).
          </div>
        </div>
      </div>
    </div>
  );
}
