import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DrawerSection from "./DrawerSection";
import DrawerTabs from "./DrawerTabs";

function stableKey(item) {
  if (item?.__scriemKey) return String(item.__scriemKey);
  return String(
    item?.id ||
      item?._id ||
      item?.alert_id ||
      item?.event_id ||
      item?.key ||
      `${item?.title || "untitled"}|${item?.host || "nohost"}|${item?.user || "nouser"}|${item?.ip || "noip"}`
  );
}

function readLS(key, fallback = "") {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function readJsonLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function writeJsonLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  return false;
}

function Field({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="text-slate-400 text-xs">{label}</div>
      <div
        className={[
          "text-white/90 text-sm text-right break-words max-w-[70%]",
          mono ? "font-mono text-xs" : "",
        ].join(" ")}
      >
        {value ?? "N/A"}
      </div>
    </div>
  );
}

function PivotButton({ onClick, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "px-3 py-1 text-xs rounded-lg border transition",
        disabled
          ? "bg-slate-800/30 text-slate-500 border-slate-800 cursor-not-allowed"
          : "bg-slate-700/40 text-slate-200 border-slate-600 hover:bg-slate-600/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

const DEFAULT_ACTIONS = {
  triaged: false,
  investigating: false,
  escalated: false,
  contained: false,
  closed: false,
};

function mkActivity(type, message) {
  return {
    id: `a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: new Date().toLocaleString(),
    type,
    message,
  };
}

// ✅ Backend call (uses your existing /api proxy)
async function patchAlert(alertId, payload) {
  const res = await fetch(`/api/alerts/${alertId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const msg = data?.detail || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export default function AlertDrawerContent({ alert }) {
  const nav = useNavigate();
  if (!alert) return null;

  const alertId = useMemo(() => alert?.id ?? alert?.alert_id ?? null, [alert]);

  const alertKey = useMemo(() => stableKey(alert), [alert]);
  const notesKey = useMemo(() => `scriem.investigation.notes.${alertKey}`, [alertKey]);
  const actionsKey = useMemo(() => `scriem.investigation.actions.${alertKey}`, [alertKey]);
  const activityKey = useMemo(() => `scriem.investigation.activity.${alertKey}`, [alertKey]);

  const [notes, setNotes] = useState("");
  const [actions, setActions] = useState(DEFAULT_ACTIONS);
  const [activity, setActivity] = useState([]);
  const [copyState, setCopyState] = useState("idle");

  const [statusLive, setStatusLive] = useState(alert?.status || "OPEN");
  const [syncState, setSyncState] = useState({ status: "idle", notes: "idle", err: "" });

  const notesRef = useRef("");
  const dirtyRef = useRef(false);

  // debounce timer for autosave to DB
  const notesTimerRef = useRef(null);

  useEffect(() => {
    const n = readLS(notesKey, "");
    setNotes(n);
    notesRef.current = n;
    dirtyRef.current = false;

    setActions(readJsonLS(actionsKey, DEFAULT_ACTIONS));
    setActivity(readJsonLS(activityKey, []));

    setStatusLive(alert?.status || "OPEN");
    setSyncState({ status: "idle", notes: "idle", err: "" });

    if (notesTimerRef.current) {
      clearTimeout(notesTimerRef.current);
      notesTimerRef.current = null;
    }
  }, [alert, notesKey, actionsKey, activityKey]);

  useEffect(() => {
    const handler = (e) => {
      const k = e?.detail?.alertKey;
      if (String(k) !== String(alertKey)) return;
      setActions(readJsonLS(actionsKey, DEFAULT_ACTIONS));
      setActivity(readJsonLS(activityKey, []));
    };
    window.addEventListener("scriem:investigation:update", handler);
    return () => window.removeEventListener("scriem:investigation:update", handler);
  }, [alertKey, actionsKey, activityKey]);

  useEffect(() => {
    const flushIfDirty = () => {
      if (!dirtyRef.current) return;
      writeLS(notesKey, notesRef.current || "");
      dirtyRef.current = false;
    };

    const onVis = () => {
      if (document.visibilityState !== "visible") flushIfDirty();
    };

    window.addEventListener("beforeunload", flushIfDirty);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("beforeunload", flushIfDirty);
      document.removeEventListener("visibilitychange", onVis);
      flushIfDirty();
    };
  }, [notesKey]);

  const pivotTimeline = (value) => {
    if (!value) return;
    nav(`/timeline?q=${encodeURIComponent(value)}`);
  };

  const entities = {
    user: alert.user || null,
    ip: alert.ip || null,
    host: alert.host || null,
  };

  const handleCopyNotes = async () => {
    const ok = await copyToClipboard(notes || "");
    setCopyState(ok ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1200);
  };

  function logLocalAction(type, message, nextActionsPartial) {
    const nextActions = { ...actions, ...(nextActionsPartial || {}) };
    const nextActivity = [mkActivity(type, message), ...(activity || [])];

    setActions(nextActions);
    setActivity(nextActivity);

    writeJsonLS(actionsKey, nextActions);
    writeJsonLS(activityKey, nextActivity);

    window.dispatchEvent(new CustomEvent("scriem:investigation:update", { detail: { alertKey } }));
  }

  async function syncStatus(nextStatus) {
    if (!alertId) {
      alert("Alert has no DB id (id/alert_id missing).");
      return;
    }
    setSyncState((s) => ({ ...s, status: "saving", err: "" }));
    try {
      const updated = await patchAlert(alertId, { status: nextStatus });
      setStatusLive(updated?.status || nextStatus);

      if (nextStatus === "TRIAGED") logLocalAction("status", "Status → TRIAGED (DB)", { triaged: true });
      if (nextStatus === "ESCALATED") logLocalAction("status", "Status → ESCALATED (DB)", { escalated: true });
      if (nextStatus === "CLOSED") logLocalAction("status", "Status → CLOSED (DB)", { closed: true });
      if (nextStatus === "OPEN") logLocalAction("status", "Status → OPEN (DB)", { triaged: false, escalated: false, closed: false });

      setSyncState((s) => ({ ...s, status: "saved", err: "" }));
      window.setTimeout(() => setSyncState((s) => ({ ...s, status: "idle" })), 800);
    } catch (e) {
      setSyncState((s) => ({ ...s, status: "failed", err: e?.message || "Sync failed" }));
    }
  }

  function scheduleNotesDbSave() {
    if (!alertId) return;

    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);

    notesTimerRef.current = setTimeout(async () => {
      setSyncState((s) => ({ ...s, notes: "saving", err: "" }));
      try {
        await patchAlert(alertId, { notes: notesRef.current || "" });
        logLocalAction("notes", "Notes autosaved to DB", {});
        setSyncState((s) => ({ ...s, notes: "saved", err: "" }));
        window.setTimeout(() => setSyncState((s) => ({ ...s, notes: "idle" })), 800);
      } catch (e) {
        setSyncState((s) => ({ ...s, notes: "failed", err: e?.message || "Sync failed" }));
      } finally {
        notesTimerRef.current = null;
      }
    }, 700);
  }

  const onNotesChange = (v) => {
    setNotes(v);
    notesRef.current = v;
    dirtyRef.current = true;

    // local safety net
    writeLS(notesKey, v);

    // DB autosave
    scheduleNotesDbSave();
  };

  return (
    <DrawerTabs
      tabs={[
        {
          label: "Summary",
          content: (
            <DrawerSection title="Alert Summary">
              <Field label="Title" value={alert.title} />
              <Field label="Severity" value={alert.severity} />
              <Field label="Status" value={statusLive || alert.status} />
              <Field label="Host" value={alert.host} />
              <Field label="DB ID" value={alertId ?? "N/A"} mono />
            </DrawerSection>
          ),
        },
        {
          label: "Entities",
          content: (
            <DrawerSection title="Entities">
              <Field label="User" value={entities.user} />
              <Field label="IP" value={entities.ip} mono />
              <Field label="Host" value={entities.host} />

              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-2">Pivot (Investigation)</div>
                <div className="flex flex-wrap gap-2">
                  <PivotButton onClick={() => pivotTimeline(entities.ip)} disabled={!entities.ip} title="Search Timeline using this IP">
                    Search Timeline (IP)
                  </PivotButton>
                  <PivotButton onClick={() => pivotTimeline(entities.user)} disabled={!entities.user} title="Search Timeline using this User">
                    Search Timeline (User)
                  </PivotButton>
                  <PivotButton onClick={() => pivotTimeline(entities.host)} disabled={!entities.host} title="Search Timeline using this Host">
                    Search Timeline (Host)
                  </PivotButton>
                </div>
              </div>
            </DrawerSection>
          ),
        },
        {
          label: "Investigate",
          content: (
            <>
              <DrawerSection title="SOC Actions (Backend Synced)">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => syncStatus("TRIAGED")} className="px-3 py-2 text-xs rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 hover:bg-blue-500/20 transition">
                    Triage
                  </button>
                  <button onClick={() => syncStatus("ESCALATED")} className="px-3 py-2 text-xs rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-200 hover:bg-purple-500/20 transition">
                    Escalate
                  </button>
                  <button onClick={() => syncStatus("CLOSED")} className="px-3 py-2 text-xs rounded-lg bg-slate-500/15 border border-slate-500/30 text-slate-200 hover:bg-slate-500/20 transition">
                    Close
                  </button>
                  <button onClick={() => syncStatus("OPEN")} className="px-3 py-2 text-xs rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20 transition">
                    Reopen
                  </button>

                  <div className="ml-auto flex items-center gap-2 text-xs">
                    {syncState.status === "saving" && <span className="text-white/60">Saving status…</span>}
                    {syncState.status === "saved" && <span className="text-green-300">Status saved</span>}
                    {syncState.status === "failed" && <span className="text-red-300">Status failed</span>}
                  </div>
                </div>

                {syncState.err ? <div className="mt-2 text-xs text-red-300">Backend error: {syncState.err}</div> : null}
              </DrawerSection>

              <DrawerSection title="Investigation Notes (Autosaved to DB)">
                <textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Notes are saved locally AND autosaved to DB."
                  className="w-full min-h-[140px] px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white/90 outline-none focus:border-slate-600 resize-y"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleCopyNotes}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                  >
                    {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Copy failed" : "Copy Notes"}
                  </button>

                  <button
                    onClick={() => onNotesChange("")}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-800/40 text-slate-200 border border-slate-700 hover:bg-slate-700/40 transition"
                  >
                    Clear Notes
                  </button>

                  <div className="ml-auto flex items-center gap-2 text-xs">
                    {syncState.notes === "saving" && <span className="text-white/60">Saving notes…</span>}
                    {syncState.notes === "saved" && <span className="text-green-300">Notes saved</span>}
                    {syncState.notes === "failed" && <span className="text-red-300">Notes failed</span>}
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-500">
                  Key: <span className="text-slate-300">{alertKey}</span>
                </div>
              </DrawerSection>

              <DrawerSection title="Action Log (Local Mirror)">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["triaged", "Triaged"],
                    ["investigating", "Investigating"],
                    ["escalated", "Escalated"],
                    ["contained", "Contained"],
                    ["closed", "Closed"],
                  ].map(([key, label]) => (
                    <div
                      key={key}
                      className={[
                        "px-3 py-2 rounded-lg border text-left",
                        actions?.[key]
                          ? "bg-green-500/15 border-green-500/30 text-green-200"
                          : "bg-slate-900 border-slate-800 text-slate-200",
                      ].join(" ")}
                    >
                      <div className="text-xs text-slate-400">{label}</div>
                      <div className="text-sm font-medium">{actions?.[key] ? "Yes" : "No"}</div>
                    </div>
                  ))}
                </div>
              </DrawerSection>

              <DrawerSection title="Activity Feed">
                {activity?.length ? (
                  <div className="space-y-2">
                    {activity.map((a) => (
                      <div key={a.id} className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-400">{a.type || "event"}</div>
                          <div className="text-[10px] text-slate-500">{a.ts}</div>
                        </div>
                        <div className="text-sm text-white/90 mt-1">{a.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No activity yet.</div>
                )}
              </DrawerSection>
            </>
          ),
        },
        {
          label: "Raw",
          content: (
            <DrawerSection title="Raw JSON">
              <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
                {JSON.stringify({ ...alert, status_live: statusLive }, null, 2)}
              </pre>
            </DrawerSection>
          ),
        },
      ]}
    />
  );
}
