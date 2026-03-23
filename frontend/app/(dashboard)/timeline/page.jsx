'use client';
import { useState, useCallback, useEffect } from 'react';
import { Clock, Search, RefreshCw, AlertCircle, BarChart2, Activity } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { forensicsAPI } from '@/lib/api';

const SAMPLE_LOGS = [
  { log_id:'l1', timestamp:'2026-01-05T14:00:00Z', ip_address:'192.168.1.10', method:'GET',  url:'/index.html',              status_code:200 },
  { log_id:'l2', timestamp:'2026-01-05T14:01:00Z', ip_address:'192.168.1.10', method:'GET',  url:'/app.js',                  status_code:200 },
  { log_id:'l3', timestamp:'2026-01-05T03:45:12Z', ip_address:'203.0.113.42', method:'POST', url:"/admin.php?id=1' OR '1'='1",status_code:500 },
  { log_id:'l4', timestamp:'2026-01-05T03:45:15Z', ip_address:'203.0.113.42', method:'GET',  url:'/../../etc/passwd',         status_code:403 },
  { log_id:'l5', timestamp:'2026-01-05T03:45:18Z', ip_address:'203.0.113.42', method:'GET',  url:'/shell.php?cmd=whoami',     status_code:200 },
];

export default function TimelinePage() {
  const [logs,      setLogs]      = useState('');
  const [metrics,   setMetrics]   = useState(null);
  const [clusters,  setClusters]  = useState([]);
  const [searchTerm,setSearchTerm]= useState('');
  const [searchField,setSearchField]= useState('ip_address');
  const [searchRes, setSearchRes] = useState(null);
  const [running,   setRunning]   = useState(false);
  const [searching, setSearching] = useState(false);
  const [error,     setError]     = useState('');

  const runAnalysis = useCallback(async () => {
    setRunning(true); setError('');
    try {
      let parsed;
      try { parsed = JSON.parse(logs); } catch { parsed = SAMPLE_LOGS; }
      if (!Array.isArray(parsed)) parsed = SAMPLE_LOGS;

      const [analyzeRes, metricsRes] = await Promise.allSettled([
        forensicsAPI.analyzeTimeline(parsed),
        forensicsAPI.getTimelineMetrics(),
      ]);
      if (analyzeRes.status === 'fulfilled') {
        const d = analyzeRes.value.data?.data ?? analyzeRes.value.data;
        setClusters(d?.clusters ?? []);
      }
      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value.data?.data ?? metricsRes.value.data);
      }
    } catch (e) { setError(e.message); }
    finally { setRunning(false); }
  }, [logs]);

  const runSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setSearching(true); setError('');
    try {
      const { data } = await forensicsAPI.searchEntity(searchTerm.trim(), searchField);
      setSearchRes(data?.data ?? data);
    } catch (e) { setError(e.message); }
    finally { setSearching(false); }
  }, [searchTerm, searchField]);

  const loadSample = () => setLogs(JSON.stringify(SAMPLE_LOGS, null, 2));

  // Auto-load + analyze on first mount so the page isn't blank
  useEffect(() => {
    const autoRun = async () => {
      setRunning(true); setError('');
      try {
        const [analyzeRes, metricsRes] = await Promise.allSettled([
          forensicsAPI.analyzeTimeline(SAMPLE_LOGS),
          forensicsAPI.getTimelineMetrics(),
        ]);
        if (analyzeRes.status === 'fulfilled') {
          const d = analyzeRes.value.data?.data ?? analyzeRes.value.data;
          setClusters(d?.clusters ?? []);
        }
        if (metricsRes.status === 'fulfilled') {
          setMetrics(metricsRes.value.data?.data ?? metricsRes.value.data);
        }
      } catch { /* ignore — user can run manually */ }
      finally { setRunning(false); }
    };
    autoRun();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Forensic Timeline Sandbox" subtitle="DBSCAN Clustering · TF-IDF Entity Search" />
      <div className="flex-1 p-6 space-y-6">

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Log Input */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">Log Input (JSON Array)</h2>
            </div>
            <button onClick={loadSample} className="text-[10px] text-slate-500 hover:text-cyan-400 border border-slate-700/60 px-2 py-1 rounded transition-all">
              Load Sample
            </button>
          </div>
          <textarea
            value={logs}
            onChange={(e) => setLogs(e.target.value)}
            placeholder='Paste JSON log array here, or click "Load Sample"…'
            rows={7}
            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-y"
          />
          <button onClick={runAnalysis} disabled={running} className="btn-primary flex items-center gap-2">
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            {running ? 'Analysing…' : 'Run Timeline Analysis'}
          </button>
        </div>

        {/* Entity Search */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-slate-200">Entity Graph Search</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Search value (IP, URL, method…)"
              className="flex-1 min-w-[200px] bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
            />
            <select value={searchField} onChange={(e) => setSearchField(e.target.value)}
              className="bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-purple-500/50">
              {['ip_address','method','url','user_agent'].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <button onClick={runSearch} disabled={searching} className="btn-primary flex items-center gap-2">
              {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Search
            </button>
          </div>
          {searchRes && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-slate-500">{searchRes.count ?? searchRes.matches?.length ?? 0} match(es) for <span className="text-purple-400">"{searchRes.entity}"</span> in <span className="text-purple-400">{searchRes.field}</span></p>
              {(searchRes.matches ?? []).map((m, i) => (
                <div key={i} className={`p-3 rounded-lg border text-xs flex flex-wrap gap-x-4 gap-y-1 ${m.is_anomaly ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/40 border-slate-800/60'}`}>
                  <span className="text-slate-500 font-mono">{m.log_id}</span>
                  <span className="text-slate-400">{m.ip_address}</span>
                  <span className="text-cyan-400">{m.method}</span>
                  <span className="text-slate-300 truncate max-w-xs">{m.url}</span>
                  <span className="text-slate-500">{m.status_code}</span>
                  {m.is_anomaly && <span className="text-red-400 font-bold">ANOMALY</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metrics + Clusters */}
        {(metrics || clusters.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {metrics && (
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-slate-200">Analysis Metrics</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label:'Total Logs',   value: metrics.total_logs },
                    { label:'Anomalies',    value: metrics.total_anomalies },
                    { label:'Clusters',     value: metrics.num_clusters },
                    { label:'Noise Ratio',  value: `${((metrics.noise_ratio??0)*100).toFixed(1)}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                      <p className="text-slate-500 text-[10px] uppercase">{label}</p>
                      <p className="text-slate-200 font-bold text-base mt-0.5">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
                {metrics.top_ips?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-slate-600 mb-2">Top Source IPs</p>
                    {metrics.top_ips.slice(0, 5).map((ip) => (
                      <div key={ip.ip} className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] text-slate-400 w-36 truncate">{ip.ip}</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, (ip.count / (metrics.total_logs||1)) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 w-6 text-right">{ip.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {clusters.length > 0 && (
              <div className="glass-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-slate-200">DBSCAN Clusters</h2>
                </div>
                <div className="space-y-2">
                  {clusters.map((c) => (
                    <div key={c.cluster_id} className={`p-3 rounded-lg border text-xs ${c.is_anomaly ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/40 border-slate-800/60'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-200">{c.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{c.size} logs</span>
                          {c.is_anomaly && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold">ANOMALY</span>}
                        </div>
                      </div>
                      <p className="text-slate-600 font-mono truncate">{(c.representative_logs ?? []).slice(0,2).join(' · ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

