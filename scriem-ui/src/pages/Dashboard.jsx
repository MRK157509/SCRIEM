import { useEffect, useState } from "react";

import KpiCard from "../components/dashboard/KpiCard";
import LatestAlertsTable from "../components/dashboard/LatestAlertsTable";
import SystemHealthWidget from "../components/dashboard/SystemHealthWidget";
import TopEntitiesWidget from "../components/dashboard/TopEntitiesWidget";

import RightDrawer from "../components/drawer/RightDrawer";
import AlertDrawerContent from "../components/drawer/AlertDrawerContent";
import { fetchAlerts, fetchMetricsSummary } from "../lib/api";

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
  const [summary, setSummary] = useState(null);
  const [latestAlerts, setLatestAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [metrics, alerts] = await Promise.all([
          fetchMetricsSummary(),
          fetchAlerts(),
        ]);

        if (cancelled) return;

        setSummary(metrics || null);
        setLatestAlerts(Array.isArray(alerts) ? alerts.slice(0, 10) : alerts?.slice?.(0, 10) || []);
      } catch {
        if (cancelled) return;
        setSummary(null);
        setLatestAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = summary
    ? [
        { label: "Total alerts", value: summary.counts?.alerts_total ?? 0, delta: "all time", tone: "red" },
        { label: "Events", value: summary.counts?.events_total ?? 0, delta: "ingested", tone: "cyan" },
        { label: "IOC hits", value: summary.counts?.iocs_total ?? 0, delta: "observed", tone: "amber" },
        { label: "Last 24h", value: summary.last_24h?.alerts_created ?? 0, delta: "alerts", tone: "blue" },
        { label: "Rules", value: summary.top?.rules?.length ?? 0, delta: "active detections", tone: "cyan" },
      ]
    : [];

  const systemHealth = summary
    ? [
        { label: "Backend", value: "Healthy", tone: "green" },
        { label: "Auth", value: "Ready", tone: "cyan" },
        { label: "Ingest", value: "Active", tone: "amber" },
      ]
    : [];

  const topEntities = summary
    ? {
        hosts: (summary.top?.hosts || []).map((h) => ({ name: h.host, count: h.alerts })),
        users: [],
        rules: (summary.top?.rules || []).map((r) => ({
          name: r.rule_name || r.rule_id || "Rule",
          count: r.alerts,
        })),
      }
    : { hosts: [], users: [], rules: [] };

  const openDrawerWithAlert = (alert) => {
    const stableKey = makeStableKey(alert);
    setSelectedAlert({ ...alert, __scriemKey: stableKey });
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/70 p-6 sm:p-8 shadow-[0_24px_120px_rgba(0,0,0,0.24)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-100 text-[11px] uppercase tracking-[0.28em]">
              SOC Dashboard
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              A live command surface for triage, investigation, and escalation.
            </h1>
            <p className="mt-3 text-white/60 max-w-2xl leading-7">
              Monitor the alert stream, inspect key entities, and jump directly into cases or the
              timeline with one click.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
            <span className="px-3 py-2 rounded-2xl border border-white/10 bg-white/5 text-white/80 tabular-nums">
              EPS --
            </span>
            <span className="px-3 py-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-100">
              Live
            </span>
            <span className="px-3 py-2 rounded-2xl border border-white/10 bg-white/5 text-white/70">
              Investigation ready
            </span>
          </div>
        </div>
      </section>

      {kpis.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {kpis.map((k, index) => (
            <KpiCard key={k.key || index} {...k} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Alert volume", value: "Ready", delta: "connect metrics API", tone: "cyan" },
            { label: "Cases", value: "Pinned", delta: "local workspace active", tone: "blue" },
            { label: "AI", value: "Enabled", delta: "reanalyze per alert", tone: "amber" },
          ].map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="h-10 px-4 rounded-2xl bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 transition">
          Create Case
        </button>
        <button className="h-10 px-4 rounded-2xl border border-white/10 bg-white/5 text-white/72 hover:bg-white/10 hover:text-white transition">
          Export Report
        </button>
        <button className="h-10 px-4 rounded-2xl border border-white/10 bg-white/5 text-white/72 hover:bg-white/10 hover:text-white transition">
          View System Health
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          {latestAlerts.length > 0 ? (
            <LatestAlertsTable rows={latestAlerts} onRowClick={openDrawerWithAlert} />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <div className="text-white font-semibold">Latest alerts</div>
              <div className="mt-2 text-sm text-white/60">
                {loading
                  ? "Loading live data..."
                  : "No alert data is available yet. Seed events and detection rules to populate this queue."}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {systemHealth.length > 0 ? (
            <SystemHealthWidget items={systemHealth} />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <div className="text-white font-semibold">System Health</div>
              <div className="mt-2 text-sm text-white/60">
                Health signals will show once live aggregation is wired.
              </div>
            </div>
          )}

          {topEntities.hosts.length > 0 || topEntities.rules.length > 0 ? (
            <TopEntitiesWidget data={topEntities} />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <div className="text-white font-semibold">Top Entities</div>
              <div className="mt-2 text-sm text-white/60">
                Host, user, and rule leaderboards will appear here from backend analytics.
              </div>
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
