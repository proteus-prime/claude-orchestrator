'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PipelineIssue {
  sessionId: string;
  project: string;
  type: string;
  severity: 'warning' | 'error';
  message: string;
  detectedAt: string;
}

interface PipelinePR {
  prUrl: string;
  prNumber: number;
  repo: string;
  sessionId: string;
  project: string;
  createdAt: string | null;
}

function IssueCard({ issue }: { issue: PipelineIssue }) {
  const typeLabels: Record<string, string> = {
    stalled_session: 'Stalled',
    high_cost: 'High Cost',
    high_token_usage: 'High Tokens',
  };

  const severityColors = {
    warning: 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600',
    error: 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600',
  };

  const badgeColors = {
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white',
  };

  return (
    <div className={`border rounded p-3 text-sm ${severityColors[issue.severity]}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {issue.project}
        </span>
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${badgeColors[issue.severity]}`}>
          {typeLabels[issue.type] ?? issue.type}
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed mb-2">
        {issue.message}
      </p>
      <Link
        href={`/session/${issue.sessionId}`}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono"
      >
        {issue.sessionId.slice(0, 8)}...
      </Link>
    </div>
  );
}

function PRCard({ pr }: { pr: PipelinePR }) {
  const formattedDate = pr.createdAt
    ? new Date(pr.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 rounded p-3 text-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {pr.repo}
        </span>
        <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500 text-white">
          #{pr.prNumber}
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-xs mb-2 truncate">
        {pr.project}
      </p>
      <div className="flex items-center justify-between">
        <a
          href={pr.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View PR
        </a>
        {formattedDate && (
          <span className="text-xs text-gray-400">{formattedDate}</span>
        )}
      </div>
    </div>
  );
}

interface KanbanColumn {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
  headerColor: string;
}

function Column({ title, count, children, headerColor }: Omit<KanbanColumn, 'id'>) {
  return (
    <div className="flex flex-col bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden min-h-64">
      <div className={`px-4 py-3 flex items-center justify-between ${headerColor}`}>
        <h2 className="font-semibold text-white text-sm">{title}</h2>
        <span className="bg-white/30 text-white px-2 py-0.5 rounded-full text-xs font-medium">
          {count}
        </span>
      </div>
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {count === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-xs py-8">No items</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [issues, setIssues] = useState<PipelineIssue[]>([]);
  const [prs, setPRs] = useState<PipelinePR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const [issuesRes, prsRes] = await Promise.all([
        fetch('/api/pipeline/issues'),
        fetch('/api/pipeline/prs'),
      ]);

      if (!issuesRes.ok || !prsRes.ok) throw new Error('Failed to fetch pipeline data');

      const [issuesData, prsData] = await Promise.all([
        issuesRes.json(),
        prsRes.json(),
      ]);

      setIssues(issuesData.issues ?? []);
      setPRs(prsData.prs ?? []);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stalledIssues = issues.filter(i => i.type === 'stalled_session');
  const alertIssues = issues.filter(i => i.type === 'high_cost' || i.type === 'high_token_usage');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pipeline
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lastRefresh
                ? `Updated ${lastRefresh.toLocaleTimeString()}`
                : 'Kanban view of pipeline status'}
            </p>
          </div>
          <button
            onClick={fetchData}
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

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading pipeline data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Column
              title="Stalled Sessions"
              count={stalledIssues.length}
              headerColor="bg-orange-500"
            >
              {stalledIssues.map((issue, i) => (
                <IssueCard key={`${issue.sessionId}-${i}`} issue={issue} />
              ))}
            </Column>

            <Column
              title="Cost & Token Alerts"
              count={alertIssues.length}
              headerColor="bg-yellow-600"
            >
              {alertIssues.map((issue, i) => (
                <IssueCard key={`${issue.sessionId}-${i}`} issue={issue} />
              ))}
            </Column>

            <Column
              title="Pull Requests"
              count={prs.length}
              headerColor="bg-purple-600"
            >
              {prs.map((pr, i) => (
                <PRCard key={`${pr.prUrl}-${i}`} pr={pr} />
              ))}
            </Column>
          </div>
        )}
      </div>
    </div>
  );
}
