import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DrawerSection from "./DrawerSection";
import DrawerTabs from "./DrawerTabs";

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

async function copyToClipboard(text) {
  if (!text) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    // fall through
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

function buildEvidenceSnapshot(alert) {
  const lines = [];
  lines.push("# SCRIEM Investigation Snapshot");
  lines.push(`Title: ${alert?.title ?? "N/A"}`);
  lines.push(`Severity: ${alert?.severity ?? "N/A"}`);
  lines.push(`Status: ${alert?.status ?? "N/A"}`);
  lines.push(`Host: ${alert?.host ?? "N/A"}`);
  lines.push(`User: ${alert?.user ?? "N/A"}`);
  lines.push(`IP: ${alert?.ip ?? "N/A"}`);

  // If timeline events include a timestamp field, try a few common keys
  const ts = alert?.ts || alert?.timestamp || alert?.time || alert?.event_time;
  if (ts) lines.push(`Time: ${ts}`);

  return lines.join("\n");
}

export default function AlertDrawerContent({ alert }) {
  const nav = useNavigate();
  if (!alert) return null;

  // Prefer stable key if exists, else fallback (ok for now)
  const alertKey = String(alert.id || alert._id || alert.alert_id || alert.title || "unknown");

  const notesKey = `scriem.investigation.notes.${alertKey}`;
  const actionsKey = `scriem.investigation.actions.${alertKey}`;

  const entities = useMemo(
    () => ({
      user: alert.user || null,
      ip: alert.ip || null,
      host: alert.host || null,
    }),
    [alert]
  );

  const [notes, setNotes] = useState("");
  const [actions, setActions] = useState(() => ({
    triaged: false,
    investigating: false,
    escalated: false,
    contained: false,
    closed: false,
  }));

  const [copyState, setCopyState] = useState("idle"); // idle | copied | failed

  // Load persisted notes/actions when alert changes
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(notesKey);
      setNotes(savedNotes || "");
    } catch {
      setNotes("");
    }

    try {
      const savedActions = localStorage.getItem(actionsKey);
      if (savedActions) setActions(JSON.parse(savedActions));
      else
        setActions({
          triaged: false,
          investigating: false,
          escalated: false,
          contained: false,
          closed: false,
        });
    } catch {
      setActions({
        triaged: false,
        investigating: false,
        escalated: false,
        contained: false,
        closed: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertKey]);

  // Persist notes
  useEffect(() => {
    try {
      localStorage.setItem(notesKey, notes);
    } catch {
      // ignore
    }
  }, [notesKey, notes]);

  // Persist actions
  useEffect(() => {
    try {
      localStorage.setItem(actionsKey, JSON.stringify(actions));
    } catch {
      // ignore
    }
  }, [actionsKey, actions]);

  const pivotTimeline = (value) => {
    if (!value) return;
    nav(`/timeline?q=${encodeURIComponent(value)}`);
  };

  const handleCopySnapshot = async () => {
    const text = buildEvidenceSnapshot(alert) + (notes ? `\n\nNotes:\n${notes}` : "");
    const ok = await copyToClipboard(text);
    setCopyState(ok ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1200);
  };

  const toggleAction = (k) => {
    setActions((prev) => ({ ...prev, [k]: !prev[k] }));
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
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write investigation notes... (persisted locally per alert)"
                  className="w-full min-h-[140px] px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white/90 outline-none focus:border-slate-600 resize-y"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleCopySnapshot}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                    title="Copy evidence snapshot + notes"
                  >
                    {copyState === "copied"
                      ? "Copied!"
                      : copyState === "failed"
                      ? "Copy failed"
                      : "Copy Snapshot"}
                  </button>

                  <button
                    onClick={() => setNotes("")}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-800/40 text-slate-200 border border-slate-700 hover:bg-slate-700/40 transition"
                    title="Clear notes for this alert"
                  >
                    Clear Notes
                  </button>
                </div>
              </DrawerSection>

              <DrawerSection title="Action Log">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["triaged", "Triaged"],
                    ["investigating", "Investigating"],
                    ["escalated", "Escalated"],
                    ["contained", "Contained"],
                    ["closed", "Closed"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleAction(key)}
                      className={[
                        "px-3 py-2 rounded-lg border text-sm transition text-left",
                        actions[key]
                          ? "bg-green-500/15 border-green-500/30 text-green-200"
                          : "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800/40",
                      ].join(" ")}
                      title="Toggle"
                    >
                      <div className="text-xs text-slate-400">{label}</div>
                      <div className="text-sm font-medium">
                        {actions[key] ? "Yes" : "No"}
                      </div>
                    </button>
                  ))}
                </div>
              </DrawerSection>

              <DrawerSection title="Evidence Snapshot">
                <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
                  {buildEvidenceSnapshot(alert)}
                </pre>
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
