import { useMemo, useState } from "react";

function tsOf(item) {
  const raw =
    item?.created_at ||
    item?.timestamp ||
    item?.ts ||
    item?.time ||
    item?.date ||
    null;

  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function kindOf(item) {
  if (item?.title || item?.severity || item?.status) return "alert";
  return "event";
}

function badgeClass(sevOrKind) {
  const s = String(sevOrKind || "").toLowerCase();
  if (s === "critical") return "bg-red-600/20 text-red-300 border-red-500/30";
  if (s === "high") return "bg-orange-600/20 text-orange-300 border-orange-500/30";
  if (s === "medium") return "bg-yellow-600/20 text-yellow-200 border-yellow-500/30";
  if (s === "low") return "bg-green-600/20 text-green-200 border-green-500/30";

  if (s === "alert") return "bg-cyan-600/15 text-cyan-200 border-cyan-500/25";
  return "bg-slate-700/40 text-slate-200 border-slate-600/60";
}

function icon(kind, severity) {
  const k = String(kind || "").toLowerCase();
  const s = String(severity || "").toLowerCase();

  if (k === "alert") {
    if (s === "critical") return "⛔";
    if (s === "high") return "⚠️";
    if (s === "medium") return "🟡";
    if (s === "low") return "🟢";
    return "🔔";
  }
  return "🧾";
}

// IOC highlighting
function highlightIOCs(text) {
  if (!text) return null;
  const s = String(text);

  const patterns = [
    { re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, type: "ip" },
    { re: /\b[a-fA-F0-9]{64}\b/g, type: "hash" },
    { re: /\b[a-fA-F0-9]{32}\b/g, type: "hash" },
    { re: /\b[a-zA-Z0-9-]+\.(?:com|net|org|io|in|co|dev|app)\b/g, type: "domain" },
  ];

  let parts = [s];
  patterns.forEach(({ re, type }) => {
    const next = [];
    parts.forEach((p) => {
      if (typeof p !== "string") return next.push(p);

      let lastIndex = 0;
      for (const m of p.matchAll(re)) {
        const idx = m.index ?? -1;
        if (idx < 0) continue;

        if (idx > lastIndex) next.push(p.slice(lastIndex, idx));

        const token = m[0];
        next.push({ token, type });
        lastIndex = idx + token.length;
      }
      if (lastIndex < p.length) next.push(p.slice(lastIndex));
    });
    parts = next;
  });

  return parts.map((p, i) => {
    if (typeof p === "string") return <span key={i}>{p}</span>;

    const cls =
      p.type === "ip"
        ? "px-1 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-500/20"
        : p.type === "hash"
        ? "px-1 rounded bg-purple-500/15 text-purple-200 border border-purple-500/20"
        : "px-1 rounded bg-amber-500/15 text-amber-200 border border-amber-500/20";

    return (
      <span key={i} className={cls}>
        {p.token}
      </span>
    );
  });
}

function fmtTime(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString();
}

// Stable-ish item key (for pinning/selection)
function itemKey(it) {
  const kind = it?.__kind || kindOf(it);
  return String(
    `${kind}|${it?.id ?? it?.event_id ?? ""}|${it?.host ?? ""}|${
      it?.title ?? it?.event_type ?? ""
    }|${it?.created_at ?? it?.timestamp ?? ""}`
  );
}

export default function TimelineStream({
  alerts = [],
  events = [],
  onOpenItem,
  onPivot,
  onSelectItem,
  pinnedKeys = new Set(),
  onTogglePin,
  selectedKey = "",
}) {
  const [expanded, setExpanded] = useState(() => new Set());

  const items = useMemo(() => {
    const merged = [...(alerts || []), ...(events || [])].map((x) => ({
      ...x,
      __kind: kindOf(x),
      __ts: tsOf(x),
    }));

    merged.sort((a, b) => (b.__ts || 0) - (a.__ts || 0));
    return merged;
  }, [alerts, events]);

  const toggleExpand = (k) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  if (!items.length) {
    return (
      <div className="border border-slate-800 rounded-xl p-6 text-white/60">
        No timeline items.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const key = itemKey(it);
        const isOpen = expanded.has(key);
        const isPinned = pinnedKeys.has(key);
        const isSelected = selectedKey && selectedKey === key;

        const kind = it.__kind;
        const title =
          kind === "alert"
            ? it.title || "Alert"
            : `${it.event_type || "Event"} • ${it.action || "action"}`;

        const subtitle =
          kind === "alert"
            ? `${it.severity || "—"} • ${it.status || "—"} • ${it.host || "—"}`
            : `${it.host || "—"} • ${it.user || "—"}`;

        return (
          <div
            key={key}
            className={`border rounded-xl overflow-hidden ${
              isSelected
                ? "border-cyan-500/40 bg-cyan-500/5"
                : "border-slate-800 bg-slate-950/40"
            }`}
          >
            <div className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon(kind, it.severity)}</span>

                  <div className="text-white font-medium truncate">{title}</div>

                  <span
                    className={`px-2 py-0.5 text-xs rounded-md font-medium border ${badgeClass(
                      kind === "alert" ? it.severity : kind
                    )}`}
                  >
                    {kind === "alert" ? (it.severity || "ALERT") : "EVENT"}
                  </span>

                  {isPinned && (
                    <span className="px-2 py-0.5 text-xs rounded-md font-medium border bg-white/5 text-white/70 border-white/10">
                      📌 Pinned
                    </span>
                  )}
                </div>

                <div className="text-xs text-white/50 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                  <span>{subtitle}</span>
                  <span className="text-white/30">•</span>
                  <span>{fmtTime(it.__ts)}</span>
                </div>

                <div className="text-sm text-white/70 mt-2">
                  {kind === "alert"
                    ? highlightIOCs(it.description || "")
                    : highlightIOCs(it.details ? JSON.stringify(it.details) : "")}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {it.host && (
                    <button
                      onClick={() => onPivot?.(`host:${it.host}`)}
                      className="px-2 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                    >
                      Pivot host:{it.host}
                    </button>
                  )}

                  {it.user && (
                    <button
                      onClick={() => onPivot?.(`user:${it.user}`)}
                      className="px-2 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                    >
                      Pivot user:{it.user}
                    </button>
                  )}

                  {kind === "alert" && it.severity && (
                    <button
                      onClick={() => onPivot?.(`severity:${it.severity}`)}
                      className="px-2 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                    >
                      Pivot severity:{it.severity}
                    </button>
                  )}

                  {kind === "alert" && it.status && (
                    <button
                      onClick={() => onPivot?.(`status:${it.status}`)}
                      className="px-2 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                    >
                      Pivot status:{it.status}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => onOpenItem?.(it)}
                  className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                >
                  Open
                </button>

                <button
                  onClick={() => onSelectItem?.(it, key)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                  title="Focus this item in Investigation Mode"
                >
                  Focus
                </button>

                <button
                  onClick={() => onTogglePin?.(it, key)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                  title="Pin this item to your case notes"
                >
                  {isPinned ? "Unpin" : "Pin"}
                </button>

                <button
                  onClick={() => toggleExpand(key)}
                  className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  {isOpen ? "Collapse" : "Expand"}
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="px-4 pb-4">
                <div className="mt-2 border border-slate-800 rounded-lg bg-black/20 p-3">
                  <div className="text-xs text-white/60 mb-2">Raw details</div>
                  <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
                    {JSON.stringify(it, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
