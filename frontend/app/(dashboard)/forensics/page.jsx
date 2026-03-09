'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle, XCircle, RefreshCw, Lock,
  Database, Activity, AlertCircle,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import EvidenceChain from '@/components/forensics/EvidenceChain';
import { forensicsAPI } from '@/lib/api';

export default function ForensicsPage() {
  const [chain,    setChain]    = useState([]);
  const [stats,    setStats]    = useState(null);
  const [verify,   setVerify]   = useState(null);
  const [anomalies,setAnomalies]= useState([]);
  const [loading,  setLoading]  = useState(true);
  const [verifying,setVerifying]= useState(false);
  const [activeTab,setActiveTab]= useState('chain');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [chainRes, statsRes, anomalyRes] = await Promise.allSettled([
        forensicsAPI.getChain(),
        forensicsAPI.getStats(),
        forensicsAPI.getAnomalies(),
      ]);
      if (chainRes.status === 'fulfilled')   setChain(chainRes.value.data.data ?? []);
      if (statsRes.status === 'fulfilled')   setStats(statsRes.value.data.data);
      if (anomalyRes.status === 'fulfilled') setAnomalies(anomalyRes.value.data.data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const { data } = await forensicsAPI.verify();
      setVerify(data.data);
    } catch (e) {
      setVerify({ integrity_status: 'ERROR', message: e.message });
    } finally { setVerifying(false); }
  };

  const integrityOk = stats?.integrity_status === 'VALID' || verify?.integrity_status === 'VALID';

  const TABS = ['chain', 'anomalies', 'notary'];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Forensics & Evidence" subtitle="Digital Notary · SHA-256 Chain of Custody" />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Evidence Blocks',  value: stats?.total_blocks      ?? chain.length, icon: Database,  color: 'text-purple-400' },
            { label: 'Chain Integrity',  value: stats?.integrity_status  ?? '—',          icon: Lock,      color: integrityOk ? 'text-emerald-400' : 'text-red-400' },
            { label: 'Timeline Anomalies',value: anomalies.length,                        icon: Activity,  color: 'text-amber-400' },
            { label: 'Verify Status',    value: verify ? (verify.integrity_status ?? '—') : 'Not run', icon: Shield, color: integrityOk ? 'text-emerald-400' : 'text-slate-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">{label}</p>
                <p className={`text-lg font-bold ${color} truncate`}>{loading ? '…' : value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Verify button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="btn-primary flex items-center gap-2"
          >
            {verifying
              ? <div className="w-4 h-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
              : <Shield className="w-4 h-4" />}
            {verifying ? 'Verifying Chain…' : 'Run Chain Verification'}
          </button>

          {verify && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
              verify.integrity_status === 'VALID'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {verify.integrity_status === 'VALID'
                ? <CheckCircle className="w-4 h-4" />
                : <XCircle    className="w-4 h-4" />}
              {verify.integrity_status} — {verify.message ?? ''}
            </div>
          )}

          <button onClick={fetchAll} disabled={loading} className="btn-ghost flex items-center gap-2 text-sm ml-auto">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-800/60">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'chain' ? 'Evidence Chain' : tab === 'anomalies' ? 'Timeline Anomalies' : 'Digital Notary'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'chain' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">SHA-256 Chain of Custody</h3>
              <span className="text-[10px] text-slate-600 ml-2">{chain.length} blocks · cryptographically linked</span>
            </div>
            <EvidenceChain blocks={chain} loading={loading} />
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">DBSCAN Timeline Anomalies</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-800/50 animate-pulse rounded" />
                ))}
              </div>
            ) : anomalies.length === 0 ? (
              <div className="text-center py-10 text-slate-600">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-700" />
                <p className="text-sm">No timeline anomalies detected.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {anomalies.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-slate-300 font-medium">{a.event_type ?? a.action ?? 'Anomaly'}</p>
                      <p className="text-slate-600 font-hash mt-0.5">
                        {a.timestamp ? new Date(a.timestamp).toLocaleString('en-GB') : '—'}
                        {a.source_ip ? ` · ${a.source_ip}` : ''}
                        {a.cluster_id !== undefined ? ` · Cluster ${a.cluster_id}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notary' && (
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Digital Notary — Cryptographic Proof</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                <p className="text-slate-500 uppercase tracking-wider text-[9px] mb-2">Hashing Algorithm</p>
                <p className="font-hash text-cyan-400 text-sm">SHA-256</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                <p className="text-slate-500 uppercase tracking-wider text-[9px] mb-2">Signature Algorithm</p>
                <p className="font-hash text-purple-400 text-sm">RSA-2048 · PKCS#1 v1.5</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                <p className="text-slate-500 uppercase tracking-wider text-[9px] mb-2">Total Blocks</p>
                <p className="font-hash text-slate-200 text-sm">{stats?.total_blocks ?? chain.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                <p className="text-slate-500 uppercase tracking-wider text-[9px] mb-2">Last Block Time</p>
                <p className="font-hash text-slate-200 text-sm">
                  {stats?.last_block_time ? new Date(stats.last_block_time).toLocaleString('en-GB') : '—'}
                </p>
              </div>
            </div>
            {stats?.chain_hash && (
              <div className="p-4 rounded-lg bg-slate-900/60 border border-emerald-500/20">
                <p className="text-slate-500 uppercase tracking-wider text-[9px] mb-2">Latest Chain Hash (Tip)</p>
                <p className="font-hash text-emerald-400 break-all text-[11px]">{stats.chain_hash}</p>
              </div>
            )}
            <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-800/60">
              Each evidence block contains a SHA-256 hash of its contents plus the previous block's hash,
              forming a tamper-evident chain. RSA-2048 signatures provide non-repudiation for forensic court admissibility.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

