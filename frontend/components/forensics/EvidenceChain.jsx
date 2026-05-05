'use client';
import { Database, CheckCircle, XCircle, Link as LinkIcon, BrainCircuit, Activity, ShieldAlert, Sparkles } from 'lucide-react';
import clsx from 'clsx';

function truncateHash(h, chars = 16) {
  if (!h || h === 'N/A') return '—';
  return `${h.slice(0, chars)}…`;
}

function BlockRow({ block, isLast }) {
  const valid = block.integrityStatus === 'VALID' || block.integrity_status === 'VALID';
  return (
    <div className="relative flex gap-4">
      {/* Vertical connector */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-800/80 z-0" />
      )}

      {/* Block icon */}
      <div className={clsx(
        'relative z-10 flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center',
        valid
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-red-500/10 border-red-500/30'
      )}>
        <Database className={`w-4 h-4 ${valid ? 'text-emerald-400' : 'text-red-400'}`} />
      </div>

      {/* Block content */}
      <div className={clsx(
        'flex-1 glass-card p-4 mb-3 border transition-all duration-200',
        valid ? 'border-emerald-500/10 hover:border-emerald-500/25' : 'border-red-500/20 hover:border-red-500/40'
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              Block #{block.blockIndex ?? block.block_index ?? '?'}
            </span>
            {valid
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              : <XCircle    className="w-3.5 h-3.5 text-red-400" />}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
            valid
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {valid ? 'VALID' : 'COMPROMISED'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
          <div>
            <p className="text-slate-600 uppercase tracking-wider text-[9px] mb-0.5">Current Hash</p>
            <p className="font-hash text-cyan-400 break-all">
              {block.currentHash ?? block.hash ?? block.current_hash ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-600 uppercase tracking-wider text-[9px] mb-0.5">Previous Hash</p>
            <p className="font-hash text-slate-500 break-all">
              {block.previousHash ?? block.previous_hash ?? '0'.repeat(64)}
            </p>
          </div>
          <div>
            <p className="text-slate-600 uppercase tracking-wider text-[9px] mb-0.5">Merkle Root</p>
            <p className="font-hash text-amber-400 break-all">
              {block.merkle_root ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-600 uppercase tracking-wider text-[9px] mb-0.5">Entries Batched</p>
            <p className="font-hash text-slate-400">{block.entries?.length ?? 1}</p>
          </div>
          {block.timestamp && (
            <div>
              <p className="text-slate-600 uppercase tracking-wider text-[9px] mb-0.5">Sealed At</p>
              <p className="font-hash text-slate-400">{new Date(block.timestamp).toLocaleString('en-GB')}</p>
            </div>
          )}
          {block.signature && (
            <div>
              <p className="text-slate-600 uppercase tracking-wider text-[9px] mb-0.5">RSA Signature</p>
              <p className="font-hash text-purple-400 truncate">{truncateHash(block.signature, 24)}</p>
            </div>
          )}
        </div>

        {/* Mind-Blowing ML Insights Section */}
        {block.ml_insights && (
          <div className="mt-4 pt-3 border-t border-slate-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">AI Forensic Insights</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {/* Forensic Value Score */}
              <div className="flex-1 min-w-[150px] p-3 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(217,70,239,0.5)]"
                    style={{ width: `${block.ml_insights.forensic_value_score}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div>
                    <p className="text-[10px] text-fuchsia-300/70 uppercase tracking-wider mb-0.5 flex items-center gap-1"><BrainCircuit className="w-3 h-3" /> Forensic Value</p>
                    <p className="text-lg font-bold text-fuchsia-100">{block.ml_insights.forensic_value_score}<span className="text-xs text-fuchsia-500/50">/100</span></p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                      {block.ml_insights.forensic_value_score > 75 ? 'CRITICAL' : block.ml_insights.forensic_value_score > 40 ? 'ELEVATED' : 'LOW'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tamper Risk Probability */}
              <div className="flex-1 min-w-[150px] p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out ${block.ml_insights.tamper_risk_score > 50 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}
                    style={{ width: `${block.ml_insights.tamper_risk_score}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div>
                    <p className="text-[10px] text-amber-300/70 uppercase tracking-wider mb-0.5 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Tamper Risk</p>
                    <p className="text-lg font-bold text-amber-100">{block.ml_insights.tamper_risk_score}<span className="text-xs text-amber-500/50">%</span></p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border ${block.ml_insights.tamper_risk_score > 50 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                      {block.ml_insights.tamper_risk_score > 50 ? 'HIGH RISK' : 'SECURE'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Anomaly Tags */}
              {block.ml_insights.anomaly_tags?.length > 0 && (
                <div className="w-full flex items-center gap-2 mt-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] text-slate-500">Flags:</span>
                  <div className="flex gap-2">
                    {block.ml_insights.anomaly_tags.map(tag => (
                      <span key={tag} className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_5px_rgba(6,182,212,0.2)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chain link connector */}
        {!isLast && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/50">
            <LinkIcon className="w-3 h-3 text-slate-700" />
            <span className="text-[10px] text-slate-700 font-mono">linked to next block via hash chain</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EvidenceChain({ blocks, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse flex-shrink-0" />
            <div className="flex-1 glass-card p-4 h-24 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!blocks?.length) {
    return (
      <div className="text-center py-12 text-slate-600">
        <Database className="w-10 h-10 mx-auto mb-3 text-slate-700" />
        <p className="text-sm">No evidence blocks found.</p>
        <p className="text-xs mt-1">Preserve evidence to start building the chain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {blocks.map((block, i) => (
        <BlockRow
          key={block._id ?? block.blockIndex ?? block.block_index ?? i}
          block={block}
          isLast={i === blocks.length - 1}
        />
      ))}
    </div>
  );
}

