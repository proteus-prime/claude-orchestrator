'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SessionCard } from '@/components/SessionCard';
import { StatsBar } from '@/components/StatsBar';
import { OrchestratorStatusBar } from '@/components/OrchestratorStatusBar';

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
  const [orchestratorStatus, setOrchestratorStatus] = useState<OrchestratorStatus | null>(null);
  const [prs, setPRs] = useState<PipelinePR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');

  const fetchSessions = async () => {
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
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const filteredSessions = sessions.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time Claude Code session monitoring
            </p>
          </div>
          <button
            onClick={fetchSessions}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <OrchestratorStatusBar orchestratorStatus={orchestratorStatus} />

        <StatsBar stats={stats} />

        {prs.length > 0 && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                Recent Pull Requests
                <span className="ml-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                  {prs.length}
                </span>
              </h2>
              <Link
                href="/pipeline"
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-md text-xs hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  title={pr.project}
                >
                  <span className="font-medium text-purple-700 dark:text-purple-300">
                    {pr.repo.split('/')[1] ?? pr.repo}
                  </span>
                  <span className="text-purple-500 dark:text-purple-400">#{pr.prNumber}</span>
                  {pr.createdAt && (
                    <span className="text-gray-400 dark:text-gray-500">
                      · {new Date(pr.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </a>
              ))}
              {prs.length > 5 && (
                <Link
                  href="/pipeline"
                  className="flex items-center px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  +{prs.length - 5} more
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {(['all', 'running', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'running' && stats.activeSessions > 0 && (
                <span className="ml-1 bg-green-500 text-white px-1.5 rounded-full text-xs">
                  {stats.activeSessions}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {filter === 'all' ? '' : filter} sessions found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map(session => (
              <SessionCard key={session.sessionId} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
