'use client';
import { useState } from 'react';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Activity, ShieldAlert, ToggleLeft, ToggleRight, Database, FlaskConical } from 'lucide-react';

// ── Default demo data (shown when no real data present) ───────────────────────
const DEMO = [
  { time: '00:00', normal: 42,  attacks: 0  },
  { time: '02:00', normal: 18,  attacks: 0  },
  { time: '04:00', normal: 12,  attacks: 5  },
  { time: '06:00', normal: 35,  attacks: 0  },
  { time: '08:00', normal: 120, attacks: 0  },
  { time: '10:00', normal: 180, attacks: 0  },
  { time: '12:00', normal: 210, attacks: 3  },
  { time: '14:00', normal: 195, attacks: 0  },
  { time: '16:00', normal: 167, attacks: 0  },
  { time: '18:00', normal: 88,  attacks: 0  },
  { time: '20:00', normal: 55,  attacks: 15 },
  { time: '22:00', normal: 30,  attacks: 8  },
  { time: '23:59', normal: 22,  attacks: 0  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2.5 text-xs space-y-1.5 border-slate-700/60 shadow-xl">
      <p className="font-mono text-slate-300 font-semibold border-b border-slate-700/60 pb-1.5 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span style={{ color: p.color }} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }}/>
            {p.name}
          </span>
          <span className="font-bold font-mono" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ForensicTimeline({ data }) {
  // Default = Demo mode; user can toggle to Live (DB) data
  const [showDemo, setShowDemo] = useState(true);

  const hasLiveData = !!(data?.length);
  const chartData   = showDemo ? DEMO : (hasLiveData ? data : null);

  const totalNormal  = (chartData ?? DEMO).reduce((s, d) => s + (d.normal  || 0), 0);
  const totalAttacks = (chartData ?? DEMO).reduce((s, d) => s + (d.attacks || 0), 0);
  const attackRate   = (totalNormal + totalAttacks) > 0
    ? ((totalAttacks / (totalNormal + totalAttacks)) * 100).toFixed(1)
    : '0.0';
  const rateColor = parseFloat(attackRate) > 5
    ? 'text-red-400' : parseFloat(attackRate) > 1
    ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Forensic Event Timeline</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Normal traffic vs. detected attack events · DBSCAN + MITRE ATT&CK</p>
        </div>

        {/* Demo / Live toggle */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowDemo(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-l-lg border text-[10px] font-mono font-medium transition-all ${
              showDemo
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900/60 border-slate-700/40 text-slate-500 hover:text-slate-400'
            }`}
          >
            <FlaskConical className="w-3 h-3" />
            Demo
          </button>
          <button
            onClick={() => setShowDemo(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-r-lg border text-[10px] font-mono font-medium transition-all ${
              !showDemo
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/60 border-slate-700/40 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Database className="w-3 h-3" />
            Live
            {hasLiveData && !showDemo && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2 text-center">
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wide">Normal Events</p>
          <p className="text-base font-bold text-cyan-400 font-mono leading-tight">{totalNormal.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-slate-900/60 border border-red-900/40 px-3 py-2 text-center">
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wide flex items-center justify-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5 text-red-400"/>Attack Events
          </p>
          <p className="text-base font-bold text-red-400 font-mono leading-tight">{totalAttacks.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-slate-900/60 border border-amber-900/40 px-3 py-2 text-center">
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wide">Attack Rate</p>
          <p className={`text-base font-bold font-mono leading-tight ${rateColor}`}>{attackRate}%</p>
        </div>
      </div>

      {/* Chart or no-data message */}
      {!chartData ? (
        <div className="flex flex-col items-center justify-center h-[265px] text-slate-600 gap-3">
          <Database className="w-10 h-10 opacity-30" />
          <p className="text-sm font-mono">No live data in database yet.</p>
          <p className="text-xs text-slate-700">Click <span className="text-amber-400 font-semibold">Demo</span> to see a sample chart, or click <span className="text-cyan-400 font-semibold">"Load Demo Data"</span> on the Logs page to seed the database.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={265}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
            <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b', paddingTop: 10 }} />

            {/* Reference lines only for demo mode with known time labels */}
            {showDemo && <>
              <ReferenceLine x="04:00" stroke="rgba(239,68,68,0.35)" strokeDasharray="4 3"
                label={{ value: '⚠ Recon', fill: '#f87171', fontSize: 9, position: 'top' }} />
              <ReferenceLine x="20:00" stroke="rgba(239,68,68,0.45)" strokeDasharray="4 3"
                label={{ value: '⚠ Exfil', fill: '#f87171', fontSize: 9, position: 'top' }} />
            </>}

            <Area type="monotone" dataKey="normal"  name="Normal Traffic" stroke="#06b6d4" strokeWidth={2}
              fill="url(#normalGrad)" dot={false} />
            <Bar  dataKey="attacks" name="Attack Events" fill="#ef4444" fillOpacity={0.85}
              radius={[3, 3, 0, 0]} maxBarSize={28} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

