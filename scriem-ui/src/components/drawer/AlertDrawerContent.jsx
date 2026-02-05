import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DrawerSection from "./DrawerSection";
import DrawerTabs from "./DrawerTabs";

function stableKey(item) {
  if (item?.__scriemKey) return String(item.__scriemKey);

  // ✅ NO timestamps
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

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
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

export default function AlertDrawerContent({ alert }) {
  const nav = useNavigate();
  if (!alert) return null;

  const alertKey = useMemo(() => stableKey(alert), [alert]);
  const notesKey = useMemo(
    () => `scriem.investigation.notes.${alertKey}`,
    [alertKey]
  );
  const actionsKey = useMemo(
    () => `scriem.investigation.actions.${alertKey}`,
    [alertKey]
  );
  const activityKey = useMemo(
    () => `scriem.investigation.activity.${alertKey}`,
    [alertKey]
  );

  const [notes, setNotes] = useState("");
  const [actions, setActions] = useState(DEFAULT_ACTIONS);
  const [activity, setActivity] = useState([]);
  const [copyState, setCopyState] = useState("idle");

  // ✅ Refs to survive StrictMode mount/unmount cycles
  const notesRef = useRef("");
  const dirtyRef = useRef(false); // ONLY write on cleanup if user edited

  // Load from storage when alert changes
  useEffect(() => {
    const n = readLS(notesKey, "");
    setNotes(n);
    notesRef.current = n;

    // ✅ This is critical: freshly loaded means NOT dirty
    dirtyRef.current = false;

    setActions(readJsonLS(actionsKey, DEFAULT_ACTIONS));
    setActivity(readJsonLS(activityKey, []));
  }, [notesKey, actionsKey, activityKey]);

  // Live updates from header action buttons
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

  // ✅ Flush on "page about to hide" — but ONLY if dirty
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

    // ✅ StrictMode safe cleanup: do NOT overwrite unless dirty
    return () => {
      window.removeEventListener("beforeunload", flushIfDirty);
      document.removeEventListener("visibilitychange", onVis);
      flushIfDirty();
    };
  }, [notesKey]);

  const onNotesChange = (v) => {
    setNotes(v);
    notesRef.current = v;
    dirtyRef.current = true;

    // ✅ Persist immediately (fast close cannot lose data)
    writeLS(notesKey, v);
  };

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

  return (
    <DrawerTabs
      tabs={[
        {
          label: "Summary",
          content: (
            <DrawerSection title="Alert Summary">
              <Field label="Title" value={alert.title} />
              <Field label="Severity" value={alert.severity} />
              <Field label="Status" value={alert.status} />
              <Field label="Host" value={alert.host} />
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
                <div className="text-xs text-slate-400 mb-2">
                  Pivot (Investigation)
                </div>
                <div className="flex flex-wrap gap-2">
                  <PivotButton
                    onClick={() => pivotTimeline(entities.ip)}
                    disabled={!entities.ip}
                    title="Search Timeline using this IP"
                  >
                    Search Timeline (IP)
                  </PivotButton>

                  <PivotButton
                    onClick={() => pivotTimeline(entities.user)}
                    disabled={!entities.user}
                    title="Search Timeline using this User"
                  >
                    Search Timeline (User)
                  </PivotButton>

                  <PivotButton
                    onClick={() => pivotTimeline(entities.host)}
                    disabled={!entities.host}
                    title="Search Timeline using this Host"
                  >
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
              <DrawerSection title="Investigation Notes">
                <textarea
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Notes persist per alert (localStorage)"
                  className="w-full min-h-[140px] px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white/90 outline-none focus:border-slate-600 resize-y"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleCopyNotes}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                  >
                    {copyState === "copied"
                      ? "Copied!"
                      : copyState === "failed"
                      ? "Copy failed"
                      : "Copy Notes"}
                  </button>

                  <button
                    onClick={() => onNotesChange("")}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-800/40 text-slate-200 border border-slate-700 hover:bg-slate-700/40 transition"
                  >
                    Clear Notes
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-slate-500">
                  Key: <span className="text-slate-300">{alertKey}</span>
                </div>
              </DrawerSection>

              <DrawerSection title="Action Log (Wired)">
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
                      <div className="text-sm font-medium">
                        {actions?.[key] ? "Yes" : "No"}
                      </div>
                    </div>
                  ))}
                </div>
              </DrawerSection>

              <DrawerSection title="Activity Feed">
                {activity?.length ? (
                  <div className="space-y-2">
                    {activity.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-lg border border-slate-800 bg-slate-900/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-400">
                            {a.type || "event"}
                          </div>
                          <div className="text-[10px] text-slate-500">{a.ts}</div>
                        </div>
                        <div className="text-sm text-white/90 mt-1">
                          {a.message}
                        </div>
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
                {JSON.stringify(alert, null, 2)}
              </pre>
            </DrawerSection>
          ),
        },
      ]}
    />
  );
}
