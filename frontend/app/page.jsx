'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Root redirects to /dashboard (or /login if unauthenticated – handled in dashboard layout) */
export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Initialising…</p>
      </div>
    </div>
  );
}

