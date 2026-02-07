import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadCases } from "../utils/caseStore";

export default function Cases() {
  const [cases, setCases] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setCases(loadCases());
  }, []);

  return (
    <div className="text-white space-y-6">
      <h1 className="text-2xl font-semibold">Cases</h1>

      {cases.length === 0 && (
        <div className="text-white/50">No cases created yet.</div>
      )}

      <div className="space-y-3">
        {cases.map(c => (
          <div
            key={c.id}
            onClick={() => navigate(`/cases/${c.id}`)}
            className="p-4 bg-black/40 border border-white/10 rounded-xl cursor-pointer hover:bg-black/60"
          >
            <div className="font-semibold">{c.title}</div>
            <div className="text-xs text-white/50">
              Created: {new Date(c.createdAt).toLocaleString()}
            </div>
            <div className="text-xs text-white/50">
              Pins: {c.pins?.length || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
