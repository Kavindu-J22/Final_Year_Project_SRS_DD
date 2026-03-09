'use client';
import { Activity, AlertTriangle, Database, Lock, ShieldCheck, Zap } from 'lucide-react';
import clsx from 'clsx';

const METRIC_CONFIG = [
  { key: 'totalLogs',         label: 'Total Events',       icon: Activity,      color: 'cyan',    desc: 'All ingested log entries' },
  { key: 'anomalyLogs',       label: 'Anomalies Detected', icon: Zap,           color: 'red',     desc: 'DBSCAN cluster –1 outliers' },
  { key: 'openIncidents',     label: 'Open Incidents',     icon: AlertTriangle, color: 'amber',   desc: 'Awaiting investigation' },
  { key: 'criticalIncidents', label: 'Critical Alerts',    icon: ShieldCheck,   color: 'orange',  desc: 'MITRE ATT&CK – P1 severity' },
  { key: 'forensicBlocks',    label: 'Evidence Blocks',    icon: Database,      color: 'purple',  desc: 'SHA-256 sealed chain entries' },
  { key: 'integrityStatus',   label: 'Chain Integrity',    icon: Lock,          color: 'emerald', desc: 'Digital Notary status', isStatus: true },
];

const colorMap = {
  cyan:    { icon: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',   glow: 'hover:shadow-glow-cyan'  },
  red:     { icon: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',    glow: 'hover:shadow-glow-red'   },
  amber:   { icon: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',  glow: 'hover:shadow-glow-amber' },
  orange:  { icon: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20', glow: 'hover:shadow-glow-red'   },
  purple:  { icon: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20', glow: 'hover:shadow-glow-blue'  },
  emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',glow: 'hover:shadow-glow-cyan'  },
};

function StatCard({ label, value, icon: Icon, color, desc, isStatus }) {
  const c = colorMap[color];
  const displayValue = isStatus
    ? (value === 'VALID' ? '✓ VALID' : value === 'EMPTY' ? '— EMPTY' : value ?? '…')
    : (value ?? '—');

  return (
    <div className={clsx('glass-card p-5 flex flex-col gap-3 transition-all duration-300', c.glow)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', c.bg, 'border', c.border)}>
          <Icon className={clsx('w-4 h-4', c.icon)} />
        </div>
      </div>
      <div>
        <p className={clsx('text-2xl font-bold', isStatus
          ? (value === 'VALID' ? 'text-emerald-400' : value === 'COMPROMISED' ? 'text-red-400' : 'text-slate-300')
          : 'text-slate-100')}>
          {displayValue}
        </p>
        <p className="text-[11px] text-slate-600 mt-1">{desc}</p>
      </div>
    </div>
  );
}

export default function MetricsGrid({ data, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-5 h-28 animate-pulse">
            <div className="h-3 bg-slate-800 rounded w-2/3 mb-4" />
            <div className="h-7 bg-slate-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {METRIC_CONFIG.map((cfg) => (
        <StatCard key={cfg.key} {...cfg} value={data?.[cfg.key]} />
      ))}
    </div>
  );
}

