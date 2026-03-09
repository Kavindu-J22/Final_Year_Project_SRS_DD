'use client';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldCheck, Activity } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import MetricsGrid from '@/components/dashboard/MetricsGrid';
import ForensicTimeline from '@/components/dashboard/ForensicTimeline';
import ThreatActivityChart from '@/components/dashboard/ThreatActivityChart';
import { dashboardAPI } from '@/lib/api';

export default function DashboardPage() {
  const [stats,     setStats]     = useState(null);
  const [recent,    setRecent]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshed, setRefreshed] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, recentRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecent(),
      ]);
      setStats(statsRes.data.data);
      setRecent(recentRes.data.data);
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
            <ForensicTimeline data={charts.logsOverTime} />
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
                      {loading ? '—' : (log?.sourceIp ?? 'N/A')}
                    </p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    log?.isAnomaly
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {loading ? '…' : (log?.isAnomaly ? 'ANOMALY' : log?.action ?? '—')}
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

