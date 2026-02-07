import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCaseById, updateCaseNotes } from "../lib/cases";

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const c = getCaseById(id);
    setCaseData(c);
    setNotes(c?.notes || "");
  }, [id]);

  function saveNotes() {
    const updated = updateCaseNotes(id, notes);
    if (updated) {
      setCaseData(updated);
      alert("Notes saved");
    }
  }

  if (!caseData) return <div className="text-white">Case not found</div>;

  return (
    <div className="space-y-6 text-white">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">{caseData.title}</h1>
          <div className="text-white/50 text-sm mt-1">
            {caseData.status} • {caseData.severity} • Created {new Date(caseData.createdAt).toLocaleString()}
          </div>
        </div>

        <button
          onClick={() => navigate("/cases")}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70"
        >
          Back to Cases
        </button>
      </div>

      {/* Evidence Panel */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
        <h2 className="font-semibold mb-3">Evidence Items ({caseData.items.length})</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {caseData.items.map((it, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-black/30 border border-slate-800 text-sm">
              {it.kind === "alert" ? "🔔 Alert" : "🧾 Event"} — {it.title || it.event_type}
            </div>
          ))}
        </div>
      </div>

      {/* Notes Panel */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
        <h2 className="font-semibold mb-2">Investigation Notes</h2>
        <textarea
          className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-3 text-white"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          onClick={saveNotes}
          className="mt-3 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/30"
        >
          Save Notes
        </button>
      </div>
    </div>
  );
}
