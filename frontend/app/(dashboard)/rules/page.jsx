'use client';
import { useState, useEffect, useCallback } from 'react';
import { BookOpen, RefreshCw, Trash2, Download, Upload, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { incidentsAPI } from '@/lib/api';

const SEV_COLOR = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
  HIGH:     'bg-orange-500/10 text-orange-400 border-orange-500/30',
  MEDIUM:   'bg-amber-500/10 text-amber-400 border-amber-500/30',
  LOW:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

export default function RulesPage() {
  const [rules,   setRules]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);
  const [importJson, setImportJson] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const notify = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await incidentsAPI.getRules();
      setRules(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (e) { notify('Failed to load rules: ' + e.message, false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleDelete = async (ruleId) => {
    setDeleting(ruleId);
    try {
      await incidentsAPI.deleteRule(ruleId);
      notify(`Rule "${ruleId}" deleted.`);
      fetchRules();
    } catch (e) { notify('Delete failed: ' + e.message, false); }
    finally { setDeleting(null); }
  };

  const handleExport = async () => {
    try {
      const { data } = await incidentsAPI.exportRules();
      const blob = new Blob([JSON.stringify(data?.data ?? data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'rulebase.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { notify('Export failed: ' + e.message, false); }
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      const rulesArr = Array.isArray(parsed) ? parsed : (parsed.rules ?? []);
      if (!rulesArr.length) throw new Error('No rules found in JSON');
      const { data } = await incidentsAPI.importRules(rulesArr);
      notify(`Imported ${data?.data?.imported ?? rulesArr.length} rule(s).`);
      setImportJson(''); setShowImport(false);
      fetchRules();
    } catch (e) { notify('Import failed: ' + e.message, false); }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Detection Logic Center" subtitle="MITRE ATT&CK Rulebase Management" />
      <div className="flex-1 p-6 space-y-6">

        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${toast.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-200">Active Rules</span>
            <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">{rules.length}</span>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setShowImport(!showImport)} className="btn-ghost flex items-center gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" />Import JSON
            </button>
            <button onClick={handleExport} className="btn-ghost flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />Export
            </button>
            <button onClick={fetchRules} disabled={loading} className="btn-ghost flex items-center gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
        </div>

        {/* Import panel */}
        {showImport && (
          <div className="glass-card p-5 space-y-3">
            <p className="text-xs text-slate-400">Paste a JSON array of rule objects (or <code className="text-cyan-400">{'{"rules":[...]}'}</code>):</p>
            <textarea
              value={importJson} onChange={(e) => setImportJson(e.target.value)}
              rows={5}
              placeholder='[{"rule_id":"T1234","name":"...","severity":"HIGH","mitre_technique":"T1234","description":"..."}]'
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-y"
            />
            <div className="flex gap-2">
              <button onClick={handleImport} className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-3.5 h-3.5" />Import Rules
              </button>
              <button onClick={() => setShowImport(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* Rules table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['Rule ID','Name','Severity','MITRE Technique','Description','Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800/60 animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-600 text-sm">
                      No active rules. Import rules or visit the Rule Store.
                    </td>
                  </tr>
                ) : rules.map((rule, i) => (
                  <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-cyan-400">{rule.rule_id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-200">{rule.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${SEV_COLOR[rule.severity] ?? 'text-slate-400'}`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-purple-400">{rule.mitre_technique}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{rule.description}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(rule.rule_id)}
                        disabled={deleting === rule.rule_id}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        {deleting === rule.rule_id
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                        Delete
                      </button>
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

