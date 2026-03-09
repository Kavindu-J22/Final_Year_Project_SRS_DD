'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, AlertTriangle, Search, LogOut,
  Shield, Activity, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',      sub: 'Overview & Metrics' },
  { href: '/logs',      icon: FileText,         label: 'Log Viewer',     sub: 'DBSCAN Clustering' },
  { href: '/incidents', icon: AlertTriangle,    label: 'Incidents',      sub: 'MITRE ATT&CK' },
  { href: '/forensics', icon: Search,           label: 'Forensics',      sub: 'Digital Notary' },
];

export default function Sidebar() {
  const pathname      = usePathname();
  const router        = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_user');
    router.push('/login');
  };

  return (
    <aside className={clsx(
      'flex flex-col h-screen sticky top-0 border-r border-slate-800/60 bg-slate-950/90 backdrop-blur-xl transition-all duration-300 z-30',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-4 py-5 border-b border-slate-800/60', collapsed && 'justify-center')}>
        <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/10 rounded-lg border border-cyan-500/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-cyan-400" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-slate-100 leading-none">CloudForensics</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">v1.0 · MSSP Edition</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label, sub }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                active
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-glow-cyan'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
              )}>
              <Icon className={clsx('w-5 h-5 flex-shrink-0', active ? 'text-cyan-400' : 'group-hover:text-slate-300')} />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{label}</p>
                  <p className="text-[10px] text-slate-600 truncate">{sub}</p>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status indicator */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 live-dot flex-shrink-0" />
            <p className="text-[10px] text-slate-400 font-mono">ML Services Active</p>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            {['8001','8002','8003','8004'].map((p) => (
              <span key={p} className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                :{p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Collapse toggle + Logout */}
      <div className="border-t border-slate-800/60 p-2 space-y-1">
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all text-xs">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

