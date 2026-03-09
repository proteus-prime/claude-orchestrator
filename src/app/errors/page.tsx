'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { TriangleAlert, RefreshCw, Clock, ExternalLink } from 'lucide-react';

interface ErrorEvent {
  id: string;
  type: 'error';
  sessionId: string;
  project: string;
  timestamp: string;
  data: {
    message?: string;
    source?: string;
    toolUseId?: string;
    stackTrace?: string;
  };
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return `${Math.floor(diffMin / 1440)}d ago`;
}

function ErrorCard({ event }: { event: ErrorEvent }) {
  const [expanded, setExpanded] = useState(false);
  const projectParts = event.project.replace(/^\//, '').split('/');
  const projectShort = projectParts.slice(-2).join('/');

  return (
    <div className="bg-slate-900 border border-rose-800/40 rounded-xl p-4 hover:border-rose-700/60 transition-colors">
      <div className="flex items-start gap-3">
        <TriangleAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wide">
                {event.data.source === 'tool_result' ? 'Tool Error' : 'System Error'}
              </span>
              <span className="text-xs text-slate-500">·</span>
              <Link
                href={`/session/${event.sessionId}`}
                className="text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
                title={event.project}
              >
                {projectShort}
                <ExternalLink size={10} />
              </Link>
            </div>
            <div className="flex items-center gap-1 text-slate-500 shrink-0 text-xs tabular-nums">
              <Clock size={11} />
              <span title={formatTimestamp(event.timestamp)}>
                {formatRelativeTime(event.timestamp)}
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-[11px] text-slate-600 mb-2">{formatTimestamp(event.timestamp)}</p>

          {/* Error message */}
          <p className="text-sm text-rose-200 break-words leading-relaxed">
            {event.data.message ?? 'Unknown error'}
          </p>

          {/* Stack trace */}
          {event.data.stackTrace && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {expanded ? '▾ Hide' : '▸ Show'} stack trace
              </button>
              {expanded && (
                <pre className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap break-words">
                  {event.data.stackTrace}
                </pre>
              )}
            </div>
          )}

          {/* Session link */}
          <div className="mt-2 flex items-center gap-2">
            <Link
              href={`/session/${event.sessionId}`}
              className="text-xs text-slate-500 hover:text-cyan-400 transition-colors font-mono"
            >
              Session: {event.sessionId.slice(0, 16)}…
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ErrorsPage() {
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchErrors = useCallback(async () => {
    try {
      const res = await fetch('/api/orchestrator/events?type=error&limit=200');
      if (!res.ok) throw new Error('Failed to fetch error events');
      const data = await res.json();
      const evts = (data.events as ErrorEvent[]).reverse();
      setErrors(evts);
      setFetchError(null);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchErrors();
    const interval = setInterval(fetchErrors, 15000);
    return () => clearInterval(interval);
  }, [fetchErrors]);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <TriangleAlert size={18} className="text-rose-400" />
              Errors
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Error events detected from Claude Code sessions
            </p>
          </div>
          <button
            onClick={fetchErrors}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        {/* Fetch error banner */}
        {fetchError && (
          <div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 px-4 py-3 rounded-xl mb-4 text-sm">
            {fetchError}
          </div>
        )}

        {/* Count badge */}
        {!loading && (
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                errors.length > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {errors.length} {errors.length === 1 ? 'error' : 'errors'} detected
            </span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">Loading errors…</span>
            </div>
          </div>
        ) : errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <span className="text-emerald-400 text-xl">✓</span>
            </div>
            <p className="text-sm font-medium text-slate-400">No errors detected</p>
            <p className="text-xs text-slate-600 mt-1">All sessions are running cleanly</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {errors.map(event => (
              <ErrorCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
