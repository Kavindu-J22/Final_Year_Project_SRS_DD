'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Upload, ChevronLeft, ChevronRight, X, DatabaseZap } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import LogTable from '@/components/logs/LogTable';
import { logsAPI, systemAPI } from '@/lib/api';

const PAGE_SIZE = 20;

export default function LogsPage() {
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [seeding,    setSeeding]    = useState(false);
  const [seedMsg,    setSeedMsg]    = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [filters,    setFilters]    = useState({ search: '', riskLevel: '', anomalyOnly: false });

  const handleSeedDemo = async () => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const { data } = await systemAPI.seedDemo();
      setSeedMsg({ ok: true, text: `✓ ${data.logs.upserted + data.logs.modified} logs & ${data.incidents.upserted + data.incidents.modified} incidents loaded.` });
      fetchLogs();
    } catch (e) {
      setSeedMsg({ ok: false, text: `✗ Seed failed: ${e.response?.data?.message ?? e.message}` });
    } finally {
      setSeeding(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, limit: PAGE_SIZE,
        ...(filters.riskLevel    && { riskLevel:   filters.riskLevel }),
        ...(filters.anomalyOnly  && { isAnomaly:   true }),
        ...(filters.search       && { search:      filters.search }),
      };
      const { data } = await logsAPI.getAll(params);
      setLogs(data.data ?? []);
      setTotal(data.total ?? data.data?.length ?? 0);
    } catch { setLogs([]); }
    finally  { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Log Viewer" subtitle="DBSCAN anomaly detection & event analysis" />

      <div className="flex-1 p-6 space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="input-field pl-9"
              placeholder="Search IP, action, service…"
              value={filters.search}
              onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            />
          </div>

          {/* Risk filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              className="input-field pl-9 pr-8 appearance-none cursor-pointer w-40"
              value={filters.riskLevel}
              onChange={(e) => { setFilters(f => ({ ...f, riskLevel: e.target.value })); setPage(1); }}
            >
              <option value="">All Risks</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Anomaly toggle */}
          <button
            onClick={() => { setFilters(f => ({ ...f, anomalyOnly: !f.anomalyOnly })); setPage(1); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              filters.anomalyOnly
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            ⚠ Anomalies Only
          </button>

          {/* Load Demo Data */}
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-all disabled:opacity-50 ml-auto"
          >
            <DatabaseZap className={`w-4 h-4 ${seeding ? 'animate-pulse' : ''}`} />
            {seeding ? 'Loading…' : 'Load Demo Data'}
          </button>
        </div>

        {/* Seed feedback */}
        {seedMsg && (
          <div className={`text-xs px-3 py-2 rounded-lg border ${
            seedMsg.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {seedMsg.text}
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Showing <strong className="text-slate-300">{logs.length}</strong> of <strong className="text-slate-300">{total}</strong> entries</span>
          {filters.anomalyOnly && <span className="badge-critical">Filtered: Anomalies</span>}
          {filters.riskLevel   && <span className="badge-high">Risk: {filters.riskLevel}</span>}
        </div>

        {/* Table card */}
        <div className="glass-card overflow-hidden">
          <LogTable logs={logs} loading={loading} onSelect={setSelected} />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="btn-ghost flex items-center gap-1 text-sm disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-xs text-slate-500 font-mono">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="btn-ghost flex items-center gap-1 text-sm disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}>
          <div className="glass-card w-full max-w-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Log Entry Detail</h2>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.entries(selected).filter(([k]) => !k.startsWith('_') || k === '_id').map(([k, v]) => (
                <div key={k} className="col-span-2 sm:col-span-1">
                  <p className="text-slate-500 uppercase tracking-wider text-[10px] mb-0.5">{k}</p>
                  <p className="font-hash text-slate-300 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</p>
                </div>
              ))}
            </div>
            {selected.sha256Hash && (
              <div className="mt-2 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase mb-1">SHA-256 Integrity Hash</p>
                <p className="font-hash text-emerald-400 break-all text-[11px]">{selected.sha256Hash}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

