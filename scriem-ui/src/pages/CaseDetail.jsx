import { useParams } from "react-router-dom";
import { getCaseById, saveCases, loadCases } from "../utils/caseStore";
import { useEffect, useState } from "react";

export default function CaseDetail() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const found = getCaseById(id);
    if (found) {
      setCaseData(found);
      setNotes(found.notes || "");
    }
  }, [id]);

  function saveNotes() {
    const all = loadCases();
    const updated = all.map(c =>
      c.id === id ? { ...c, notes } : c
    );
    saveCases(updated);
    alert("Notes saved");
  }

  if (!caseData) return <div className="text-white">Case not found</div>;

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-2xl font-semibold">{caseData.title}</h1>

      <div className="bg-black/40 p-4 rounded-xl border border-white/10">
        <h2 className="font-semibold mb-2">Evidence Pins</h2>
        {caseData.pins?.length === 0 && (
          <div className="text-white/50">No pins in this case.</div>
        )}
        {caseData.pins?.map((p, i) => (
          <div key={i} className="text-white/70 text-sm border-b border-white/10 py-2">
            {JSON.stringify(p)}
          </div>
        ))}
      </div>

      <div className="bg-black/40 p-4 rounded-xl border border-white/10">
        <h2 className="font-semibold mb-2">Investigation Notes</h2>
        <textarea
          className="w-full bg-black/60 border border-white/10 rounded p-3 text-white"
          rows={6}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <button
          onClick={saveNotes}
          className="mt-3 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Save Notes
        </button>
      </div>
    </div>
  );
}
