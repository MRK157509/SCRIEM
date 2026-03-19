import { useState } from "react";

import KpiCard from "../components/dashboard/KpiCard";
import LatestAlertsTable from "../components/dashboard/LatestAlertsTable";
import SystemHealthWidget from "../components/dashboard/SystemHealthWidget";
import TopEntitiesWidget from "../components/dashboard/TopEntitiesWidget";

import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";

function makeStableKey(alert) {
  return String(
    alert?.id ||
      alert?._id ||
      alert?.alert_id ||
      alert?.event_id ||
      alert?.key ||
      `${alert?.title || "untitled"}|${alert?.host || "nohost"}|${alert?.user || "nouser"}|${alert?.ip || "noip"}`
  );
}

export default function Dashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Production-safe empty state until live dashboard API is wired
  const kpis = [];
  const latestAlerts = [];
  const systemHealth = [];
  const topEntities = [];

  const openDrawerWithAlert = (alert) => {
    const stableKey = makeStableKey(alert);
    setSelectedAlert({ ...alert, __scriemKey: stableKey });
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-2xl font-semibold">SOC Dashboard</div>
          <div className="text-white/50 text-sm">Overview</div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="text-white/40">EPS:</span>
          <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/80 tabular-nums">
            --
          </span>
          <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/80">
            Live
          </span>
        </div>
      </div>

      {/* KPI cards / empty state */}
      {kpis.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {kpis.map((k, index) => (
            <KpiCard key={k.key || index} {...k} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
          No dashboard KPI data is available yet. Live dashboard metrics will appear here once the dashboard API is connected.
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <button className="h-10 px-4 rounded-xl bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition">
          Create Case
        </button>
        <button className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition">
          Export Report
        </button>
        <button className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition">
          View System Health
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          {latestAlerts.length > 0 ? (
            <LatestAlertsTable rows={latestAlerts} onRowClick={openDrawerWithAlert} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
              No alert data is available yet. Real alerts will appear here when detection rules are present and events trigger them.
            </div>
          )}
        </div>

        <div className="space-y-4">
          {systemHealth.length > 0 ? (
            <SystemHealthWidget items={systemHealth} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
              System health data is not connected yet.
            </div>
          )}

          {topEntities.length > 0 ? (
            <TopEntitiesWidget data={topEntities} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
              Top entities will appear here once live aggregation is wired.
            </div>
          )}
        </div>
      </div>

      {/* GLOBAL RIGHT DRAWER */}
      <RightDrawer
        isOpen={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        title={selectedAlert ? selectedAlert.title : "Alert Details"}
        severity={selectedAlert?.severity}
        item={selectedAlert}
      >
        <AlertDrawerContent alert={selectedAlert} />
      </RightDrawer>
    </div>
  );
}