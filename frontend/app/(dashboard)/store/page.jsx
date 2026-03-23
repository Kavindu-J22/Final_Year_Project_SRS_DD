'use client';
import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, RefreshCw, Download, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { incidentsAPI } from '@/lib/api';

const SEV_COLOR = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
  HIGH:     'bg-orange-500/10 text-orange-400 border-orange-500/30',
  MEDIUM:   'bg-amber-500/10 text-amber-400 border-amber-500/30',
  LOW:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

export default function StorePage() {
  const [catalogue, setCatalogue] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [installing,setInstalling]= useState(null);
  const [toast,     setToast]     = useState(null);
  const [catFilter, setCatFilter] = useState('ALL');

  const notify = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStore = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await incidentsAPI.getRuleStore();
      const rows = Array.isArray(data) ? data : (data?.data ?? []);
      setCatalogue(rows);
    } catch (e) { notify('Failed to load store: ' + e.message, false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  const handleInstall = async (rule) => {
    setInstalling(rule.rule_id);
    try {
      await incidentsAPI.importRules([rule]);
      notify(`"${rule.name}" installed successfully!`);
      // refresh so installed flag updates
      fetchStore();
    } catch (e) { notify('Install failed: ' + e.message, false); }
    finally { setInstalling(null); }
  };

  const categories = ['ALL', ...Array.from(new Set(catalogue.map((r) => r.category ?? 'Other')))];
  const filtered = catalogue.filter((r) => catFilter === 'ALL' || r.category === catFilter);
  const installed = catalogue.filter((r) => r.installed).length;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Rule Store" subtitle="Browse & Install MITRE ATT&CK Detection Modules" />
      <div className="flex-1 p-6 space-y-6">

        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${toast.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* Header stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label:'Available Rules', value: catalogue.length,  icon: ShoppingBag, color:'text-cyan-400' },
            { label:'Installed',       value: installed,          icon: CheckCircle, color:'text-emerald-400' },
            { label:'Not Installed',   value: catalogue.length - installed, icon: Shield, color:'text-amber-400' },
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

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 items-center">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                catFilter === cat ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'border-slate-700/60 text-slate-500 hover:text-slate-300'
              }`}>{cat}</button>
          ))}
          <button onClick={fetchStore} disabled={loading} className="btn-ghost flex items-center gap-1.5 text-xs ml-auto">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {/* Rule cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
                <div className="h-3 bg-slate-800 rounded w-2/3" />
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-full" />
                <div className="h-3 bg-slate-800 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            <p className="text-sm">No rules found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((rule) => (
              <div key={rule.rule_id} className="glass-card p-5 space-y-3 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-purple-400">{rule.mitre_technique}</p>
                    <h3 className="text-sm font-semibold text-slate-200 mt-0.5">{rule.name}</h3>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${SEV_COLOR[rule.severity] ?? 'text-slate-400'}`}>
                    {rule.severity}
                  </span>
                </div>

                {/* Category */}
                {rule.category && (
                  <span className="text-[10px] bg-slate-800/60 text-slate-500 border border-slate-700/60 px-2 py-0.5 rounded-full w-fit">
                    {rule.category}
                  </span>
                )}

                {/* Description */}
                <p className="text-xs text-slate-500 flex-1">{rule.description}</p>

                {/* Meta */}
                {(rule.threshold || rule.time_window) && (
                  <div className="flex gap-3 text-[10px] text-slate-600 font-mono">
                    {rule.threshold  && <span>Threshold: {rule.threshold}</span>}
                    {rule.time_window && <span>Window: {rule.time_window}s</span>}
                  </div>
                )}

                {/* Install button */}
                <button
                  onClick={() => handleInstall(rule)}
                  disabled={rule.installed || installing === rule.rule_id}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                    rule.installed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default'
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                  }`}
                >
                  {installing === rule.rule_id
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : rule.installed
                      ? <><CheckCircle className="w-3.5 h-3.5" />Installed</>
                      : <><Download className="w-3.5 h-3.5" />Install Rule</>
                  }
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

