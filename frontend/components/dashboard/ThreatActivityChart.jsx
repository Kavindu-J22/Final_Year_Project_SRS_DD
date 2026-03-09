'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldAlert } from 'lucide-react';

const SEV_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#10b981' };
const DEMO_SEV   = [
  { name: 'CRITICAL', value: 3 },
  { name: 'HIGH',     value: 8 },
  { name: 'MEDIUM',   value: 14 },
  { name: 'LOW',      value: 22 },
];
const DEMO_RISK  = [
  { name: 'CRITICAL', value: 5 },
  { name: 'HIGH',     value: 19 },
  { name: 'MEDIUM',   value: 47 },
  { name: 'LOW',      value: 312 },
];

const MiniBar = ({ data, title, colors }) => (
  <ResponsiveContainer width="100%" height={140}>
    <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
      <Bar dataKey="value" name={title} radius={[4, 4, 0, 0]}>
        {data.map((entry) => <Cell key={entry.name} fill={colors[entry.name] || '#64748b'} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export default function ThreatActivityChart({ severityData, riskData, isDemo = false }) {
  const sev  = severityData?.length ? severityData.map((d) => ({ name: d._id || d.name, value: d.count || d.value })) : DEMO_SEV;
  const risk = riskData?.length     ? riskData.map((d)     => ({ name: d._id || d.name, value: d.count || d.value })) : DEMO_RISK;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-red-400" />
        <h3 className="text-sm font-semibold text-slate-200">Threat Distribution</h3>
        {isDemo && <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-mono ml-auto">DEMO</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-slate-500 font-medium mb-2 uppercase tracking-wider">Incident Severity</p>
          <MiniBar data={sev} title="Incidents" colors={SEV_COLORS} />
        </div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium mb-2 uppercase tracking-wider">Log Risk Levels</p>
          <MiniBar data={risk} title="Logs" colors={SEV_COLORS} />
        </div>
      </div>

      {/* Severity legend pills */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800/60">
        {Object.entries(SEV_COLORS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: v }} />
            <span className="text-[10px] text-slate-500">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

