'use client';
import { useState } from 'react';
import {
  FlaskConical, CheckCircle, XCircle, Loader2,
  ShieldCheck, AlertTriangle, Lock, Activity, Clock,
  HeartPulse, Shield, Target, Link2,
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
  const [activeId, setActiveId] = useState(null);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [ranAt,    setRanAt]    = useState(null);

  const run = async (id, apiFn) => {
    setActiveId(id); setRunning(true); setError(null); setResult(null);
    try {
      const { data } = await apiFn();
      setResult(data); setRanAt(new Date());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to reach backend');
    } finally { setRunning(false); setActiveId(null); }
  };

  const runAll       = ()   => run('all',         systemAPI.runSmokeTest);
  const runComponent = (id) => run(id,            () => systemAPI.runComponentTest(id));
  const runSuite     = (s)  => run(`suite_${s}`,  () => systemAPI.runSuite(s));

  const summary   = result?.summary;
  const allPassed = summary?.allPassed;

  const COMPONENT_BTNS = [
    { id: 1, label: 'Identity',  color: 'cyan',    Icon: ShieldCheck   },
    { id: 2, label: 'Incidents', color: 'amber',   Icon: AlertTriangle  },
    { id: 3, label: 'Evidence',  color: 'purple',  Icon: Lock           },
    { id: 4, label: 'Timeline',  color: 'emerald', Icon: Activity       },
  ];

  const ADV_SUITES = [
    { id: 'health',      label: 'Health Check All',  color: 'sky',    Icon: HeartPulse,   num: '⑥' },
    { id: 'security',    label: 'Security Attacks',  color: 'red',    Icon: Shield,        num: '⑦' },
    { id: 'accuracy',    label: 'ML Accuracy',       color: 'violet', Icon: Target,        num: '⑧' },
    { id: 'integration', label: 'Integration E2E',   color: 'lime',   Icon: Link2,         num: '⑨' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="System Test Runner" subtitle="9 test suites · Component, Health, Security, Accuracy & Integration tests across all 4 ML microservices" />

      <div className="flex-1 p-6 space-y-6">
        {/* ── Test Suite Selector ── */}
        <div className="glass-card p-4 space-y-4">
          {/* Row 1: Full system + per-component */}
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-mono mb-2">Component Suites</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={runAll} disabled={running} className="btn-primary flex items-center gap-2">
                {activeId === 'all' && running ? <Loader2 className="w-4 h-4 animate-spin"/> : <FlaskConical className="w-4 h-4"/>}
                {activeId === 'all' && running ? 'Running All…' : '① Run All (Full System)'}
              </button>
              {COMPONENT_BTNS.map(({ id, label, color, Icon }, idx) => (
                <button key={id} onClick={() => runComponent(id)} disabled={running}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 border-${color}-500/30 bg-${color}-500/10 text-${color}-400 hover:bg-${color}-500/20`}>
                  {activeId === id && running ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Icon className="w-3.5 h-3.5"/>}
                  {activeId === id && running ? 'Running…' : `${['②','③','④','⑤'][idx]} ${label} Only`}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Advanced typed suites */}
          <div className="border-t border-slate-800 pt-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-mono mb-2">Advanced Test Suites</p>
            <div className="flex flex-wrap gap-3">
              {ADV_SUITES.map(({ id, label, color, Icon, num }) => (
                <button key={id} onClick={() => runSuite(id)} disabled={running}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 border-${color}-500/30 bg-${color}-500/10 text-${color}-400 hover:bg-${color}-500/20`}>
                  {activeId === `suite_${id}` && running ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Icon className="w-3.5 h-3.5"/>}
                  {activeId === `suite_${id}` && running ? 'Running…' : `${num} ${label}`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 font-mono mt-2">
              ⑥ Health = ping all 4 services · ⑦ Security = attack scenarios · ⑧ Accuracy = TP/TN checks · ⑨ Integration = E2E cross-service flows
            </p>
          </div>
        </div>

        {/* Timestamp */}
        {ranAt && (
          <div className="text-right text-xs text-slate-600 font-mono -mt-3">
            Last run: {ranAt.toLocaleTimeString('en-GB')}
            {result?.durationMs && ` · ${result.durationMs}ms total`}
          </div>
        )}


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
            <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-2">9 Test Suites Available</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs text-slate-600 font-mono">
              {[
                { num: '①', label: 'Full System',  desc: 'All 4 components in parallel'      },
                { num: '②', label: 'Identity',     desc: 'Health · Anomaly · Normal session'  },
                { num: '③', label: 'Incident',     desc: 'Health · Rules · Brute-force corr.' },
                { num: '④', label: 'Evidence',     desc: 'Health · Preserve · Verify · Stats' },
                { num: '⑤', label: 'Timeline',     desc: 'Health · Analyze · Anomalies · Metrics' },
                { num: '⑥', label: 'Health Check', desc: 'Uptime ping on all 4 services'     },
                { num: '⑦', label: 'Security',     desc: 'Attack scenarios across all services'},
                { num: '⑧', label: 'Accuracy',     desc: 'True-positive / true-negative checks'},
                { num: '⑨', label: 'Integration',  desc: 'E2E cross-service flows'            },
              ].map(({ num, label, desc }) => (
                <div key={num} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <p className="text-slate-400 font-bold text-sm">{num} {label}</p>
                  <p className="text-[10px] mt-1 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

