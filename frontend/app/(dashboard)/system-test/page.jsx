'use client';
import { useState } from 'react';
import {
  FlaskConical, CheckCircle, XCircle, Loader2, RefreshCw,
  ShieldCheck, AlertTriangle, Lock, Activity, Clock,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { systemAPI } from '@/lib/api';

const COMPONENT_META = [
  { id: 1, title: 'Identity Attribution & Behavior Profiling', port: 8001,
    icon: ShieldCheck, color: 'text-cyan-400',   border: 'border-cyan-500/20',   bg: 'bg-cyan-500/5',
    author: 'IT22920836', tech: 'Isolation Forest · One-Class SVM · Autoencoder' },
  { id: 2, title: 'Incident Detection & Correlation',          port: 8002,
    icon: AlertTriangle, color: 'text-amber-400', border: 'border-amber-500/20',  bg: 'bg-amber-500/5',
    author: 'IT22033550', tech: 'MITRE ATT&CK · Rule-Based Correlation Engine' },
  { id: 3, title: 'Evidence Preservation & Chain of Custody',  port: 8003,
    icon: Lock,          color: 'text-purple-400',border: 'border-purple-500/20', bg: 'bg-purple-500/5',
    author: 'IT22581402', tech: 'SHA-256 Blockchain · RSA-2048 Digital Signatures' },
  { id: 4, title: 'Forensic Timeline Reconstruction',          port: 8004,
    icon: Activity,      color: 'text-emerald-400',border:'border-emerald-500/20',bg: 'bg-emerald-500/5',
    author: 'IT22916808', tech: 'DBSCAN Clustering · TF-IDF Vectorization' },
];

function StatusBadge({ status }) {
  if (!status) return <span className="text-xs text-slate-600 font-mono">PENDING</span>;
  if (status === 'PASS')
    return <span className="flex items-center gap-1 text-xs font-mono text-emerald-400"><CheckCircle className="w-3.5 h-3.5"/>PASS</span>;
  return <span className="flex items-center gap-1 text-xs font-mono text-red-400"><XCircle className="w-3.5 h-3.5"/>FAIL</span>;
}

function ComponentCard({ meta, result }) {
  const Icon = meta.icon;
  const allPass = result && result.status === 'PASS';
  const hasFail = result && result.status === 'FAIL';

  return (
    <div className={`glass-card p-5 border ${meta.border} ${result ? (allPass ? '' : 'border-red-500/30') : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${meta.color}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200 leading-tight">{meta.title}</p>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">{meta.author} · Port :{meta.port}</p>
          </div>
        </div>
        {result
          ? <StatusBadge status={result.status} />
          : <span className="text-[10px] text-slate-600 border border-slate-700 rounded px-2 py-0.5">IDLE</span>}
      </div>

      {/* Tech stack */}
      <p className="text-[10px] text-slate-500 mb-3 font-mono">{meta.tech}</p>

      {/* Test results */}
      {result ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-slate-500 mb-2 border-b border-slate-800 pb-1">
            <span>Test Cases</span>
            <span className="font-mono">
              <span className="text-emerald-400">{result.passed} PASS</span>
              {result.failed > 0 && <span className="text-red-400 ml-2">{result.failed} FAIL</span>}
              <span className="text-slate-600 ml-2">{result.durationMs ?? 0}ms</span>
            </span>
          </div>
          {result.tests.map((t, i) => (
            <div key={i} className={`flex items-start gap-2 p-2 rounded text-xs ${
              t.status === 'PASS' ? 'bg-emerald-500/5' : 'bg-red-500/8'}`}>
              {t.status === 'PASS'
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5"/>
                : <XCircle    className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5"/>}
              <div className="min-w-0">
                <p className="font-medium text-slate-300 truncate">{t.name}</p>
                <p className="text-slate-500 font-mono text-[10px] mt-0.5 truncate">{t.detail}</p>
              </div>
              <span className="text-[9px] text-slate-600 font-mono flex-shrink-0">{t.durationMs}ms</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-slate-700 text-xs">
          <Clock className="w-5 h-5 mx-auto mb-1 opacity-40"/>
          Awaiting test run
        </div>
      )}
    </div>
  );
}

export default function SystemTestPage() {
  const [running,  setRunning]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [ranAt,    setRanAt]    = useState(null);

  const runTests = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await systemAPI.runSmokeTest();
      setResult(data);
      setRanAt(new Date());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reach backend');
    } finally {
      setRunning(false);
    }
  };

  const summary = result?.summary;
  const allPassed = summary?.allPassed;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="System Test Runner" subtitle="Live smoke-test across all 4 ML microservices" />

      <div className="flex-1 p-6 space-y-6">
        {/* Control bar */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={runTests}
            disabled={running}
            className="btn-primary flex items-center gap-2"
          >
            {running
              ? <Loader2 className="w-4 h-4 animate-spin"/>
              : <FlaskConical className="w-4 h-4"/>}
            {running ? 'Running Tests…' : 'Run Full Smoke Test'}
          </button>

          {result && !running && (
            <button onClick={runTests} className="btn-ghost flex items-center gap-2 text-sm">
              <RefreshCw className="w-3.5 h-3.5"/>Re-run
            </button>
          )}

          {ranAt && (
            <span className="text-xs text-slate-600 font-mono ml-auto">
              Last run: {ranAt.toLocaleTimeString('en-GB')}
              {result?.durationMs && ` · ${result.durationMs}ms total`}
            </span>
          )}
        </div>

        {/* Overall summary banner */}
        {summary && (
          <div className={`flex items-center gap-4 p-4 rounded-xl border ${
            allPassed
              ? 'bg-emerald-500/8 border-emerald-500/25 text-emerald-400'
              : 'bg-red-500/8 border-red-500/25 text-red-400'
          }`}>
            {allPassed
              ? <CheckCircle className="w-6 h-6 flex-shrink-0"/>
              : <XCircle     className="w-6 h-6 flex-shrink-0"/>}
            <div>
              <p className="font-bold text-sm">
                {allPassed ? 'All systems operational — all tests passed!' : 'Some tests failed — check component details below'}
              </p>
              <p className="text-xs opacity-70 font-mono mt-0.5">
                {summary.passed}/{summary.totalTests} tests passed
                · {result.durationMs}ms
                · {result.startedAt ? new Date(result.startedAt).toLocaleString('en-GB') : ''}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-red-500/8 border-red-500/25 text-red-400">
            <XCircle className="w-5 h-5 flex-shrink-0"/>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Component cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {COMPONENT_META.map((meta) => {
            const compResult = result?.components?.find(c => c.id === meta.id);
            return <ComponentCard key={meta.id} meta={meta} result={compResult} />;
          })}
        </div>

        {/* How it works */}
        {!result && !running && (
          <div className="glass-card p-5 text-sm text-slate-500 space-y-2">
            <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-2">How This Works</p>
            <p>Click <strong className="text-slate-300">Run Full Smoke Test</strong> to fire live test payloads at all 4 ML microservices simultaneously.</p>
            <p>Each component runs 4 test cases covering health checks, core ML endpoints, and edge-case payloads — giving you instant pass/fail visibility for the research panel demo.</p>
            <p className="text-[11px] font-mono text-slate-600">Services tested: :8001 Identity · :8002 Incidents · :8003 Evidence · :8004 Timeline</p>
          </div>
        )}
      </div>
    </div>
  );
}

