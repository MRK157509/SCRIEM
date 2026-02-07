import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";
import TimelineStream from "../components/timeline/TimelineStream";
import { searchTimeline } from "../lib/api";

import { createCase, addItemsToCase } from "../lib/cases";

const LS_LAST_Q = "scriem:timeline:lastQuery";
const LS_PINS = "scriem:timeline:pins:v1";

// Notes persistence key (drawer notes)
function notesKey(scriemKey) {
  return `scriem:notes:${scriemKey}`;
}

function makeStableKey(item) {
  return String(
    item?.__scriemKey ||
      item?.id ||
      item?._id ||
      item?.alert_id ||
      item?.event_id ||
      `${item?.title || item?.event_type || "untitled"}|${item?.host || "nohost"}|${
        item?.user || "nouser"
      }|${item?.created_at || item?.timestamp || ""}`
  );
}

// Parse "host:xxx severity:HIGH status:OPEN user:alice free text here"
function parseQuery(q) {
  const tokens = String(q || "").trim().split(/\s+/).filter(Boolean);

  const filters = { host: "", severity: "", status: "", user: "" };
  const free = [];

  for (const t of tokens) {
    const m = t.match(/^(\w+):(.*)$/);
    if (!m) {
      free.push(t);
      continue;
    }
    const k = m[1].toLowerCase();
    const v = m[2];
    if (k in filters) filters[k] = v;
    else free.push(t);
  }

  return { filters, freeText: free.join(" ") };
}

function buildQuery(filters, freeText) {
  const parts = [];
  if (filters.host) parts.push(`host:${filters.host}`);
  if (filters.user) parts.push(`user:${filters.user}`);
  if (filters.severity) parts.push(`severity:${filters.severity}`);
  if (filters.status) parts.push(`status:${filters.status}`);
  if (freeText) parts.push(freeText);
  return parts.join(" ").trim();
}

function matchFilters(item, filters) {
  const host = String(item?.host || "");
  const user = String(item?.user || "");
  const severity = String(item?.severity || "");
  const status = String(item?.status || "");

  if (filters.host && host.toLowerCase() !== filters.host.toLowerCase()) return false;
  if (filters.user && user.toLowerCase() !== filters.user.toLowerCase()) return false;
  if (filters.severity && severity.toLowerCase() !== filters.severity.toLowerCase())
    return false;
  if (filters.status && status.toLowerCase() !== filters.status.toLowerCase()) return false;

  return true;
}

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      document.body.removeChild(ta);
      return false;
    }
  }
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Timeline() {
  const location = useLocation();
  const navigate = useNavigate();

  const rawQ = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return (sp.get("q") || "").trim();
  }, [location.search]);

  const parsed = useMemo(() => parseQuery(rawQ), [rawQ]);

  const [filters, setFilters] = useState(parsed.filters);
  const [freeText, setFreeText] = useState(parsed.freeText);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Investigation Mode
  const [investigationMode, setInvestigationMode] = useState(true);
  const [focusItem, setFocusItem] = useState(null);
  const [focusKey, setFocusKey] = useState("");

  // Pins
  const [pins, setPins] = useState(() => {
    const stored = localStorage.getItem(LS_PINS);
    return stored ? safeJsonParse(stored, []) : [];
  });

  const pinnedKeySet = useMemo(() => new Set(pins.map((p) => p.key)), [pins]);

  const applySearch = (nextFilters, nextFreeText) => {
    const q = buildQuery(nextFilters, nextFreeText);
    if (!q) return;
    localStorage.setItem(LS_LAST_Q, q);
    navigate(`/timeline?q=${encodeURIComponent(q)}`);
  };

  // Sync UI state when URL changes
  useEffect(() => {
    setFilters(parsed.filters);
    setFreeText(parsed.freeText);
  }, [parsed.filters, parsed.freeText]);

  // Restore last query if user lands on /timeline with no q
  useEffect(() => {
    if (rawQ) return;
    const last = (localStorage.getItem(LS_LAST_Q) || "").trim();
    const fallback = "HIGH";
    const q = last || fallback;
    navigate(`/timeline?q=${encodeURIComponent(q)}`, { replace: true });
  }, [rawQ, navigate]);

  // Fetch from backend
  useEffect(() => {
    let cancelled = false;

    async function fetchNow() {
      setError("");

      if (!rawQ) {
        setAlerts([]);
        setEvents([]);
        return;
      }

      setLoading(true);
      try {
        const data = await searchTimeline(rawQ);
        if (cancelled) return;

        setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
        setEvents(Array.isArray(data?.events) ? data.events : []);
      } catch (e) {
        if (cancelled) return;
        setAlerts([]);
        setEvents([]);
        setError(e?.message || "Timeline search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNow();
    return () => {
      cancelled = true;
    };
  }, [rawQ]);

  // Frontend filter pass
  const filteredAlerts = useMemo(
    () => alerts.filter((a) => matchFilters(a, filters)),
    [alerts, filters]
  );

  const filteredEvents = useMemo(
    () => events.filter((e) => matchFilters(e, filters)),
    [events, filters]
  );

  const openDrawer = (item) => {
    const stableKey = makeStableKey(item);
    setSelectedItem({ ...item, __scriemKey: stableKey });
    setDrawerOpen(true);
  };

  const pivotTo = (pivotQ) => {
    const { filters: pf, freeText: ft } = parseQuery(pivotQ);
    const merged = {
      host: pf.host || filters.host,
      user: pf.user || filters.user,
      severity: pf.severity || filters.severity,
      status: pf.status || filters.status,
    };
    applySearch(merged, ft || freeText);
  };

  const clearFilter = (k) => {
    const next = { ...filters, [k]: "" };
    applySearch(next, freeText);
  };

  const togglePin = (item, key) => {
    const stableKey = makeStableKey(item);
    const kind = item?.title ? "alert" : "event";
    const title = item?.title || `${item?.event_type || "Event"} • ${item?.action || "action"}`;
    const host = item?.host || "";
    const user = item?.user || "";
    const severity = item?.severity || "";

    setPins((prev) => {
      const exists = prev.some((p) => p.key === key);
      const next = exists
        ? prev.filter((p) => p.key !== key)
        : [
            {
              key,
              kind,
              title,
              host,
              user,
              severity,
              stableKey,
              snapshot: item,
              pinned_at: new Date().toISOString(),
            },
            ...prev,
          ];

      localStorage.setItem(LS_PINS, JSON.stringify(next));
      return next;
    });
  };

  const onFocus = (item, key) => {
    setFocusItem(item);
    setFocusKey(key);
  };

  // Context summary derived from focus item (or filters)
  const context = useMemo(() => {
    const host = focusItem?.host || filters.host || "";
    const user = focusItem?.user || filters.user || "";
    const severity = focusItem?.severity || filters.severity || "";

    const relatedAlerts = filteredAlerts.filter((a) => {
      if (host && a.host !== host) return false;
      if (user && (a.user || "") !== user) return false;
      return true;
    });

    const relatedEvents = filteredEvents.filter((e) => {
      if (host && e.host !== host) return false;
      if (user && (e.user || "") !== user) return false;
      return true;
    });

    return {
      host,
      user,
      severity,
      counts: {
        alerts: relatedAlerts.length,
        events: relatedEvents.length,
      },
    };
  }, [focusItem, filters, filteredAlerts, filteredEvents]);

  const exportCaseNotes = async () => {
    const now = new Date().toISOString();
    const header = [
      `SCRIEM Case Notes`,
      `Time: ${now}`,
      `Timeline Query: ${rawQ || "—"}`,
      ``,
      `Context`,
      `- Host: ${context.host || "—"}`,
      `- User: ${context.user || "—"}`,
      `- Severity: ${context.severity || "—"}`,
      `- Matched Alerts: ${filteredAlerts.length}`,
      `- Matched Events: ${filteredEvents.length}`,
      ``,
      `Pinned Items (${pins.length})`,
      `-------------------------`,
    ].join("\n");

    const pinnedText = pins
      .map((p, idx) => {
        const storedNotes =
          p.stableKey ? localStorage.getItem(notesKey(p.stableKey)) || "" : "";

        return [
          `${idx + 1}. [${p.kind.toUpperCase()}] ${p.title}`,
          `   host: ${p.host || "—"} | user: ${p.user || "—"} | severity: ${p.severity || "—"}`,
          `   pinned_at: ${p.pinned_at}`,
          storedNotes ? `   analyst_notes: ${storedNotes}` : `   analyst_notes: (none)`,
          `   snapshot: ${JSON.stringify(p.snapshot, null, 2)}`,
          ``,
        ].join("\n");
      })
      .join("\n");

    const content = `${header}\n${pinnedText}`;

    const ok = await copyToClipboard(content);
    if (!ok) {
      alert("Could not copy to clipboard. Downloading instead.");
      downloadTextFile(`scriem-case-notes-${Date.now()}.txt`, content);
      return;
    }
    alert("✅ Case notes copied to clipboard.");
  };

  const createCaseFromPins = () => {
    if (!pins.length) {
      alert("Pin some items first, then create a case.");
      return;
    }

    const items = pins.map((p) => ({
      kind: p.kind,
      ...p.snapshot,
    }));

    const c = createCase({
      title: `Investigation: ${rawQ || "Timeline"}`,
      description: `Created from Timeline Investigation Mode.\nQuery: ${rawQ || "—"}`,
      severity: filters.severity || "MEDIUM",
      status: "OPEN",
      items,
    });

    // ensure de-dupe + timeline entry in case module
    addItemsToCase(c.id, items);

    alert(`✅ Case created: ${c.id}`);
    navigate(`/cases/${c.id}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-semibold">Timeline</div>
          <div className="text-white/50 text-sm">
            Simple search for users • Investigation Mode for analysts
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setInvestigationMode((v) => !v)}
            className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
            title="Toggle Investigation Mode (Context + Pins + Export)"
          >
            {investigationMode ? "Investigation: ON" : "Investigation: OFF"}
          </button>

          <button
            onClick={createCaseFromPins}
            className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
            title="Create a Case using pinned items"
          >
            Create Case from Pins
          </button>

          <button
            onClick={exportCaseNotes}
            className="h-10 px-4 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition"
          >
            Export Case Notes
          </button>
        </div>
      </div>

      {/* Smart Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applySearch(filters, freeText);
        }}
        className="border border-slate-800 rounded-2xl bg-slate-950/40 p-3"
      >
        <div className="flex flex-col xl:flex-row gap-3">
          <input
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Search… (malware, HIGH, win-laptop-01, alice)"
            className="flex-1 h-11 px-3 rounded-xl border border-white/10 bg-white/5 text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />

          <div className="flex flex-wrap gap-2">
            <select
              value={filters.severity}
              onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))}
              className="h-11 px-3 rounded-xl border border-white/10 bg-white/5 text-white/80 focus:outline-none"
            >
              <option value="">Severity</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className="h-11 px-3 rounded-xl border border-white/10 bg-white/5 text-white/80 focus:outline-none"
            >
              <option value="">Status</option>
              <option value="OPEN">OPEN</option>
              <option value="TRIAGED">TRIAGED</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="CLOSED">CLOSED</option>
            </select>

            <input
              value={filters.host}
              onChange={(e) => setFilters((p) => ({ ...p, host: e.target.value }))}
              placeholder="Host"
              className="h-11 w-[180px] px-3 rounded-xl border border-white/10 bg-white/5 text-white/80 placeholder:text-white/30 focus:outline-none"
            />

            <input
              value={filters.user}
              onChange={(e) => setFilters((p) => ({ ...p, user: e.target.value }))}
              placeholder="User"
              className="h-11 w-[180px] px-3 rounded-xl border border-white/10 bg-white/5 text-white/80 placeholder:text-white/30 focus:outline-none"
            />

            <button className="h-11 px-4 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition">
              Search
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {filters.host && (
            <button
              type="button"
              onClick={() => clearFilter("host")}
              className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            >
              host:{filters.host} ✕
            </button>
          )}
          {filters.user && (
            <button
              type="button"
              onClick={() => clearFilter("user")}
              className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            >
              user:{filters.user} ✕
            </button>
          )}
          {filters.severity && (
            <button
              type="button"
              onClick={() => clearFilter("severity")}
              className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            >
              severity:{filters.severity} ✕
            </button>
          )}
          {filters.status && (
            <button
              type="button"
              onClick={() => clearFilter("status")}
              className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            >
              status:{filters.status} ✕
            </button>
          )}

          <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/50">
            URL query: <span className="text-white/80">{rawQ || "—"}</span>
          </span>
        </div>
      </form>

      {loading && <div className="text-white/60 text-sm">Loading…</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      {/* Stream + Investigation panel */}
      <div
        className={`grid gap-4 ${
          investigationMode ? "grid-cols-1 xl:grid-cols-3" : "grid-cols-1"
        }`}
      >
        <div className={investigationMode ? "xl:col-span-2" : ""}>
          <TimelineStream
            alerts={filteredAlerts}
            events={filteredEvents}
            onOpenItem={openDrawer}
            onPivot={pivotTo}
            onSelectItem={(item, key) => {
              setFocusItem(item);
              setFocusKey(key);
            }}
            pinnedKeys={pinnedKeySet}
            onTogglePin={togglePin}
            selectedKey={focusKey}
          />
        </div>

        {investigationMode && (
          <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-white font-semibold">Investigation Panel</div>
              <button
                onClick={() => {
                  setFocusItem(null);
                  setFocusKey("");
                }}
                className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              >
                Clear Focus
              </button>
            </div>

            <div className="space-y-2 text-sm text-white/70">
              <div>
                <span className="text-white/50">Host:</span>{" "}
                <span className="text-white/90">{context.host || "—"}</span>
              </div>
              <div>
                <span className="text-white/50">User:</span>{" "}
                <span className="text-white/90">{context.user || "—"}</span>
              </div>
              <div>
                <span className="text-white/50">Severity:</span>{" "}
                <span className="text-white/90">{context.severity || "—"}</span>
              </div>

              <div className="flex gap-2 text-xs mt-2">
                <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70">
                  Alerts:{" "}
                  <span className="text-white/90">{context.counts.alerts}</span>
                </span>
                <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/70">
                  Events:{" "}
                  <span className="text-white/90">{context.counts.events}</span>
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <div className="text-white/80 text-sm font-medium mb-2">
                Pinned Items ({pins.length})
              </div>

              {pins.length === 0 ? (
                <div className="text-white/50 text-sm">
                  Pin items from the stream to build your case.
                </div>
              ) : (
                <div className="space-y-2">
                  {pins.slice(0, 10).map((p) => (
                    <div
                      key={p.key}
                      className="border border-slate-800 rounded-xl bg-black/20 p-3"
                    >
                      <div className="text-white text-sm font-medium">
                        {p.kind === "alert" ? "🔔 " : "🧾 "}
                        {p.title}
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        {p.host ? `host: ${p.host}` : "host: —"}{" "}
                        {p.user ? `• user: ${p.user}` : ""}{" "}
                        {p.severity ? `• severity: ${p.severity}` : ""}
                      </div>

                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => openDrawer(p.snapshot)}
                          className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => togglePin(p.snapshot, p.key)}
                          className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        >
                          Unpin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                localStorage.removeItem(LS_PINS);
                setPins([]);
              }}
              className="w-full h-10 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              Clear All Pins
            </button>
          </div>
        )}
      </div>

      {/* Drawer */}
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
