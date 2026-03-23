'use client';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldCheck, Activity, CheckCircle, XCircle, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import MetricsGrid from '@/components/dashboard/MetricsGrid';
import ForensicTimeline from '@/components/dashboard/ForensicTimeline';
import ThreatActivityChart from '@/components/dashboard/ThreatActivityChart';
import { dashboardAPI } from '@/lib/api';

const ML_SERVICES = [
  { key: 'identity_profiling',   label: 'Identity Profiling',   port: 8001, color: 'cyan' },
  { key: 'incident_detection',   label: 'Incident Detection',   port: 8002, color: 'amber' },
  { key: 'evidence_preservation',label: 'Evidence Preservation',port: 8003, color: 'purple' },
  { key: 'forensic_timeline',    label: 'Forensic Timeline',    port: 8004, color: 'emerald' },
];

export default function DashboardPage() {
  const [stats,     setStats]     = useState(null);
  const [recent,    setRecent]    = useState(null);
  const [mlHealth,  setMlHealth]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshed, setRefreshed] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, recentRes, healthRes] = await Promise.allSettled([
        dashboardAPI.getStats(),
        dashboardAPI.getRecent(),
        dashboardAPI.getMlHealth(),
      ]);
      if (statsRes.status  === 'fulfilled') setStats(statsRes.value.data.data);
      if (recentRes.status === 'fulfilled') setRecent(recentRes.value.data.data);
      if (healthRes.status === 'fulfilled') setMlHealth(healthRes.value.data);
      setRefreshed(new Date());
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const overview   = stats?.overview   ?? {};
  const charts     = stats?.charts     ?? {};
  const isDemo     = !stats;

  // Transform logsOverTime [{_id, total, anomalies}] → [{time, normal, attacks}] for the chart
  const logsChartData = charts.logsOverTime?.length
    ? charts.logsOverTime.map((d) => ({
        time:    d._id ?? '',
        normal:  Math.max(0, (d.total ?? 0) - (d.anomalies ?? 0)),
        attacks: d.anomalies ?? 0,
      }))
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        title="Security Dashboard"
        subtitle="Real-time cloud forensics overview"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 live-dot" />
            <span className="text-xs text-slate-400 font-mono">
              LIVE MONITORING
            </span>
            {refreshed && (
              <span className="text-xs text-slate-600 font-mono hidden sm:inline">
                · Last sync {refreshed.toLocaleTimeString('en-GB')}
              </span>
            )}
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* KPI Metrics */}
        <MetricsGrid data={overview} loading={loading} />

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ForensicTimeline data={logsChartData} />
          </div>
          <div>
            <ThreatActivityChart
              severityData={charts.severityBreakdown
                ? Object.entries(charts.severityBreakdown).map(([_id, count]) => ({ _id, count }))
                : null}
              riskData={charts.riskBreakdown
                ? Object.entries(charts.riskBreakdown).map(([_id, count]) => ({ _id, count }))
                : null}
              isDemo={isDemo}
            />
          </div>
        </div>

        {/* ML Service Health */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">ML Service Health</h3>
              {mlHealth?.allServicesOnline && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">ALL ONLINE</span>
              )}
            </div>
            <Link href="/system-test" className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors">
              Run Tests →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ML_SERVICES.map(({ key, label, port, color }) => {
              const svc = mlHealth?.services?.[key];
              const online = svc?.status === 'online';
              return (
                <div key={key} className={`p-3 rounded-lg border text-center ${
                  loading ? 'border-slate-800 bg-slate-900/40' :
                  online ? `bg-${color}-500/5 border-${color}-500/20` : 'bg-red-500/5 border-red-500/20'
                }`}>
                  {loading
                    ? <div className="w-5 h-5 mx-auto mb-2 rounded-full bg-slate-700 animate-pulse"/>
                    : online
                      ? <CheckCircle className={`w-5 h-5 mx-auto mb-2 text-${color}-400`}/>
                      : <XCircle    className="w-5 h-5 mx-auto mb-2 text-red-400"/>
                  }
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">{label}</p>
                  <p className="text-[9px] font-mono text-slate-600 mt-0.5">
                    :{port} · {loading ? '…' : (online ? 'ONLINE' : 'OFFLINE')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Logs */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recent Log Events</h3>
            </div>
            <div className="space-y-2">
              {(recent?.recentLogs ?? Array.from({ length: 5 })).map((log, i) => (
                <div key={log?._id ?? i}
                  className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      log?.isAnomaly ? 'bg-red-400' : 'bg-emerald-400'
                    } ${loading ? 'bg-slate-700' : ''}`} />
                    <p className="text-xs text-slate-300 truncate font-mono">
                      {loading ? '—' : (log?.ipAddress ?? 'N/A')}
                    </p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    log?.isAnomaly
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {loading ? '…' : (log?.isAnomaly ? 'ANOMALY' : log?.eventType ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recent Incidents</h3>
            </div>
            <div className="space-y-2">
              {(recent?.recentIncidents ?? Array.from({ length: 5 })).map((inc, i) => (
                <div key={inc?._id ?? i}
                  className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                  <p className="text-xs text-slate-300 truncate flex-1 min-w-0 mr-2">
                    {loading ? '—' : (inc?.title ?? 'Unnamed Incident')}
                  </p>
                  {inc?.severity && (
                    <span className={`badge-${inc.severity.toLowerCase()} flex-shrink-0`}>
                      {inc.severity}
                    </span>
                  )}
                </div>
              ))}
              {!loading && !recent?.recentIncidents?.length && (
                <p className="text-xs text-slate-600 py-4 text-center">No incidents recorded</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

