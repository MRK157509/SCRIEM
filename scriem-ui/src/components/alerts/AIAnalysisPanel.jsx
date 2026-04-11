// scriem-ui/src/components/alerts/AIAnalysisPanel.jsx
import { useEffect, useState } from "react";
import { fetchAIAnalysis, reanalyzeAlert } from "../../lib/ai";

export default function AIAnalysisPanel({ alertId }) {
  const [loading, setLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    if (!alertId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchAIAnalysis(alertId);
      setAnalysis(data);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes("404")) setAnalysis(null);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onReanalyze() {
    if (!alertId) return;
    setReanalyzing(true);
    setError("");
    try {
      const data = await reanalyzeAlert(alertId);
      setAnalysis(data);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setReanalyzing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  return (
    <div className="mt-4 rounded-[28px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white font-semibold">AI Analysis</div>
          <div className="text-xs text-white/60">
            Engine:{" "}
            <span className="text-white/80 font-medium">
              {analysis?.engine_used || "—"}
            </span>
          </div>
        </div>

        <button
          onClick={onReanalyze}
          disabled={loading || reanalyzing || !alertId}
          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
        >
          {reanalyzing ? "Re-analyzing..." : "Re-analyze"}
        </button>
      </div>

      <div className="mt-3">
        {loading && <div className="text-white/70">Loading analysis...</div>}

        {!loading && error && (
          <div className="text-red-300 whitespace-pre-wrap">{error}</div>
        )}

        {!loading && !error && !analysis && (
          <div className="text-white/70">
            No AI analysis saved for this alert yet. Click{" "}
            <span className="text-white font-medium">Re-analyze</span>.
          </div>
        )}

        {!loading && !error && analysis && (
          <div className="grid gap-3 text-white/90">
            <div>
              <div className="text-white font-semibold">Risk</div>
              <div>
                <span className="font-semibold">{analysis.risk_level}</span>
                <span className="text-white/60">
                  {" "}
                  (confidence {Number(analysis.confidence).toFixed(2)})
                </span>
              </div>
              <div className="text-xs text-white/60">
                False positive probability:{" "}
                {Number(analysis.false_positive_probability).toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-white font-semibold">Summary</div>
              <div className="whitespace-pre-wrap text-white/85">
                {analysis.summary}
              </div>
            </div>

            <div>
              <div className="text-white font-semibold">Reasoning</div>
              <div className="whitespace-pre-wrap text-white/75">
                {analysis.reasoning}
              </div>
            </div>

            <div>
              <div className="text-white font-semibold">MITRE</div>
              <div className="flex flex-wrap gap-2">
                {(analysis.mitre_techniques || []).length === 0 ? (
                  <span className="text-white/60">—</span>
                ) : (
                  analysis.mitre_techniques.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs"
                    >
                      {t}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="text-white font-semibold">Recommended actions</div>
              {(analysis.recommended_actions || []).length === 0 ? (
                <div className="text-white/60">—</div>
              ) : (
                <ol className="list-decimal pl-5 text-white/80">
                  {analysis.recommended_actions.map((a, idx) => (
                    <li key={idx} className="mb-1">
                      {a}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="text-xs text-white/50">
              Generated at: {analysis.generated_at}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
