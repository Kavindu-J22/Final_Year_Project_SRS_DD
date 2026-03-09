'use client';
import { AlertTriangle, Clock, User, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const SEV_STYLE = {
  CRITICAL: { badge: 'badge-critical', glow: 'hover:shadow-glow-red',  border: 'border-red-500/20' },
  HIGH:     { badge: 'badge-high',     glow: 'hover:shadow-glow-red',  border: 'border-orange-500/20' },
  MEDIUM:   { badge: 'badge-medium',   glow: 'hover:shadow-glow-amber',border: 'border-amber-500/20' },
  LOW:      { badge: 'badge-low',      glow: 'hover:shadow-glow-cyan', border: 'border-emerald-500/20' },
};

const STATUS_STYLE = {
  open:          'bg-red-500/10 text-red-400 border-red-500/30',
  investigating: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  contained:     'bg-blue-500/10 text-blue-400 border-blue-500/30',
  resolved:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

export default function IncidentCard({ incident, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const sev    = SEV_STYLE[incident.severity] ?? SEV_STYLE.LOW;
  const status = STATUS_STYLE[incident.status] ?? STATUS_STYLE.open;

  return (
    <div className={clsx('glass-card border transition-all duration-300', sev.glow, sev.border)}>
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className={clsx('w-4 h-4 flex-shrink-0', {
              'text-red-400':    incident.severity === 'CRITICAL',
              'text-orange-400': incident.severity === 'HIGH',
              'text-amber-400':  incident.severity === 'MEDIUM',
              'text-emerald-400':incident.severity === 'LOW',
            })} />
            <h3 className="text-sm font-semibold text-slate-200 truncate">{incident.title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={sev.badge}>{incident.severity}</span>
            <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border font-medium', status)}>
              {incident.status?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{incident.description}</p>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {incident.createdAt ? new Date(incident.createdAt).toLocaleString('en-GB') : '—'}
          </span>
          {incident.affectedUser && (
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {incident.affectedUser}</span>
          )}
          {incident.sourceIp && (
            <span className="font-hash">{incident.sourceIp}</span>
          )}
        </div>

        {/* MITRE ATT&CK tags */}
        {incident.mitreAttack?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {incident.mitreAttack.map((t) => (
              <span key={t.techniqueId ?? t}
                className="flex items-center gap-1 text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">
                <Tag className="w-2.5 h-2.5" />
                {t.techniqueId ?? t} {t.name ? `· ${t.name}` : ''}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            {/* Status changer */}
            <select
              value={incident.status}
              onChange={(e) => onStatusChange?.(incident._id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] bg-slate-800/60 border border-slate-700/60 text-slate-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
            >
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="contained">Contained</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-800/60 px-4 py-3 space-y-2 bg-slate-900/30">
          {incident.correlatedEvents?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Correlated Events ({incident.correlatedEvents.length})</p>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {incident.correlatedEvents.map((ev, i) => (
                  <div key={i} className="font-hash text-[11px] text-slate-400 bg-slate-800/40 rounded px-2 py-1">
                    {ev.sourceIp ?? ev.eventType ?? JSON.stringify(ev)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {incident.recommendedActions?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Recommended Actions</p>
              <ul className="space-y-0.5">
                {incident.recommendedActions.map((a, i) => (
                  <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                    <span className="text-cyan-500 mt-0.5">›</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

