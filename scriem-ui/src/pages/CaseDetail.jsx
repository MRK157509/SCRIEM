// src/pages/CaseDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";

import { getCaseById, updateCaseNotes, addItemsToCase } from "../lib/cases";
import { canCopyEvidenceJson, canSeeRaw } from "../lib/rbac";

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function isAlert(item) {
  return !!item?.title;
}

function evidenceTitle(item) {
  if (!item) return "Evidence";
  if (isAlert(item)) return item.title || "Alert";
  return `${item.event_type || "Event"} • ${item.action || "action"}`;
}

function evidenceMeta(item) {
  const sev = item?.severity ? `severity: ${item.severity}` : "";
  const st = item?.status ? `status: ${item.status}` : "";
  const host = item?.host ? `host: ${item.host}` : "";
  return [sev, st, host].filter(Boolean).join(" • ");
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function CaseDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [caze, setCaze] = useState(null);
  const [selected, setSelected] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Load case
  useEffect(() => {
    const c = getCaseById(id);
    setCaze(c || null);
    setNotes(c?.notes || "");
    // default select first evidence
    const first = (c?.items || [])[0] || null;
    setSelected(first);
  }, [id]);

  const items = useMemo(() => caze?.items || [], [caze]);

  const openEvidence = (item) => {
    setDrawerItem(item);
    setDrawerOpen(true);
  };

  const pivotToTimeline = (item) => {
    // Keep it simple: host/user/sev/title search
    const q =
      item?.host ||
      item?.user ||
      item?.severity ||
      item?.title ||
      item?.event_type ||
      "";
    if (!q) return;
    nav(`/timeline?q=${encodeURIComponent(String(q))}`);
  };

  const handleCopyJson = async (item) => {
    // ✅ RBAC: only ADMIN can copy evidence JSON
    if (!canCopyEvidenceJson()) return;
    const ok = await copyToClipboard(JSON.stringify(item, null, 2));
    alert(ok ? "✅ Evidence JSON copied" : "❌ Copy failed");
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      updateCaseNotes(id, notes);
      // refresh local
      const c = getCaseById(id);
      setCaze(c || null);
    } finally {
      setSaving(false);
    }
  };

  if (!caze) {
    return (
      <div className="text-white/70">
        Case not found.{" "}
        <button
          className="underline text-cyan-300"
          onClick={() => nav("/cases")}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-semibold">{caze.title}</div>
          <div className="text-white/50 text-sm">
            {caze.id} • Created {caze.created_at || "—"}
          </div>
          {caze.description && (
            <div className="text-white/70 text-sm mt-2 whitespace-pre-line">
              {caze.description}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm">
            {caze.status || "OPEN"}
          </span>
          <span className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm">
            {caze.severity || "MEDIUM"}
          </span>
          <button
            onClick={() => nav("/cases")}
            className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            Back
          </button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Evidence list */}
        <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div className="text-white font-semibold">
              Evidence ({items.length})
            </div>
            <div className="text-xs text-white/40">pin-style actions</div>
          </div>

          <div className="mt-3 space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="text-white/50 text-sm">No evidence added.</div>
            ) : (
              items.map((it, idx) => {
                const active = selected === it;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelected(it)}
                    className={[
                      "w-full text-left p-3 rounded-xl border transition",
                      active
                        ? "border-cyan-500/40 bg-cyan-500/10"
                        : "border-slate-800 bg-black/20 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="text-white text-sm font-medium">
                      {isAlert(it) ? "🔔 " : "🧾 "}
                      {evidenceTitle(it)}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      {evidenceMeta(it) || "—"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Evidence actions + preview */}
        <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4 space-y-3">
          <div className="text-white font-semibold">Evidence</div>

          {!selected ? (
            <div className="text-white/50 text-sm">Select an item.</div>
          ) : (
            <>
              <div className="border border-slate-800 rounded-xl bg-black/20 p-3">
                <div className="text-white font-medium">
                  {evidenceTitle(selected)}
                </div>
                <div className="text-white/50 text-xs mt-1">
                  {evidenceMeta(selected) || "—"}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => openEvidence(selected)}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                  >
                    Open
                  </button>

                  <button
                    onClick={() => pivotToTimeline(selected)}
                    className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                  >
                    Pivot to Timeline
                  </button>

                  {/* ✅ RBAC: hide Copy JSON unless ADMIN */}
                  {canCopyEvidenceJson() && (
                    <button
                      onClick={() => handleCopyJson(selected)}
                      className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                    >
                      Copy JSON
                    </button>
                  )}
                </div>
              </div>

              {/* ✅ RBAC: raw block only for ADMIN */}
              {canSeeRaw() && (
                <div className="border border-slate-800 rounded-xl bg-black/20 p-3">
                  <div className="text-white/80 text-sm font-medium mb-2">
                    Raw details (ADMIN)
                  </div>
                  <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
                    {JSON.stringify(selected, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Notes */}
        <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div className="text-white font-semibold">Investigation Notes</div>
            <button
              onClick={saveNotes}
              disabled={saving}
              className={[
                "h-10 px-4 rounded-xl ring-1 transition",
                saving
                  ? "bg-slate-800/40 text-slate-400 ring-slate-700 cursor-not-allowed"
                  : "bg-cyan-500/20 text-cyan-200 ring-cyan-500/30 hover:bg-cyan-500/25",
              ].join(" ")}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write findings, IOCs, hypotheses, next steps..."
            className="mt-3 w-full min-h-[460px] px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-white/90 outline-none focus:border-slate-600 resize-y"
          />
        </div>
      </div>

      {/* Drawer */}
      <RightDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerItem?.title || drawerItem?.event_type || "Item"}
        severity={drawerItem?.severity}
        item={drawerItem}
      >
        {drawerItem && isAlert(drawerItem) ? (
          <AlertDrawerContent alert={drawerItem} />
        ) : (
          <>
            {/* ✅ RBAC: only ADMIN sees raw in drawer for non-alert */}
            {canSeeRaw() ? (
              <pre className="text-xs whitespace-pre-wrap break-words text-white/80">
                {JSON.stringify(drawerItem, null, 2)}
              </pre>
            ) : (
              <div className="text-white/60 text-sm">
                Details hidden for your role.
              </div>
            )}
          </>
        )}
      </RightDrawer>
    </div>
  );
}
