'use client';
import { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, User, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { forensicsAPI } from '@/lib/api';

const RISK_COLOR = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
  HIGH:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
  MEDIUM:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
  LOW:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('ALL');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await forensicsAPI.getIdentityHistory(200);
      // data may be array directly or wrapped
      const rows = Array.isArray(data) ? data : (data?.data ?? []);
      setHistory([...rows].reverse());
    } catch (e) {
      console.error('History fetch error:', e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = history.filter((r) => {
    const matchSearch = !search || r.user_id?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || r.risk_level === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total:    history.length,
    anomalies:history.filter((r) => r.is_anomaly).length,
    critical: history.filter((r) => r.risk_level === 'CRITICAL').length,
    high:     history.filter((r) => r.risk_level === 'HIGH').length,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Identity Analysis History" subtitle="Digital Identity Ledger · Behaviour Audit Trail" />
      <div className="flex-1 p-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Analyses', value: stats.total,    icon: History,       color: 'text-cyan-400' },
            { label: 'Anomalies',      value: stats.anomalies, icon: AlertTriangle, color: 'text-red-400'  },
            { label: 'Critical Risk',  value: stats.critical,  icon: Shield,        color: 'text-red-400'  },
            { label: 'High Risk',      value: stats.high,      icon: User,          color: 'text-orange-400'},
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{loading ? '…' : value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search by User ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          {['ALL','LOW','MEDIUM','HIGH','CRITICAL'].map((lv) => (
            <button key={lv} onClick={() => setFilter(lv)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filter === lv ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'border-slate-700/60 text-slate-500 hover:text-slate-300'
              }`}>{lv}</button>
          ))}
          <button onClick={fetchHistory} disabled={loading} className="btn-ghost flex items-center gap-1.5 text-xs ml-auto">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['User ID','Risk Level','Anomaly','Score','Factors','Timestamp'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800/60 animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-600 text-sm">
                      No records found. Run an identity analysis first.
                    </td>
                  </tr>
                ) : filtered.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{r.user_id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${RISK_COLOR[r.risk_level] ?? 'text-slate-400'}`}>
                        {r.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.is_anomaly
                        ? <AlertTriangle className="w-4 h-4 text-red-400" />
                        : <CheckCircle  className="w-4 h-4 text-emerald-400" />}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {(r.anomaly_score * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                      {(r.contributing_factors ?? []).join('; ') || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                      {r.timestamp ? new Date(r.timestamp).toLocaleString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

