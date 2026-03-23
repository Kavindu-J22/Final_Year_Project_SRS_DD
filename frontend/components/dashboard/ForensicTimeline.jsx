'use client';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Activity, ShieldAlert } from 'lucide-react';

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
  const chartData  = data?.length ? data : DEMO;
  const isLiveData = !!data?.length;

  const totalNormal  = chartData.reduce((s, d) => s + (d.normal  || 0), 0);
  const totalAttacks = chartData.reduce((s, d) => s + (d.attacks || 0), 0);
  const attackRate   = (totalNormal + totalAttacks) > 0
    ? ((totalAttacks / (totalNormal + totalAttacks)) * 100).toFixed(1)
    : '0.0';
  const rateColor = parseFloat(attackRate) > 5 ? 'text-red-400' : parseFloat(attackRate) > 1 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Forensic Event Timeline</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Normal traffic vs. detected attack events · DBSCAN + MITRE ATT&CK</p>
        </div>
        {isLiveData
          ? <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>LIVE DATA
            </span>
          : <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-mono">DEMO DATA</span>
        }
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

      {/* Chart */}
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

          {/* Reference lines only for demo data with known time labels */}
          {!isLiveData && <>
            <ReferenceLine x="04:00" stroke="rgba(239,68,68,0.35)" strokeDasharray="4 3"
              label={{ value: '⚠ Recon', fill: '#f87171', fontSize: 9, position: 'top' }} />
            <ReferenceLine x="20:00" stroke="rgba(239,68,68,0.45)" strokeDasharray="4 3"
              label={{ value: '⚠ Exfil', fill: '#f87171', fontSize: 9, position: 'top' }} />
          </>}

          <Area  type="monotone" dataKey="normal"  name="Normal Traffic" stroke="#06b6d4" strokeWidth={2}
            fill="url(#normalGrad)" dot={false} />
          <Bar   dataKey="attacks" name="Attack Events" fill="#ef4444" fillOpacity={0.85}
            radius={[3, 3, 0, 0]} maxBarSize={28} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

