'use client';
import { Database, CheckCircle, XCircle, Link as LinkIcon } from 'lucide-react';
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

