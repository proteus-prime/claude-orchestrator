'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, GitPullRequest } from 'lucide-react';
import { SessionCard } from '@/components/SessionCard';
import { StatsBar } from '@/components/StatsBar';
import { OrchestratorStatusBar } from '@/components/OrchestratorStatusBar';
import { DashboardCharts } from '@/components/DashboardCharts';

interface Session {
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

interface OrchestratorStatus {
  status: 'ok' | 'error';
  timestamp: string;
  orchestrator: {
    projectsTracked: number;
    totalSessions: number;
    activeSessions: number;
    totalTokens: number;
    totalCost: number;
  };
}

interface PipelinePR {
  prUrl: string;
  prNumber: number;
  repo: string;
  sessionId: string;
  project: string;
  createdAt: string | null;
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    activeSessions: 0,
    totalTokens: 0,
    totalCost: 0,
  });
  const [orchestratorStatus, setOrchestratorStatus] =
    useState<OrchestratorStatus | null>(null);
  const [prs, setPRs] = useState<PipelinePR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [sessionsRes, statusRes, prsRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/orchestrator/status'),
        fetch('/api/pipeline/prs'),
      ]);
      if (!sessionsRes.ok) throw new Error('Failed to fetch');
      const data = await sessionsRes.json();
      setSessions(data.sessions);
      setStats(data.stats);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setOrchestratorStatus(statusData);
      }
      if (prsRes.ok) {
        const prsData = await prsRes.json();
        setPRs(prsData.prs ?? []);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => fetchSessions(), 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Real-time Claude Code session monitoring
            </p>
          </div>
          <button
            onClick={() => fetchSessions(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all disabled:opacity-60"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 px-4 py-3 rounded-xl mb-5 text-sm">
            {error}
          </div>
        )}

        {/* Orchestrator Status */}
        <OrchestratorStatusBar orchestratorStatus={orchestratorStatus} />

        {/* Stats Cards */}
        <StatsBar stats={stats} />

        {/* Charts */}
        <DashboardCharts sessions={sessions} />

        {/* Pull Requests */}
        {prs.length > 0 && (
          <div className="mb-6 glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <GitPullRequest size={14} className="text-violet-400" />
                Recent Pull Requests
                <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full text-xs font-medium">
                  {prs.length}
                </span>
              </h2>
              <Link
                href="/pipeline"
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {prs.slice(0, 5).map((pr, i) => (
                <a
                  key={`${pr.prUrl}-${i}`}
                  href={pr.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs hover:bg-violet-500/20 transition-colors"
                  title={pr.project}
                >
                  <span className="font-semibold text-violet-300">
                    {pr.repo.split('/')[1] ?? pr.repo}
                  </span>
                  <span className="text-violet-400">
                    #{pr.prNumber}
                  </span>
                  {pr.createdAt && (
                    <span className="text-slate-500">
                      ·{' '}
                      {new Date(pr.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </a>
              ))}
              {prs.length > 5 && (
                <Link
                  href="/pipeline"
                  className="flex items-center px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-slate-400 hover:bg-slate-800/70 transition-colors"
                >
                  +{prs.length - 5} more
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Session Filter */}
        <div className="flex items-center gap-4 mb-4">
          <div className="inline-flex bg-slate-800/50 rounded-lg p-1 gap-0.5 border border-slate-700/50">
            {(['all', 'running', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-slate-700/70 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'running' && stats.activeSessions > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-xs font-medium leading-none">
                    {stats.activeSessions}
                  </span>
                )}
              </button>
            ))}
          </div>
          {!loading && (
            <span className="text-xs text-slate-500">
              {filteredSessions.length}{' '}
              {filteredSessions.length === 1 ? 'session' : 'sessions'}
            </span>
          )}
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">Loading sessions…</span>
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <p className="text-sm">
              No {filter === 'all' ? '' : filter + ' '}sessions found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => (
              <SessionCard key={session.sessionId} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
