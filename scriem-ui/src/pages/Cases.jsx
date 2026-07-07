import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";

import { createCase, getCases, updateCaseNotes } from "../lib/cases";
import { canCopyEvidenceJson } from "../lib/rbac";
import { fetchAlerts } from "../lib/api";

function badgeClasses(type, value) {
  const v = String(value || "").toUpperCase();

  if (type === "severity") {
    if (v === "CRITICAL") return "bg-red-500/20 text-red-200 ring-1 ring-red-500/30";
    if (v === "HIGH") return "bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/30";
    if (v === "MEDIUM") return "bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-500/30";
    if (v === "LOW") return "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30";
    return "bg-white/10 text-white/70 ring-1 ring-white/10";
  }

  if (v === "OPEN") return "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30";
  if (v === "TRIAGED") return "bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/30";
  if (v === "ESCALATED") return "bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/30";
  if (v === "CLOSED") return "bg-slate-500/20 text-slate-200 ring-1 ring-slate-500/30";
  return "bg-white/10 text-white/70 ring-1 ring-white/10";
}

function safeUpper(x) {
  return String(x || "").toUpperCase();
}

function itemKind(it) {
  return it?.kind || (it?.title ? "alert" : "event");
}

function itemTitle(it) {
  return it?.title || it?.event_type || "Item";
}

function itemLabel(it) {
  const kind = itemKind(it);
  const title = itemTitle(it);
  const host = it?.host ? ` • ${it.host}` : "";
  const user = it?.user ? ` • ${it.user}` : "";
  return `${kind === "alert" ? "🔔" : "🧾"} ${title}${host}${user}`;
}

function buildTimelineQueryFromItem(it) {
  const parts = [];
  if (it?.host) parts.push(`host:${it.host}`);
  if (it?.user) parts.push(`user:${it.user}`);
  if (it?.severity) parts.push(`severity:${it.severity}`);
  if (it?.status) parts.push(`status:${it.status}`);
  if (parts.length === 0) parts.push(itemTitle(it));
  return parts.join(" ").trim();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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

function makeStableKey(item) {
  return String(
    item?.__scriemKey ||
      item?.id ||
      item?._id ||
      item?.alert_id ||
      item?.event_id ||
      `${item?.title || item?.event_type || "untitled"}|${item?.host || "nohost"}|${item?.user || "nouser"}|${
        item?.created_at || item?.timestamp || ""
      }`
  );
}

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function Cases() {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return cases.find((c) => String(c.id) === String(selectedId)) || null;
  }, [cases, selectedId]);

  async function refreshCases(preferredId = "") {
    const list = await getCases();
    setCases(list);

    const nextSelected = preferredId || selectedId || list[0]?.id || "";
    setSelectedId(nextSelected ? String(nextSelected) : "");
    return list;
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const list = await getCases();
        if (cancelled) return;
        setCases(list);
        setSelectedId(list[0]?.id ? String(list[0].id) : "");
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setNotesDraft("");
      return;
    }
    setNotesDraft(selected.notes || "");
  }, [selected]);

  useEffect(() => {
    if (cases.length > 0) return;
    const hasMigrated = localStorage.getItem("scriem:cases:migrated:v1") === "1";
    const legacyCases = safeParse(localStorage.getItem("scriem:cases:v1"), []);
    if (!hasMigrated && Array.isArray(legacyCases) && legacyCases.length > 0) {
      let cancelled = false;

      async function migrateLegacyCases() {
        try {
          const created = [];
          for (const legacy of legacyCases) {
            const row = await createCase({
              id: legacy.id,
              title: legacy.title || "Investigation",
              description: legacy.description || "",
              severity: legacy.severity || "MEDIUM",
              status: legacy.status || "OPEN",
              notes: legacy.notes || "",
              items: legacy.items || [],
              timeline: legacy.timeline || [],
            });
            created.push(row);
          }

          if (cancelled) return;
          localStorage.setItem("scriem:cases:migrated:v1", "1");
          await refreshCases(created[0]?.id || "");
        } catch (err) {
          console.error("Legacy case migration failed:", err);
        }
      }

      migrateLegacyCases();
      return () => {
        cancelled = true;
      };
    }

    const hasSeeded = localStorage.getItem("scriem:cases:seeded:v1") === "1";
    if (hasSeeded) return;

    let cancelled = false;

    async function seedStarterCase() {
      try {
        const alerts = await fetchAlerts();
        const rows = Array.isArray(alerts) ? alerts : alerts?.alerts || [];
        const items = rows.slice(0, 3);
        if (cancelled || !items.length) return;

        const created = await createCase({
          title: "Starter Investigation",
          description: "Auto-seeded from live alerts so the case workspace has a starting point.",
          severity: items[0]?.severity || "MEDIUM",
          status: "OPEN",
          items,
        });

        localStorage.setItem("scriem:cases:seeded:v1", "1");
        await refreshCases(created?.id);
      } catch (err) {
        console.error(err);
      }
    }

    seedStarterCase();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases.length]);

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;

    return cases.filter((c) => {
      const hay = [
        c.id,
        c.title,
        c.description,
        c.status,
        c.severity,
        String((c.items || []).length),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [cases, search]);

  function openDrawerForItem(it) {
    const stableKey = makeStableKey(it);
    setSelectedItem({ ...it, __scriemKey: stableKey });
    setDrawerOpen(true);
  }

  function pivotToTimeline(it) {
    const q = buildTimelineQueryFromItem(it);
    navigate(`/timeline?q=${encodeURIComponent(q)}`);
  }

  async function copyItemJson(it) {
    const payload = {
      kind: itemKind(it),
      title: itemTitle(it),
      host: it?.host || "",
      user: it?.user || "",
      severity: it?.severity || "",
      status: it?.status || "",
      snapshot: it,
    };

    const ok = await copyToClipboard(JSON.stringify(payload, null, 2));
    if (!ok) alert("Could not copy to clipboard.");
    else alert("✅ Evidence JSON copied");
  }

  async function saveNotes() {
    if (!selectedId) return;
    try {
      const updated = await updateCaseNotes(selectedId, notesDraft);
      setCases((prev) => prev.map((c) => (String(c.id) === String(updated.id) ? updated : c)));
      alert("✅ Notes saved");
    } catch (err) {
      alert(err?.message || "Unable to save notes");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white text-2xl font-semibold">Cases</div>
          <div className="text-white/50 text-sm">
            Investigation workspace • queue on the left, details on the right
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshCases(selectedId)}
            className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
        <div className="xl:col-span-1 border border-slate-800 rounded-2xl bg-slate-950/40 overflow-hidden">
          <div className="p-3 border-b border-slate-800">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cases (title, id, status, severity)…"
              className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-5 text-white/50 text-sm">Loading cases...</div>
            ) : filteredCases.length === 0 ? (
              <div className="p-5 text-white/50 text-sm">No cases found.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredCases.map((c) => {
                  const active = String(c.id) === String(selectedId);
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(String(c.id))}
                      className={`w-full text-left p-4 transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">{c.title}</div>
                          <div className="text-xs text-white/50 mt-1">
                            {c.id} • {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`text-[11px] px-2 py-1 rounded-lg ${badgeClasses("status", c.status)}`}
                          >
                            {safeUpper(c.status || "—")}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-1 rounded-lg ${badgeClasses("severity", c.severity)}`}
                          >
                            {safeUpper(c.severity || "—")}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                        <span>
                          Items: <span className="text-white/90">{(c.items || []).length}</span>
                        </span>
                        <span className="text-white/50">
                          Updated:{" "}
                          {c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString() : "—"}
                        </span>
                      </div>

                      {c.description ? (
                        <div className="mt-2 text-sm text-white/60 line-clamp-2">
                          {c.description}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {!selected ? (
            <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 text-white/50">
              No case selected.
            </div>
          ) : (
            <>
              <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white text-xl font-semibold truncate">
                      {selected.title}
                    </div>
                    <div className="text-white/50 text-sm mt-1">
                      {selected.id} • Created{" "}
                      {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-lg ${badgeClasses("status", selected.status)}`}
                    >
                      {safeUpper(selected.status || "—")}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-lg ${badgeClasses("severity", selected.severity)}`}
                    >
                      {safeUpper(selected.severity || "—")}
                    </span>

                    <button
                      onClick={() => navigate(`/cases/${selected.id}`)}
                      className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                      title="Open dedicated case page"
                    >
                      Open
                    </button>
                  </div>
                </div>

                {selected.description ? (
                  <div className="mt-3 text-white/70 text-sm whitespace-pre-wrap">
                    {selected.description}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-semibold">
                      Evidence ({(selected.items || []).length})
                    </div>
                    <div className="text-xs text-white/50">pin-style actions</div>
                  </div>

                  {(selected.items || []).length === 0 ? (
                    <div className="text-white/50 text-sm">
                      No evidence in this case yet. Create a case from Timeline pins.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                      {(selected.items || []).map((it, idx) => (
                        <div
                          key={it.__scriemKey || idx}
                          className="border border-slate-800 rounded-xl bg-black/20 p-3"
                        >
                          <div className="text-sm text-white/90">{itemLabel(it)}</div>
                          <div className="text-xs text-white/50 mt-1">
                            {it.severity ? `severity: ${it.severity}` : "severity: —"}
                            {it.status ? ` • status: ${it.status}` : ""}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => openDrawerForItem(it)}
                              className="px-3 py-1 text-xs rounded-lg bg-slate-700/40 text-slate-200 border border-slate-600 hover:bg-slate-600/40 transition"
                            >
                              Open
                            </button>

                            <button
                              onClick={() => pivotToTimeline(it)}
                              className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                            >
                              Pivot to Timeline
                            </button>

                            {canCopyEvidenceJson() && (
                              <button
                                onClick={() => copyItemJson(it)}
                                className="px-3 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 transition"
                              >
                                Copy JSON
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-semibold">Investigation Notes</div>
                    <button
                      onClick={saveNotes}
                      className="h-9 px-3 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition text-sm"
                    >
                      Save
                    </button>
                  </div>

                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Write findings, IOCs, hypotheses, next steps…"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white/85 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    rows={12}
                  />

                  <div className="mt-2 text-xs text-white/50">
                    Tip: the notes are saved to the backend now, so refreshes won’t wipe them.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <RightDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem?.title || selectedItem?.event_type || "Item"}
        severity={selectedItem?.severity}
        item={selectedItem}
        showMini={false}
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
