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

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedAlert(null);
  };

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
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/10 bg-slate-950/70 p-6 sm:p-7 shadow-[0_24px_120px_rgba(0,0,0,0.22)]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-100 text-[11px] uppercase tracking-[0.28em]">
          Alert feed
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Live alerts</h1>
        <p className="mt-2 max-w-2xl text-white/60 leading-7">
          Review detections, open the drawer for context, and move suspicious events into cases.
        </p>
      </section>

      {/* Loading / Error */}
      {loading && (
        <div className="text-white/60 text-sm">Loading alerts...</div>
      )}

      {error && (
        <div className="text-red-400 text-sm mb-2">
          Error loading alerts: {error}
        </div>
      )}

      {/* Alerts Table */}
      <div className="border border-white/10 rounded-[28px] overflow-hidden bg-slate-950/60 backdrop-blur-xl">
        <div className="grid grid-cols-12 bg-white/5 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/45">
          <div className="col-span-5">Title</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Host</div>
          <div className="col-span-1 text-right">Open</div>
        </div>

        {rows.length === 0 && !loading ? (
          <div className="p-6 text-white/55 text-sm">No alerts found.</div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id || r.alert_id || r._id}
              className="grid grid-cols-12 px-4 py-4 border-b border-white/6 hover:bg-white/5 transition"
            >
              <div className="col-span-5 text-white font-medium pr-3">{r.title}</div>
              <div className="col-span-2 text-white/80">{r.severity}</div>
              <div className="col-span-2 text-white/80">{r.status}</div>
              <div className="col-span-2 text-white/70">{r.host}</div>
              <div className="col-span-1 text-right">
                <button
                  onClick={() => openDrawer(r)}
                  className="px-3 py-1 text-xs rounded-xl bg-cyan-500/15 text-cyan-100 border border-cyan-500/25 hover:bg-cyan-500/20 transition"
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
        onClose={closeDrawer}
        title={selectedAlert ? selectedAlert.title : "Alert Details"}
        severity={selectedAlert?.severity}
        item={selectedAlert}
        showMini={false}
      >
        <AlertDrawerContent alert={selectedAlert} />
        <AIAnalysisPanel alertId={selectedAlertId} />
      </RightDrawer>
    </div>
  );
}
