import { useEffect, useMemo, useState } from "react";

const LS_KEY = "scriem.rightDrawer.collapsed";

/**
 * Extracts common IOCs from an alert-ish object.
 * - Uses direct known fields (ip, host, user)
 * - Also regex-scans the JSON for IPs/URLs/domains/hashes/emails
 */
function extractIocs(item) {
  if (!item || typeof item !== "object") {
    return {
      ips: [],
      hosts: [],
      users: [],
      urls: [],
      domains: [],
      hashes: [],
      emails: [],
    };
  }

  const add = (set, v) => {
    if (!v) return;
    const s = String(v).trim();
    if (!s) return;
    set.add(s);
  };

  const ips = new Set();
  const hosts = new Set();
  const users = new Set();
  const urls = new Set();
  const domains = new Set();
  const hashes = new Set();
  const emails = new Set();

  // Direct fields (based on your AlertDrawerContent.jsx)
  add(users, item.user);
  add(ips, item.ip);
  add(hosts, item.host);

  // Regex scan for extra IOCs inside raw JSON
  const raw = JSON.stringify(item);

  // IPv4 (simple + practical)
  const ipv4Re =
    /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;

  // URL
  const urlRe = /\bhttps?:\/\/[^\s"'}<>()]+\b/g;

  // Email
  const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

  // Hashes: MD5 (32), SHA1 (40), SHA256 (64)
  const hashRe = /\b[a-f0-9]{32}\b|\b[a-f0-9]{40}\b|\b[a-f0-9]{64}\b/gi;

  // Domain (best-effort; avoids matching URLs again)
  const domainRe =
    /\b(?!(?:https?:\/\/))(?:(?:[a-z0-9-]{1,63}\.)+(?:[a-z]{2,24}))\b/gi;

  for (const m of raw.match(ipv4Re) || []) add(ips, m);
  for (const m of raw.match(urlRe) || []) add(urls, m);
  for (const m of raw.match(emailRe) || []) add(emails, m);
  for (const m of raw.match(hashRe) || []) add(hashes, m);
  for (const m of raw.match(domainRe) || []) add(domains, m);

  return {
    ips: Array.from(ips),
    hosts: Array.from(hosts),
    users: Array.from(users),
    urls: Array.from(urls),
    domains: Array.from(domains),
    hashes: Array.from(hashes),
    emails: Array.from(emails),
  };
}

function buildIocCopyText(iocs) {
  const lines = ["# SCRIEM IOCs"];

  const section = (name, arr) => {
    if (!arr || arr.length === 0) return;
    lines.push(`${name}:`);
    for (const v of arr) lines.push(`- ${v}`);
    lines.push("");
  };

  section("IPs", iocs.ips);
  section("Hosts", iocs.hosts);
  section("Users", iocs.users);
  section("Emails", iocs.emails);
  section("URLs", iocs.urls);
  section("Domains", iocs.domains);
  section("Hashes", iocs.hashes);

  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
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

export default function RightDrawer({
  isOpen,
  onClose,
  title,
  severity,
  item, // pass selectedAlert/selectedItem here
  children,
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [copyState, setCopyState] = useState("idle"); // idle | copied | failed

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // ESC closes the drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Persist collapse preference
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, isCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  const severityBadgeClass = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s === "critical") return "bg-red-600/20 text-red-400 border-red-500/30";
    if (s === "high") return "bg-orange-600/20 text-orange-400 border-orange-500/30";
    if (s === "medium") return "bg-yellow-600/20 text-yellow-400 border-yellow-500/30";
    if (s === "low") return "bg-green-600/20 text-green-400 border-green-500/30";
    return "bg-slate-700/40 text-slate-300 border-slate-600/60";
  };

  const iocs = useMemo(() => extractIocs(item), [item]);

  const handleCopyIocs = async () => {
    const text = buildIocCopyText(iocs);
    const ok = await copyToClipboard(text);

    setCopyState(ok ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1200);
  };

  if (!isOpen) return null;

  const drawerWidth = isCollapsed ? 72 : 420;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 border-l border-slate-800 bg-slate-950/95 shadow-2xl"
        style={{ width: drawerWidth }}
        role="dialog"
        aria-label="Right drawer"
        aria-expanded={!isCollapsed}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-start justify-between gap-3">
              {/* Left: Title + Severity */}
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
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Actions & investigation tools
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
                    <div
                      className="text-[10px] text-slate-400 text-center"
                      title={title}
                    >
                      {title ? "Details" : "Drawer"}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Controls */}
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

            {/* Actions */}
            {!isCollapsed && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="px-3 py-1 text-xs rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition">
                  Triage
                </button>

                <button className="px-3 py-1 text-xs rounded-lg bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 transition">
                  Close
                </button>

                <button className="px-3 py-1 text-xs rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition">
                  Escalate
                </button>

                <button className="px-3 py-1 text-xs rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition">
                  Create Case
                </button>

                <button
                  onClick={handleCopyIocs}
                  className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                  title="Copy extracted IOCs to clipboard"
                  aria-label="Copy IOCs"
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

          {/* Content */}
          {!isCollapsed ? (
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          ) : (
            <div className="flex-1 p-3 flex flex-col gap-3 items-center justify-start">
              <div className="w-full border border-slate-800 rounded-lg p-2 text-center">
                <div className="text-[10px] text-slate-400">IPs</div>
                <div className="text-sm text-white font-semibold">
                  {iocs.ips.length}
                </div>
              </div>

              <div className="w-full border border-slate-800 rounded-lg p-2 text-center">
                <div className="text-[10px] text-slate-400">Domains</div>
                <div className="text-sm text-white font-semibold">
                  {iocs.domains.length}
                </div>
              </div>

              <div className="w-full border border-slate-800 rounded-lg p-2 text-center">
                <div className="text-[10px] text-slate-400">Hashes</div>
                <div className="text-sm text-white font-semibold">
                  {iocs.hashes.length}
                </div>
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
  );
}
