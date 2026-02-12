import { useEffect, useState } from "react";
import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";
import { fetchAlerts } from "../lib/api";
import AIAnalysisPanel from "../components/alerts/AIAnalysisPanel";

/* ---------------- Stable Key (NO timestamps) ---------------- */
function makeStableKey(alert) {
  return String(
    alert?.id ||
      alert?._id ||
      alert?.alert_id ||
      alert?.event_id ||
      alert?.key ||
      `${alert?.title || "untitled"}|${alert?.host || "nohost"}|${alert?.user || "nouser"}|${alert?.ip || "noip"}`
  );
}

export default function Alerts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  /* ---------------- Fetch Alerts from Backend ---------------- */
  useEffect(() => {
    fetchAlerts()
      .then((data) => {
        // Supports either { alerts: [...] } or raw array
        setRows(data.alerts || data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load alerts");
        setLoading(false);
      });
  }, []);

  /* ---------------- Drawer Open ---------------- */
  const openDrawer = (alert) => {
    const stableKey = makeStableKey(alert);
    setSelectedAlert({ ...alert, __scriemKey: stableKey });
    setDrawerOpen(true);
  };

  const selectedAlertId =
    selectedAlert?.id || selectedAlert?.alert_id || selectedAlert?._id;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Alerts</h1>
        <div className="text-sm text-slate-400">Live alert feed</div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-slate-400 text-sm mb-2">Loading alerts...</div>
      )}

      {error && (
        <div className="text-red-400 text-sm mb-2">
          Error loading alerts: {error}
        </div>
      )}

      {/* Alerts Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-900/60 border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
          <div className="col-span-5">Title</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Host</div>
          <div className="col-span-1 text-right">Open</div>
        </div>

        {rows.length === 0 && !loading ? (
          <div className="p-6 text-slate-400 text-sm">No alerts found.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id || r.alert_id || r._id}
              className="grid grid-cols-12 px-4 py-3 border-b border-slate-900 hover:bg-slate-900/40 transition"
            >
              <div className="col-span-5 text-white">{r.title}</div>
              <div className="col-span-2 text-slate-200">{r.severity}</div>
              <div className="col-span-2 text-slate-200">{r.status}</div>
              <div className="col-span-2 text-slate-200">{r.host}</div>
              <div className="col-span-1 text-right">
                <button
                  onClick={() => openDrawer(r)}
                  className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                >
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Right Drawer */}
      <RightDrawer
        isOpen={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        title={selectedAlert ? selectedAlert.title : "Alert Details"}
        severity={selectedAlert?.severity}
        item={selectedAlert}
      >
        <AlertDrawerContent alert={selectedAlert} />
        <AIAnalysisPanel alertId={selectedAlertId} />
      </RightDrawer>
    </div>
  );
}
