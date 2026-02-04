import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";

export default function Timeline() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [q, setQ] = useState(initialQ);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Demo timeline items (replace with your API fetch later)
  const [items, setItems] = useState(() => [
    {
      id: "evt-1",
      title: "Suspicious Login",
      severity: "high",
      status: "open",
      host: "host-01",
      user: "alice",
      ip: "10.0.0.5",
      ts: new Date().toISOString(),
      kind: "auth",
    },
    {
      id: "evt-2",
      title: "PowerShell Execution",
      severity: "medium",
      status: "open",
      host: "host-02",
      user: "bob",
      ip: "192.168.1.20",
      ts: new Date().toISOString(),
      kind: "endpoint",
    },
  ]);

  // Keep URL query param in sync with input (shareable pivots)
  useEffect(() => {
    const cur = searchParams.get("q") || "";
    if (cur !== q) setQ(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const query = (q || "").trim().toLowerCase();
    if (!query) return items;

    return items.filter((it) =>
      JSON.stringify(it).toLowerCase().includes(query)
    );
  }, [items, q]);

  const openDrawer = (item) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const onChangeQ = (next) => {
    setQ(next);
    const trimmed = (next || "").trim();
    if (!trimmed) {
      searchParams.delete("q");
      setSearchParams(searchParams, { replace: true });
      return;
    }
    setSearchParams({ q: trimmed }, { replace: true });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Timeline</h1>
          <div className="text-sm text-slate-400">
            Pivot search: try IP, user, host, hash, domain
          </div>
        </div>

        <input
          value={q}
          onChange={(e) => onChangeQ(e.target.value)}
          placeholder="Search Timeline (e.g., 10.0.0.5, alice, host-01)"
          className="w-[420px] max-w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white outline-none focus:border-slate-600"
        />
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-0 bg-slate-900/60 border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
          <div className="col-span-3">Time</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-2">Host</div>
          <div className="col-span-2">User/IP</div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm">
            No timeline items match: <span className="text-white/90">{q}</span>
          </div>
        ) : (
          filtered.map((it) => (
            <button
              key={it.id}
              onClick={() => openDrawer(it)}
              className="w-full text-left grid grid-cols-12 px-4 py-3 border-b border-slate-900 hover:bg-slate-900/40 transition"
            >
              <div className="col-span-3 text-xs text-slate-400">
                {it.ts || "-"}
              </div>
              <div className="col-span-5 text-white">{it.title}</div>
              <div className="col-span-2 text-slate-200">{it.host || "-"}</div>
              <div className="col-span-2 text-slate-300 text-sm">
                {(it.user || "-") + " / " + (it.ip || "-")}
              </div>
            </button>
          ))
        )}
      </div>

      {/* RIGHT DRAWER */}
      <RightDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem ? selectedItem.title : "Timeline Details"}
        severity={selectedItem?.severity}
        item={selectedItem}
      >
        <AlertDrawerContent alert={selectedItem} />
      </RightDrawer>
    </div>
  );
}
