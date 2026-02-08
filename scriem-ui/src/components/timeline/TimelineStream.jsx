import { useMemo, useState } from "react";
import { canSeeRaw, displayRuleName } from "../../lib/rbac";

function tsOf(item) {
  const v = item?.created_at || item?.timestamp || item?.ts || "";
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
}

function fmtTime(item) {
  const v = item?.created_at || item?.timestamp || item?.ts || "";
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function sevBadge(sev) {
  const s = String(sev || "").toLowerCase();
  if (s === "critical") return "bg-red-600/20 text-red-300 border-red-500/30";
  if (s === "high") return "bg-orange-600/20 text-orange-300 border-orange-500/30";
  if (s === "medium") return "bg-yellow-600/20 text-yellow-300 border-yellow-500/30";
  if (s === "low") return "bg-green-600/20 text-green-300 border-green-500/30";
  return "bg-slate-700/40 text-slate-200 border-slate-600/60";
}

function statusBadge(st) {
  const s = String(st || "").toUpperCase();
  if (s === "OPEN") return "bg-slate-700/40 text-slate-200 border-slate-600/60";
  if (s === "TRIAGED") return "bg-yellow-500/15 text-yellow-200 border-yellow-500/30";
  if (s === "ESCALATED") return "bg-orange-500/15 text-orange-200 border-orange-500/30";
  if (s === "CLOSED") return "bg-green-500/15 text-green-200 border-green-500/30";
  return "bg-slate-800/40 text-slate-300 border-slate-700/60";
}

// stable key comes from parent sometimes; fallback is safe enough for UI state
function keyOf(item) {
  return String(
    item?.__scriemKey ||
      item?.id ||
      item?.alert_id ||
      item?.event_id ||
      `${item?.title || item?.event_type || "item"}|${item?.host || ""}|${item?.user || ""}`
  );
}

export default function TimelineStream({
  alerts = [],
  events = [],
  onOpenItem,
  onPivot,
  onSelectItem,
  pinnedKeys,
  onTogglePin,
  selectedKey,
}) {
  const [expanded, setExpanded] = useState(() => new Set());

  const stream = useMemo(() => {
    const a = (alerts || []).map((x) => ({ kind: "alert", ...x }));
    const e = (events || []).map((x) => ({ kind: "event", ...x }));
    return [...a, ...e].sort((p, q) => tsOf(q) - tsOf(p));
  }, [alerts, events]);

  const toggleExpanded = (k) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  if (!stream.length) {
    return (
      <div className="text-white/50 text-sm border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
        No timeline items match this query.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stream.map((item) => {
        const k = keyOf(item);
        const isAlert = item.kind === "alert";
        const isSelected = String(selectedKey || "") === String(k);
        const isPinned = pinnedKeys?.has?.(k);

        const title = isAlert
          ? item.title || "Alert"
          : `${item.event_type || "Event"} • ${item.action || "action"}`;

        const sev = isAlert ? item.severity : item.severity || "";
        const st = isAlert ? item.status : item.status || "";

        const showRaw = canSeeRaw(); // ✅ only ADMIN

        return (
          <div
            key={k}
            className={[
              "border rounded-2xl bg-slate-950/40",
              isSelected ? "border-cyan-500/30 ring-1 ring-cyan-500/20" : "border-slate-800",
            ].join(" ")}
          >
            <div className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-white text-lg font-semibold truncate">{title}</div>

                  {sev ? (
                    <span className={`px-2 py-0.5 text-xs rounded-md border ${sevBadge(sev)}`}>
                      {String(sev).toUpperCase()}
                    </span>
                  ) : null}

                  {st ? (
                    <span className={`px-2 py-0.5 text-xs rounded-md border ${statusBadge(st)}`}>
                      {String(st).toUpperCase()}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 text-white/60 text-sm">
                  {(sev ? `${String(sev).toUpperCase()} · ` : "")}
                  {(st ? `${String(st).toUpperCase()} · ` : "")}
                  {item.host ? `${item.host} · ` : ""}
                  {fmtTime(item)}
                </div>

                {isAlert && item.description ? (
                  <div className="mt-2 text-white/80 text-sm">{item.description}</div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.host ? (
                    <button
                      onClick={() => onPivot?.(`host:${item.host}`)}
                      className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    >
                      Pivot host:{item.host}
                    </button>
                  ) : null}

                  {isAlert && item.severity ? (
                    <button
                      onClick={() => onPivot?.(`severity:${item.severity}`)}
                      className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    >
                      Pivot severity:{item.severity}
                    </button>
                  ) : null}

                  {isAlert && item.status ? (
                    <button
                      onClick={() => onPivot?.(`status:${item.status}`)}
                      className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    >
                      Pivot status:{item.status}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-2">
                <button
                  onClick={() => onOpenItem?.(item)}
                  className="px-4 py-1.5 text-xs rounded-lg border border-slate-600 bg-slate-700/30 text-slate-200 hover:bg-slate-600/40 transition"
                >
                  Open
                </button>

                <button
                  onClick={() => onSelectItem?.(item, k)}
                  className="px-4 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-900/30 text-slate-200 hover:bg-slate-800/40 transition"
                >
                  Focus
                </button>

                <button
                  onClick={() => onTogglePin?.(item, k)}
                  className={[
                    "px-4 py-1.5 text-xs rounded-lg border transition",
                    isPinned
                      ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/30 hover:bg-cyan-500/20"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10",
                  ].join(" ")}
                >
                  {isPinned ? "Unpin" : "Pin"}
                </button>

                <button
                  onClick={() => toggleExpanded(k)}
                  className="px-4 py-1.5 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                >
                  {expanded.has(k) ? "Collapse" : "Expand"}
                </button>
              </div>
            </div>

            {expanded.has(k) && (
              <div className="px-4 pb-4">
                {/* ✅ Mask rule name for non-admin */}
                {isAlert ? (
                  <div className="text-xs text-white/50 mb-2">
                    Rule: <span className="text-white/80">{displayRuleName(item) || "—"}</span>
                  </div>
                ) : null}

                {/* ✅ Raw details: ADMIN only */}
                {showRaw ? (
                  <div className="border border-slate-800 rounded-xl bg-black/30 p-3">
                    <div className="text-white/70 text-xs mb-2">Raw details</div>
                    <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-xl bg-black/20 p-3">
                    <div className="text-white/60 text-xs">
                      Raw details hidden (ADMIN only).
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
