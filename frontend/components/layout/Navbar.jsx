'use client';
import { useEffect, useState } from 'react';
import { Bell, RefreshCw, User, Wifi, WifiOff } from 'lucide-react';
import { dashboardAPI } from '@/lib/api';

export default function Navbar({ title = 'Dashboard', subtitle = '' }) {
  const [user,      setUser]      = useState(null);
  const [mlOnline,  setMlOnline]  = useState(null);
  const [refreshing,setRefreshing]= useState(false);
  const [now,       setNow]       = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('cf_user');
    if (raw) setUser(JSON.parse(raw));

    // Clock
    const tick = () => setNow(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick(); const id = setInterval(tick, 1000);

    // ML health
    dashboardAPI.getMlHealth().then((r) => setMlOnline(r.data.allServicesOnline)).catch(() => setMlOnline(false));

    return () => clearInterval(id);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const r = await dashboardAPI.getMlHealth();
      setMlOnline(r.data.allServicesOnline);
    } catch { setMlOnline(false); }
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-6
                       border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      {/* Left: Title */}
      <div>
        <h1 className="text-base font-semibold text-slate-100 leading-none">{title}</h1>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <span className="font-hash text-slate-500 text-xs hidden sm:block">{now}</span>

        {/* ML Status pill */}
        {mlOnline !== null && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
            ${mlOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {mlOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{mlOnline ? 'ML Online' : 'ML Offline'}</span>
          </div>
        )}

        {/* Refresh */}
        <button onClick={handleRefresh}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Bell */}
        <button className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* User Avatar */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-slate-300 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-600 capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

