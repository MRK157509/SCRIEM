import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";
import { searchTimeline } from "../lib/api";

const LS_LAST_Q = "scriem:timeline:lastQuery";

function makeStableKey(item) {
  return String(
    item?.id ||
      item?._id ||
      item?.alert_id ||
      item?.event_id ||
      `${item?.title || item?.event_type || "untitled"}|${item?.host || "nohost"}|${
        item?.user || "nouser"
      }|${item?.ts || item?.timestamp || ""}`
  );
}

export default function Timeline() {
  const location = useLocation();
  const navigate = useNavigate();

  const q = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return (sp.get("q") || "").trim();
  }, [location.search]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const openDrawer = (item) => {
    const stableKey = makeStableKey(item);
    setSelectedItem({ ...item, __scriemKey: stableKey });
    setDrawerOpen(true);
  };

  // ✅ Restore last query if user lands on /timeline with no ?q=
  useEffect(() => {
    if (q) return;
    const last = (localStorage.getItem(LS_LAST_Q) || "").trim();
    const fallback = "HIGH";
    const next = last || fallback;
    navigate(`/timeline?q=${encodeURIComponent(next)}`, { replace: true });
  }, [q, navigate]);

  // ✅ Fetch whenever q changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError("");

      if (!q) {
        setEvents([]);
        setAlerts([]);
        return;
      }

      localStorage.setItem(LS_LAST_Q, q);

      setLoading(true);
      try {
        const data = await searchTimeline(q);
        if (cancelled) return;

        setEvents(Array.isArray(data?.events) ? data.events : []);
        setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
      } catch (e) {
        if (cancelled) return;
        setEvents([]);
        setAlerts([]);
        setError(e?.message || "Timeline search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-white text-2xl font-semibold">Timeline</div>
        <div className="text-white/50 text-sm">
          Search results for: <span className="text-white/80">{q || "—"}</span>
        </div>
      </div>

      {loading && <div className="text-white/60 text-sm">Loading…</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800 text-white/80 text-sm">
          Matched Alerts ({alerts.length})
        </div>

        {alerts.length === 0 ? (
          <div className="px-4 py-6 text-white/60">No alerts matched.</div>
        ) : (
          <div className="divide-y divide-slate-900">
            {alerts.map((a) => (
              <div
                key={`a-${a.id ?? a.event_id}-${a.created_at ?? ""}`}
                className="px-4 py-3 hover:bg-slate-900/40 transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-white truncate">{a.title || "Alert"}</div>
                  <div className="text-xs text-white/50">
                    {a.severity} • {a.status} • {a.host}
                  </div>
                </div>
                <button
                  onClick={() => openDrawer(a)}
                  className="shrink-0 px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800 text-white/80 text-sm">
          Matched Events ({events.length})
        </div>

        {events.length === 0 ? (
          <div className="px-4 py-6 text-white/60">No events matched.</div>
        ) : (
          <div className="divide-y divide-slate-900">
            {events.map((e) => (
              <div
                key={`e-${e.id ?? e.event_id}-${e.created_at ?? ""}`}
                className="px-4 py-3 hover:bg-slate-900/40 transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-white truncate">
                    {e.event_type || "Event"} • {e.action || "action"}
                  </div>
                  <div className="text-xs text-white/50">
                    {e.host} • {e.user || "N/A"}
                  </div>
                </div>
                <button
                  onClick={() => openDrawer(e)}
                  className="shrink-0 px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <RightDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem?.title || selectedItem?.event_type || "Timeline Item"}
        severity={selectedItem?.severity}
        item={selectedItem}
      >
        {selectedItem?.title ? (
          <AlertDrawerContent alert={selectedItem} />
        ) : (
          <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
            {JSON.stringify(selectedItem, null, 2)}
          </pre>
        )}
      </RightDrawer>
    </div>
  );
}
