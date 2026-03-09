'use client';
import {
  ComposedChart, Area, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Activity } from 'lucide-react';

// ── Default demo data (shown when no real data yet) ───────────────────────────
const DEMO = [
  { time: '00:00', normal: 42,  attacks: 0  },
  { time: '02:00', normal: 18,  attacks: 0  },
  { time: '04:00', normal: 12,  attacks: 5  },   // Recon
  { time: '06:00', normal: 35,  attacks: 0  },
  { time: '08:00', normal: 120, attacks: 0  },
  { time: '10:00', normal: 180, attacks: 0  },
  { time: '12:00', normal: 210, attacks: 3  },   // Lateral movement
  { time: '14:00', normal: 195, attacks: 0  },
  { time: '16:00', normal: 167, attacks: 0  },
  { time: '18:00', normal: 88,  attacks: 0  },
  { time: '20:00', normal: 55,  attacks: 15 },   // Exfiltration spike
  { time: '22:00', normal: 30,  attacks: 8  },
  { time: '23:59', normal: 22,  attacks: 0  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs space-y-1 border-slate-700/60">
      <p className="font-mono text-slate-300 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function ForensicTimeline({ data }) {
  const chartData = data?.length ? data : DEMO;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Forensic Event Timeline</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Normal traffic vs. detected attack events (DBSCAN + MITRE ATT&CK)</p>
        </div>
        {!data?.length && (
          <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-mono">
            DEMO DATA
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="attackGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />

          {/* Attack spike reference lines */}
          <ReferenceLine x="04:00" stroke="rgba(239,68,68,0.3)" strokeDasharray="3 3" label={{ value: 'Recon', fill: '#f87171', fontSize: 9 }} />
          <ReferenceLine x="20:00" stroke="rgba(239,68,68,0.4)" strokeDasharray="3 3" label={{ value: 'Exfil', fill: '#f87171', fontSize: 9 }} />

          <Area type="monotone" dataKey="normal"  name="Normal Traffic" stroke="#06b6d4" strokeWidth={2} fill="url(#normalGrad)" dot={false} />
          <Area type="monotone" dataKey="attacks" name="Attack Events"  stroke="#ef4444" strokeWidth={2} fill="url(#attackGrad)"
            dot={{ fill: '#ef4444', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#ef4444' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

