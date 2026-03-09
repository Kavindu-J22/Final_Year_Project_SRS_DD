'use client';
import { useState, useEffect, useCallback } from 'react';
import { Filter, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import IncidentCard from '@/components/incidents/IncidentCard';
import { incidentsAPI } from '@/lib/api';

const SEVERITIES = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUSES   = ['', 'open', 'investigating', 'contained', 'resolved'];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [severity,  setSeverity]  = useState('');
  const [status,    setStatus]    = useState('');
  const [counts,    setCounts]    = useState({});

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (severity) params.severity = severity;
      if (status)   params.status   = status;
      const { data } = await incidentsAPI.getAll(params);
      const list = data.data ?? [];
      setIncidents(list);

      // compute count per severity
      const c = {};
      list.forEach(i => { c[i.severity] = (c[i.severity] ?? 0) + 1; });
      setCounts(c);
    } catch { setIncidents([]); }
    finally  { setLoading(false); }
  }, [severity, status]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await incidentsAPI.setStatus(id, newStatus);
      setIncidents(prev => prev.map(i => i._id === id ? { ...i, status: newStatus } : i));
    } catch (e) { console.error(e); }
  };

  const critCount = counts.CRITICAL ?? 0;
  const highCount = counts.HIGH ?? 0;
  const openCount = incidents.filter(i => i.status === 'open').length;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Incidents" subtitle="MITRE ATT&CK correlated security incidents" />

      <div className="flex-1 p-6 space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total',    value: incidents.length, color: 'text-slate-200', icon: ShieldCheck },
            { label: 'Open',     value: openCount,        color: 'text-red-400',   icon: AlertTriangle },
            { label: 'Critical', value: critCount,        color: 'text-red-400',   icon: AlertTriangle },
            { label: 'High',     value: highCount,        color: 'text-orange-400',icon: AlertTriangle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="glass-card p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{loading ? '…' : value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">Filter:</span>
          </div>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="input-field w-36 text-sm cursor-pointer"
          >
            {SEVERITIES.map(s => <option key={s} value={s}>{s || 'All Severities'}</option>)}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field w-40 text-sm cursor-pointer"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}</option>)}
          </select>

          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="btn-ghost flex items-center gap-2 text-sm ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Incident count */}
        <p className="text-xs text-slate-600">
          Showing <strong className="text-slate-400">{incidents.length}</strong> incident{incidents.length !== 1 ? 's' : ''}
          {severity && <> · Severity: <strong className="text-slate-400">{severity}</strong></>}
          {status   && <> · Status: <strong className="text-slate-400">{status}</strong></>}
        </p>

        {/* Incident Cards */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-5 h-36 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-2/3 mb-3" />
                <div className="h-3 bg-slate-800 rounded w-full mb-2" />
                <div className="h-3 bg-slate-800 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <div className="glass-card p-16 text-center text-slate-600">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            <p className="text-sm">No incidents found matching current filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((inc) => (
              <IncidentCard
                key={inc._id}
                incident={inc}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

