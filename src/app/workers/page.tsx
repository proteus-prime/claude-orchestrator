'use client';

import { useEffect, useState } from 'react';
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

const formatTokens = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const formatTime = (iso: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return date.toLocaleDateString();
};

function StatusBadge({ status }: { status: Worker['status'] }) {
  const styles = {
    running: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    unknown: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  };
  const dots = {
    running: 'bg-green-500',
    completed: 'bg-gray-400',
    unknown: 'bg-yellow-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-semibold text-gray-900 dark:text-white">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSessions: 0, activeSessions: 0, totalTokens: 0, totalCost: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchWorkers = async () => {
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
  };

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = workers.filter(w => filter === 'all' || w.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workers</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'All Claude Code worker sessions'}
            </p>
          </div>
          <button
            onClick={fetchWorkers}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="Active Workers"
            value={stats.activeSessions.toString()}
            sub={`of ${stats.totalSessions} total`}
          />
          <SummaryCard
            label="Total Sessions"
            value={stats.totalSessions.toString()}
          />
          <SummaryCard
            label="Total Tokens"
            value={formatTokens(stats.totalTokens)}
          />
          <SummaryCard
            label="Est. Cost"
            value={`$${stats.totalCost.toFixed(4)}`}
          />
        </div>

        {/* Filter tabs */}
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

        {/* Workers table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading workers...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {filter === 'all' ? '' : filter} workers found
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Project</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Model</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Msgs</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Input</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Output</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(worker => {
                  const modelShort = worker.model.split('/').pop() || worker.model;
                  return (
                    <tr
                      key={worker.sessionId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <StatusBadge status={worker.status} />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <Link
                          href={`/session/${worker.sessionId}`}
                          className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
                          title={worker.project}
                        >
                          {worker.project}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded text-xs">
                          {modelShort}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {worker.messageCount}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatTokens(worker.inputTokens)}
                        {worker.cacheReadTokens > 0 && (
                          <span className="text-green-600 dark:text-green-400 ml-1 text-xs">
                            ({formatTokens(worker.cacheReadTokens)}↩)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatTokens(worker.outputTokens)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        ${worker.estimatedCost.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 text-xs">
                        {formatTime(worker.lastActivity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
