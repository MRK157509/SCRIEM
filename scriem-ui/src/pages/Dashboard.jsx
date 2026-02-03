import { kpis, latestAlerts, systemHealth, topEntities } from "../data/dashboardmock";
import KpiCard from "../components/dashboard/KpiCard";
import LatestAlertsTable from "../components/dashboard/LatestAlertsTable";
import SystemHealthWidget from "../components/dashboard/SystemHealthWidget";
import TopEntitiesWidget from "../components/dashboard/TopEntitiesWidget";

export default function Dashboard() {
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
            1,890
          </span>
          <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white/80">
            30s
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.key} {...k} />
        ))}
      </div>

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
          <LatestAlertsTable rows={latestAlerts} />
        </div>

        <div className="space-y-4">
          <SystemHealthWidget items={systemHealth} />
          <TopEntitiesWidget data={topEntities} />
        </div>
      </div>
    </div>
  );
}
