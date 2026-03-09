'use client';

import { ActivityFeed } from '@/components/ActivityFeed';
import { useState, useEffect } from 'react';

function Scanline() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.025]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
      }}
    />
  );
}

function GridOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
      style={{
        backgroundImage:
          'linear-gradient(oklch(0.70 0.15 195) 1px, transparent 1px), linear-gradient(90deg, oklch(0.70 0.15 195) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    />
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl border border-cyan-500/10 bg-slate-900/60">
      <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">{label}</span>
      <span className="text-sm font-mono font-bold text-cyan-300 tabular-nums">{value}</span>
    </div>
  );
}

export default function ActivityPage() {
  const [now, setNow] = useState('');
  const [stats, setStats] = useState({ total: 0, sessions: 0, tools: 0 });

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch lightweight stats for the header
  useEffect(() => {
    fetch('/api/orchestrator/events')
      .then(r => r.json())
      .then(d => {
        const events = d.events ?? [];
        const sessions = new Set(events.map((e: { sessionId: string }) => e.sessionId)).size;
        const tools = events.filter((e: { type: string }) => e.type === 'tool_invoked').length;
        setStats({ total: events.length, sessions, tools });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden">
      {/* Background layers */}
      <GridOverlay />
      <Scanline />

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-10 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center top, oklch(0.70 0.15 195), transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* ── Page Header ── */}
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-cyan-500/70 tracking-[0.25em] uppercase">
                  Proteus Dev Hub
                </span>
                <span className="text-slate-700">/</span>
                <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
                  Activity
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="accent-gradient-text">Activity Timeline</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Real-time event stream · All Claude Code sessions
              </p>
            </div>

            {/* Live clock */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-mono text-emerald-400 tracking-widest">LIVE</span>
              </div>
              <span className="text-xl font-mono font-bold tabular-nums text-slate-300">
                {now}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-2 flex-wrap">
            <StatPill label="Events" value={stats.total.toLocaleString()} />
            <StatPill label="Sessions" value={stats.sessions} />
            <StatPill label="Tool Calls" value={stats.tools} />
            <div className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl border border-emerald-500/15 bg-emerald-950/20">
              <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">
                Refresh
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400">10s</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        </header>

        {/* ── Feed ── */}
        <ActivityFeed
          maxItems={100}
          autoRefreshMs={10000}
          showFilters={true}
          className="min-h-[60vh]"
        />

        {/* ── Footer ── */}
        <footer className="text-center">
          <p className="text-[10px] font-mono text-slate-700 tracking-widest">
            PROTEUS DEV HUB · AUTO-REFRESH ACTIVE · {now}
          </p>
        </footer>
      </div>
    </div>
  );
}
