'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Worker {
  sessionId: string;
  project: string;
  model: string;
  status: 'running' | 'completed' | 'unknown';
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  toolCalls: string[];
  messageCount: number;
  lastActivity: string | null;
  estimatedCost: number;
}

interface Stats {
  totalSessions: number;
  activeSessions: number;
  totalTokens: number;
  totalCost: number;
}

// ─── Formatters ──────────────────────────────────────────────────────────────

const formatTokens = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
};

const formatRelativeTime = (iso: string | null): string => {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleDateString();
};

const formatElapsed = (iso: string | null): string => {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  const remSec = diffSec % 60;
  if (diffMin < 60) return `${diffMin}m ${remSec}s`;
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  return `${diffHr}h ${remMin}m`;
};

// ─── Token utilization: % of a 200k context window ───────────────────────────
const getTokenUtilization = (inputTokens: number): number => {
  const MAX_CONTEXT = 200_000;
  return Math.min(100, Math.round((inputTokens / MAX_CONTEXT) * 100));
};

const getModelShort = (model: string): string =>
  model.split('/').pop()?.replace('claude-', '') || model;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  running: {
    dot: 'bg-emerald-400',
    pulse: 'bg-emerald-400/40',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    label: 'Running',
    bar: 'from-cyan-400 to-emerald-400',
  },
  completed: {
    dot: 'bg-slate-500',
    pulse: '',
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
    label: 'Completed',
    bar: 'from-slate-500 to-slate-400',
  },
  unknown: {
    dot: 'bg-amber-400',
    pulse: 'bg-amber-400/30',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    label: 'Unknown',
    bar: 'from-amber-400 to-yellow-400',
  },
} as const;

// ─── Worker Card ──────────────────────────────────────────────────────────────

function WorkerCard({ worker, now }: { worker: Worker; now: number }) {
  const cfg = STATUS_CONFIG[worker.status];
  const utilPct = getTokenUtilization(worker.inputTokens);
  const modelShort = getModelShort(worker.model);
  const isRunning = worker.status === 'running';

  // Elapsed since last activity
  const lastIso = worker.lastActivity;
  const elapsedMs = lastIso ? now - new Date(lastIso).getTime() : null;
  const elapsedStr = lastIso ? formatElapsed(lastIso) : '—';

  const projectDisplay = worker.project.split('/').slice(-2).join('/');

  return (
    <Link
      href={`/session/${worker.sessionId}`}
      className={[
        'group block glass-card p-4 transition-all duration-200',
        'hover:bg-cyan-900/50 hover:border-cyan-400/35 hover:-translate-y-0.5',
        'hover:shadow-lg hover:shadow-black/30',
        isRunning ? 'border-cyan-500/30' : '',
      ].join(' ')}
    >
      {/* ── Card Header ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Status dot with pulse ring */}
          <div className="relative flex-shrink-0 mt-0.5">
            {cfg.pulse && (
              <span
                className={`absolute inset-0 rounded-full ${cfg.pulse} animate-ping`}
                style={{ animationDuration: '2s' }}
              />
            )}
            <span className={`relative block w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          </div>

          {/* Model name */}
          <span className="font-mono text-sm font-semibold text-cyan-200 truncate">
            {modelShort}
          </span>

          {/* Status badge */}
          <span
            className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${cfg.badge}`}
          >
            {cfg.label}
          </span>
        </div>

        {/* Elapsed time chip */}
        <div className="flex-shrink-0 text-right">
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {elapsedStr}
          </span>
        </div>
      </div>

      {/* ── Project ── */}
      <div className="flex items-center gap-1.5 mb-3">
        <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="font-mono text-xs text-slate-400 truncate" title={worker.project}>
          {projectDisplay}
        </span>
      </div>

      {/* ── Token utilization bar ── */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Context
          </span>
          <span className="font-mono text-[10px] text-slate-500 tabular-nums">
            {utilPct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${cfg.bar} transition-all duration-500`}
            style={{ width: `${Math.max(utilPct, 2)}%` }}
          />
        </div>
      </div>

      {/* ── Token stats ── */}
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <span className="font-mono text-xs text-slate-300 tabular-nums">
          {formatTokens(worker.inputTokens)}
          <span className="text-slate-500"> in</span>
        </span>
        <span className="text-slate-600">·</span>
        <span className="font-mono text-xs text-slate-300 tabular-nums">
          {formatTokens(worker.outputTokens)}
          <span className="text-slate-500"> out</span>
        </span>
        {worker.cacheReadTokens > 0 && (
          <>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-xs text-emerald-400/80 tabular-nums">
              {formatTokens(worker.cacheReadTokens)}
              <span className="text-emerald-500/60"> cached</span>
            </span>
          </>
        )}
        <span className="text-slate-600">·</span>
        <span className="font-mono text-xs font-semibold text-cyan-300 tabular-nums">
          ${worker.estimatedCost.toFixed(4)}
        </span>
      </div>

      {/* ── Footer: msgs + last activity ── */}
      <div className="flex items-center justify-between pt-2.5 border-t border-cyan-500/10">
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs text-slate-500 tabular-nums">
            {worker.messageCount} msgs
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-slate-500">
            {formatRelativeTime(worker.lastActivity)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="glass-card p-4 flex items-start gap-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
          {label}
        </div>
        <div className="text-xl font-bold text-cyan-100 tabular-nums leading-none">
          {value}
        </div>
        {sub && (
          <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
        )}
      </div>
    </div>
  );
}

// ─── Live refresh indicator ───────────────────────────────────────────────────

function RefreshIndicator({ lastRefresh, onRefresh }: { lastRefresh: Date | null; onRefresh: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const age = lastRefresh ? Math.floor((Date.now() - lastRefresh.getTime()) / 1000) : null;

  return (
    <div className="flex items-center gap-3">
      {lastRefresh && (
        <span className="text-xs text-slate-500 tabular-nums">
          updated {age === 0 ? 'just now' : `${age}s ago`}
        </span>
      )}
      <button
        onClick={onRefresh}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card hover:bg-cyan-900/50 hover:border-cyan-400/30 transition-all duration-150 text-xs font-medium text-slate-300"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>
  );
}

// ─── Filter tab ───────────────────────────────────────────────────────────────

function FilterTab({
  label,
  count,
  active,
  onClick,
  dot,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150',
        active
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent',
      ].join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      )}
      {label}
      {count !== undefined && (
        <span
          className={`tabular-nums px-1.5 py-0.5 rounded text-[10px] ${
            active ? 'bg-cyan-500/25 text-cyan-300' : 'bg-slate-700 text-slate-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="glass-card py-16 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center mb-1">
        <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="text-sm font-medium text-slate-400">
        No {filter === 'all' ? '' : filter + ' '}workers
      </div>
      <div className="text-xs text-slate-600 max-w-xs">
        {filter === 'running'
          ? 'No workers are currently active. Start a Claude Code session to see it here.'
          : 'Worker sessions will appear here once Claude Code is running.'}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    activeSessions: 0,
    totalTokens: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  // Live clock for elapsed times
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Failed to fetch workers');
      const data = await res.json();
      setWorkers(data.sessions);
      setStats(data.stats);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 5000);
    return () => clearInterval(interval);
  }, [fetchWorkers]);

  const runningCount = workers.filter(w => w.status === 'running').length;
  const completedCount = workers.filter(w => w.status === 'completed').length;

  const filtered = workers.filter(w => {
    if (filter === 'all') return true;
    return w.status === filter;
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-cyan-100 tracking-tight">
              Workers
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Claude Code worker sessions — live monitoring
            </p>
          </div>
          <RefreshIndicator lastRefresh={lastRefresh} onRefresh={fetchWorkers} />
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Active Workers"
            value={stats.activeSessions.toString()}
            sub={`of ${stats.totalSessions} total`}
            accent="bg-emerald-500/15 text-emerald-400"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            label="Total Sessions"
            value={stats.totalSessions.toString()}
            accent="bg-cyan-500/15 text-cyan-400"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            }
          />
          <StatCard
            label="Total Tokens"
            value={formatTokens(stats.totalTokens)}
            accent="bg-violet-500/15 text-violet-400"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
          />
          <StatCard
            label="Est. Cost"
            value={`$${stats.totalCost.toFixed(4)}`}
            accent="bg-amber-500/15 text-amber-400"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex items-center gap-2">
          <FilterTab
            label="All"
            count={workers.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterTab
            label="Running"
            count={runningCount}
            active={filter === 'running'}
            onClick={() => setFilter('running')}
            dot="bg-emerald-400 animate-pulse"
          />
          <FilterTab
            label="Completed"
            count={completedCount}
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
            dot="bg-slate-500"
          />
        </div>

        {/* ── Worker grid ── */}
        {loading ? (
          <div className="glass-card py-16 text-center text-slate-500 text-sm">
            <div className="inline-flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading workers…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(worker => (
              <WorkerCard key={worker.sessionId} worker={worker} now={now} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
