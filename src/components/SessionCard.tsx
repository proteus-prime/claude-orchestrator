'use client';

import Link from 'next/link';

interface LinearIssue {
  issueNumber: number;
  issueId: string;
  title: string;
  url: string;
}

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
  linearIssue?: LinearIssue;
}

export function SessionCard({ session }: { session: Session }) {
  const statusColor = {
    running: 'bg-emerald-500',
    completed: 'bg-slate-500',
    unknown: 'bg-amber-500',
  }[session.status];

  const modelShort = session.model.split('/').pop() || session.model;

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Unknown';
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link href={`/session/${session.sessionId}`} className="block">
    <div className="glass-card-hover p-4 cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor} ${session.status === 'running' ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium text-slate-300">
            {session.status}
          </span>
        </div>
        <span className="text-xs text-slate-500">{formatTime(session.lastActivity)}</span>
      </div>

      <h3 className="font-mono text-sm text-slate-200 mb-1 truncate" title={session.project}>
        {session.project}
      </h3>

      {session.linearIssue && (
        <a
          href={session.linearIssue.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded text-xs hover:bg-teal-500/30 transition-colors"
          title={session.linearIssue.title || session.linearIssue.issueId}
        >
          <span className="font-medium">{session.linearIssue.issueId}</span>
          {session.linearIssue.title && (
            <span className="truncate max-w-[160px]">{session.linearIssue.title}</span>
          )}
        </a>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded text-xs">
          {modelShort}
        </span>
        <span className="text-xs text-slate-500">
          {session.messageCount} msgs
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Input:</span>
          <span className="ml-1 font-medium text-slate-300">{formatTokens(session.inputTokens)}</span>
          {session.cacheReadTokens > 0 && (
            <span className="text-emerald-400 ml-1">
              ({formatTokens(session.cacheReadTokens)} cached)
            </span>
          )}
        </div>
        <div>
          <span className="text-slate-500">Output:</span>
          <span className="ml-1 font-medium text-slate-300">{formatTokens(session.outputTokens)}</span>
        </div>
      </div>

      {session.toolCalls.length > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          Tools: {[...new Set(session.toolCalls)].slice(0, 5).join(', ')}
          {session.toolCalls.length > 5 && ` +${session.toolCalls.length - 5} more`}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between items-center">
        <span className="text-xs text-slate-500">Est. cost:</span>
        <span className="font-medium text-sm text-slate-200">${session.estimatedCost.toFixed(4)}</span>
      </div>
    </div>
    </Link>
  );
}
