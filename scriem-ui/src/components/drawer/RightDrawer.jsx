import { useEffect, useMemo, useState } from "react";

const LS_COLLAPSE_KEY = "scriem.rightDrawer.collapsed";

function getAlertKey(item) {
  if (item?.__scriemKey) return String(item.__scriemKey);

  // Fallback (no timestamps)
  return String(
    item?.id ||
      item?._id ||
      item?.alert_id ||
      item?.event_id ||
      item?.key ||
      `${item?.title || "untitled"}|${item?.host || "nohost"}|${item?.user || "nouser"}|${item?.ip || "noip"}`
  );
}

function nowIso() {
  return new Date().toISOString();
}

function emitInvestigationUpdate(alertKey) {
  window.dispatchEvent(
    new CustomEvent("scriem:investigation:update", { detail: { alertKey } })
  );
}

function readJsonLs(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function writeJsonLs(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function severityBadgeClass(sev) {
  const s = (sev || "").toLowerCase();
  if (s === "critical") return "bg-red-600/20 text-red-400 border-red-500/30";
  if (s === "high") return "bg-orange-600/20 text-orange-400 border-orange-500/30";
  if (s === "medium") return "bg-yellow-600/20 text-yellow-400 border-yellow-500/30";
  if (s === "low") return "bg-green-600/20 text-green-400 border-green-500/30";
  return "bg-slate-700/40 text-slate-300 border-slate-600/60";
}

const DEFAULT_ACTIONS = {
  triaged: false,
  investigating: false,
  escalated: false,
  contained: false,
  closed: false,
};

async function copyToClipboard(text) {
  if (!text) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

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

function extractIocs(item) {
  if (!item || typeof item !== "object") return { ips: [], domains: [], hashes: [] };

  const raw = JSON.stringify(item);

  const ips = new Set(raw.match(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g) || []);
  const domains = new Set(raw.match(/\b(?!(?:https?:\/\/))(?:(?:[a-z0-9-]{1,63}\.)+(?:[a-z]{2,24}))\b/gi) || []);
  const hashes = new Set(raw.match(/\b[a-f0-9]{32}\b|\b[a-f0-9]{40}\b|\b[a-f0-9]{64}\b/gi) || []);

  if (item.ip) ips.add(String(item.ip));

  return { ips: [...ips], domains: [...domains], hashes: [...hashes] };
}

function buildIocCopyText(iocs) {
  const lines = ["# SCRIEM IOCs"];

  const section = (name, arr) => {
    if (!arr?.length) return;
    lines.push(`${name}:`);
    for (const v of arr) lines.push(`- ${v}`);
    lines.push("");
  };

  section("IPs", iocs.ips);
  section("Domains", iocs.domains);
  section("Hashes", iocs.hashes);

  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

export default function RightDrawer({
  isOpen,
  onOpen, // ✅ for mini-panel toggle
  onClose,
  title,
  severity,
  item,
  children,
  showMini = true, // ✅ always show mini panel when closed
}) {
  const alertKey = useMemo(() => getAlertKey(item), [item]);

  const LS_ACTIONS_KEY = useMemo(
    () => `scriem.investigation.actions.${alertKey}`,
    [alertKey]
  );
  const LS_ACTIVITY_KEY = useMemo(
    () => `scriem.investigation.activity.${alertKey}`,
    [alertKey]
  );

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(LS_COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [actions, setActions] = useState(DEFAULT_ACTIONS);
  const [activity, setActivity] = useState([]);
  const [copyState, setCopyState] = useState("idle"); // idle | copied | failed

  useEffect(() => {
    try {
      localStorage.setItem(LS_COLLAPSE_KEY, isCollapsed ? "1" : "0");
    } catch {}
  }, [isCollapsed]);

  useEffect(() => {
    setActions(readJsonLs(LS_ACTIONS_KEY, DEFAULT_ACTIONS));
    setActivity(readJsonLs(LS_ACTIVITY_KEY, []));
  }, [LS_ACTIONS_KEY, LS_ACTIVITY_KEY]);

  const appendActivity = (type, message) => {
    const entry = {
      id: `${nowIso()}-${Math.random().toString(16).slice(2)}`,
      ts: nowIso(),
      type,
      message,
    };
    const next = [entry, ...(activity || [])].slice(0, 50);
    setActivity(next);
    writeJsonLs(LS_ACTIVITY_KEY, next);
  };

  const updateActions = (updates, messages = []) => {
    const next = { ...(actions || DEFAULT_ACTIONS), ...updates };
    setActions(next);
    writeJsonLs(LS_ACTIONS_KEY, next);
    messages.forEach((m) => appendActivity("action", m));
    emitInvestigationUpdate(alertKey);
  };

  const onTriage = () =>
    updateActions(
      { triaged: true, investigating: true },
      ["Marked as Triaged", "Moved to Investigating"]
    );

  const onCloseAlert = () => updateActions({ closed: true }, ["Marked as Closed"]);

  const onEscalate = () =>
    updateActions({ escalated: true }, ["Escalated to higher tier"]);

  const onCreateCase = () => {
    appendActivity("case", "Case creation requested (UI placeholder)");
    emitInvestigationUpdate(alertKey);
  };

  const iocs = useMemo(() => extractIocs(item), [item]);

  const handleCopyIocs = async () => {
    const ok = await copyToClipboard(buildIocCopyText(iocs));
    setCopyState(ok ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1200);
  };

  // lock scroll only when full drawer is open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // ESC closes only when open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const showMiniPanel = showMini && !isOpen && !!item;

  return (
    <>
      {/* MINI RIGHT PANEL (always visible when drawer is closed) */}
      {showMiniPanel && (
        <div className="fixed top-0 right-0 h-full z-30 border-l border-slate-800 bg-slate-950/70 backdrop-blur shadow-xl w-[120px]">
          {/* mid-left toggle */}
          <button
            onClick={onOpen}
            className="absolute -left-4 top-1/2 -translate-y-1/2 h-14 w-8 rounded-l-xl border border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800/80 transition flex items-center justify-center"
            title="Open drawer"
            aria-label="Open drawer"
          >
            ⟪
          </button>

          <div className="p-3 flex flex-col gap-3">
            <div className="text-[10px] text-slate-400 truncate" title={title}>
              {title || "Details"}
            </div>

            {severity && (
              <div
                className={`px-2 py-1 text-[10px] rounded-md font-medium border inline-flex justify-center ${severityBadgeClass(
                  severity
                )}`}
                title={`Severity: ${severity}`}
              >
                {String(severity).toUpperCase()}
              </div>
            )}

            <div className="border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400">IPs</div>
              <div className="text-sm text-white font-semibold">{iocs.ips.length}</div>
            </div>

            <div className="border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400">Domains</div>
              <div className="text-sm text-white font-semibold">{iocs.domains.length}</div>
            </div>

            <div className="border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400">Hashes</div>
              <div className="text-sm text-white font-semibold">{iocs.hashes.length}</div>
            </div>

            <button
              onClick={handleCopyIocs}
              className="w-full px-2 py-2 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
              title="Copy extracted IOCs"
            >
              {copyState === "copied"
                ? "Copied!"
                : copyState === "failed"
                ? "Failed"
                : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* FULL DRAWER */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />

          <div
            className="fixed top-0 right-0 h-full z-50 border-l border-slate-800 bg-slate-950/95 shadow-2xl"
            style={{ width: isCollapsed ? 72 : 420 }}
            role="dialog"
            aria-label="Right drawer"
            aria-expanded={!isCollapsed}
          >
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {!isCollapsed ? (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <h2 className="text-lg font-semibold text-white truncate">
                            {title}
                          </h2>

                          {severity && (
                            <span
                              className={`px-2 py-0.5 text-xs rounded-md font-medium border ${severityBadgeClass(
                                severity
                              )}`}
                            >
                              {severity}
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            {actions?.triaged && (
                              <span className="px-2 py-0.5 text-[10px] rounded-md border bg-yellow-500/15 text-yellow-200 border-yellow-500/30">
                                Triaged
                              </span>
                            )}
                            {actions?.escalated && (
                              <span className="px-2 py-0.5 text-[10px] rounded-md border bg-orange-500/15 text-orange-200 border-orange-500/30">
                                Escalated
                              </span>
                            )}
                            {actions?.closed && (
                              <span className="px-2 py-0.5 text-[10px] rounded-md border bg-green-500/15 text-green-200 border-green-500/30">
                                Closed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          Investigation workflow actions
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {severity && (
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded-md font-medium border ${severityBadgeClass(
                              severity
                            )}`}
                            title={`Severity: ${severity}`}
                          >
                            {String(severity).slice(0, 4).toUpperCase()}
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 text-center" title={title}>
                          {title ? "Details" : "Drawer"}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCollapsed((v) => !v)}
                      className="px-2 py-1 text-xs rounded-lg bg-slate-800/40 text-slate-200 border border-slate-700 hover:bg-slate-700/40 transition"
                      aria-label={isCollapsed ? "Expand drawer" : "Collapse drawer"}
                      title={isCollapsed ? "Expand" : "Collapse"}
                    >
                      {isCollapsed ? "⟫" : "⟪"}
                    </button>

                    <button
                      onClick={onClose}
                      className="text-slate-400 hover:text-white text-xl leading-none"
                      aria-label="Close drawer"
                      title="Close (Esc)"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={onTriage}
                      className="px-3 py-1 text-xs rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition"
                    >
                      Triage
                    </button>

                    <button
                      onClick={onCloseAlert}
                      className="px-3 py-1 text-xs rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition"
                    >
                      Close
                    </button>

                    <button
                      onClick={onEscalate}
                      className="px-3 py-1 text-xs rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition"
                    >
                      Escalate
                    </button>

                    <button
                      onClick={onCreateCase}
                      className="px-3 py-1 text-xs rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition"
                    >
                      Create Case
                    </button>

                    <button
                      onClick={handleCopyIocs}
                      className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                      title="Copy extracted IOCs"
                    >
                      {copyState === "copied"
                        ? "Copied!"
                        : copyState === "failed"
                        ? "Copy failed"
                        : "Copy IOC"}
                    </button>
                  </div>
                )}
              </div>

              {!isCollapsed ? (
                <div className="flex-1 overflow-y-auto p-4">{children}</div>
              ) : (
                <div className="flex-1 p-3 flex flex-col gap-3 items-center justify-start">
                  <div className="w-full border border-slate-800 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-400">IPs</div>
                    <div className="text-sm text-white font-semibold">{iocs.ips.length}</div>
                  </div>

                  <div className="w-full border border-slate-800 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-400">Domains</div>
                    <div className="text-sm text-white font-semibold">{iocs.domains.length}</div>
                  </div>

                  <div className="w-full border border-slate-800 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-400">Hashes</div>
                    <div className="text-sm text-white font-semibold">{iocs.hashes.length}</div>
                  </div>

                  <button
                    onClick={handleCopyIocs}
                    className="w-full px-2 py-2 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                    title="Copy extracted IOCs"
                  >
                    {copyState === "copied"
                      ? "Copied!"
                      : copyState === "failed"
                      ? "Failed"
                      : "Copy"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
