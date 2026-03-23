'use client';
import { useState } from 'react';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

const RISK_STYLE = {
  CRITICAL: 'badge-critical',
  HIGH:     'badge-high',
  MEDIUM:   'badge-medium',
  LOW:      'badge-low',
};

function SortIcon({ column, sortBy, sortDir }) {
  if (sortBy !== column) return <ChevronUp className="w-3 h-3 text-slate-700" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3 text-cyan-400" />
    : <ChevronDown className="w-3 h-3 text-cyan-400" />;
}

export default function LogTable({ logs, loading, onSelect }) {
  const [sortBy,  setSortBy]  = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const sorted = [...(logs ?? [])].sort((a, b) => {
    const av = a[sortBy] ?? '';
    const bv = b[sortBy] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const TH = ({ col, label }) => (
    <th
      onClick={() => toggleSort(col)}
      className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon column={col} sortBy={sortBy} sortDir={sortDir} />
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-800/50 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-16 text-slate-600">
        <p className="text-sm">No log entries found.</p>
        <p className="text-xs mt-1">Try adjusting your filters or ingest new logs.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-800/80">
          <tr>
            <TH col="timestamp"  label="Timestamp" />
            <TH col="ipAddress"  label="Source IP" />
            <TH col="url"        label="Action / Event" />
            <TH col="eventType"  label="Service / Type" />
            <TH col="riskLevel"  label="Risk" />
            <TH col="isAnomaly"  label="Anomaly" />
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {sorted.map((log) => (
            <tr
              key={log._id}
              onClick={() => onSelect?.(log)}
              className={clsx(
                'transition-colors duration-150 cursor-pointer',
                log.isAnomaly
                  ? 'bg-red-500/5 hover:bg-red-500/10'
                  : 'hover:bg-slate-800/40'
              )}
            >
              <td className="px-4 py-3 font-hash text-slate-500 whitespace-nowrap text-[11px]">
                {log.timestamp ? new Date(log.timestamp).toLocaleString('en-GB') : '—'}
              </td>
              <td className="px-4 py-3 font-hash text-slate-300 whitespace-nowrap text-[12px]">
                {log.ipAddress ?? log.sourceIp ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={log.url}>
                {log.url ?? log.action ?? log.eventType ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                {log.eventType ?? log.source ?? log.service ?? '—'}
              </td>
              <td className="px-4 py-3">
                {log.riskLevel
                  ? <span className={RISK_STYLE[log.riskLevel] ?? 'badge-low'}>{log.riskLevel}</span>
                  : <span className="text-slate-700 text-xs">—</span>}
              </td>
              <td className="px-4 py-3">
                {log.isAnomaly
                  ? <span className="badge-critical flex items-center gap-1 w-fit">⚠ ANOMALY</span>
                  : <span className="text-slate-700 text-xs">Normal</span>}
              </td>
              <td className="px-4 py-3">
                <ExternalLink className="w-3.5 h-3.5 text-slate-700 hover:text-cyan-400 transition-colors" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

