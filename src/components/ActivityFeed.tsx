'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import type { OrchestratorEventType } from '@/app/api/orchestrator/events/route';

interface OrchestratorEvent {
  id: string;
  type: OrchestratorEventType;
  sessionId: string;
  project: string;
  timestamp: string;
  data: Record<string, unknown>;
}

const EVENT_CONFIG: Record<
  OrchestratorEventType,
  { label: string; icon: string; textColor: string; dotColor: string; activeBg: string }
> = {
  session_started: {
    label: 'Session Started',
    icon: '▶',
    textColor: 'text-green-600 dark:text-green-400',
    dotColor: 'bg-green-500',
    activeBg: 'bg-green-500',
  },
  session_completed: {
    label: 'Session Ended',
    icon: '■',
    textColor: 'text-gray-500 dark:text-gray-400',
    dotColor: 'bg-gray-400',
    activeBg: 'bg-gray-500',
  },
  message_sent: {
    label: 'Message',
    icon: '→',
    textColor: 'text-blue-600 dark:text-blue-400',
    dotColor: 'bg-blue-500',
    activeBg: 'bg-blue-500',
  },
  message_received: {
    label: 'Response',
    icon: '←',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    dotColor: 'bg-cyan-500',
    activeBg: 'bg-cyan-500',
  },
  tool_invoked: {
    label: 'Tool Used',
    icon: '⚙',
    textColor: 'text-orange-600 dark:text-orange-400',
    dotColor: 'bg-orange-500',
    activeBg: 'bg-orange-500',
  },
  token_usage: {
    label: 'Tokens',
    icon: '◈',
    textColor: 'text-teal-600 dark:text-teal-400',
    dotColor: 'bg-teal-500',
    activeBg: 'bg-teal-500',
  },
};

const ALL_TYPES: OrchestratorEventType[] = [
  'session_started',
  'session_completed',
  'message_sent',
  'message_received',
  'tool_invoked',
  'token_usage',
];

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getEventSummary(event: OrchestratorEvent): string {
  switch (event.type) {
    case 'message_sent':
    case 'message_received': {
      const content = String(event.data.content ?? '');
      return content.length > 100 ? content.slice(0, 100) + '…' : content;
    }
    case 'tool_invoked':
      return String(event.data.toolName ?? 'unknown');
    case 'token_usage': {
      const inp = Number(event.data.inputTokens ?? 0);
      const out = Number(event.data.outputTokens ?? 0);
      const model = String(event.data.model ?? '');
      const modelShort = model.split('/').pop() ?? model;
      return `${inp.toLocaleString()} in / ${out.toLocaleString()} out${modelShort ? ` · ${modelShort}` : ''}`;
    }
    default:
      return '';
  }
}

function EventItem({ event }: { event: OrchestratorEvent }) {
  const config = EVENT_CONFIG[event.type];
  const projectParts = event.project.replace(/^\//, '').split('/');
  const projectShort = projectParts.slice(-2).join('/');
  const summary = getEventSummary(event);

  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex flex-col items-center pt-1 shrink-0">
        <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        <div className="w-px flex-1 bg-gray-100 dark:bg-gray-800 mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={`text-xs font-semibold ${config.textColor}`}>
            {config.icon} {config.label}
          </span>
          <span className="text-xs text-gray-400 shrink-0 tabular-nums">
            {formatRelativeTime(event.timestamp)}
          </span>
        </div>
        <Link
          href={`/session/${event.sessionId}`}
          className="text-xs font-mono text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 truncate block"
          title={event.project}
        >
          {projectShort}
        </Link>
        {summary && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2 break-words">
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}

export interface ActivityFeedProps {
  maxItems?: number;
  autoRefreshMs?: number;
  showFilters?: boolean;
  className?: string;
}

export function ActivityFeed({
  maxItems = 50,
  autoRefreshMs = 10000,
  showFilters = true,
  className = '',
}: ActivityFeedProps) {
  const [events, setEvents] = useState<OrchestratorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<OrchestratorEventType>>(
    new Set(ALL_TYPES)
  );

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/orchestrator/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      // Reverse to show newest-first
      setEvents([...(data.events as OrchestratorEvent[])].reverse());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, autoRefreshMs);
    return () => clearInterval(interval);
  }, [fetchEvents, autoRefreshMs]);

  const toggleFilter = (type: OrchestratorEventType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const visibleEvents = events.filter(e => activeFilters.has(e.type)).slice(0, maxItems);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Activity Feed</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{visibleEvents.length} events</span>
            <button
              onClick={fetchEvents}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-1">
            {ALL_TYPES.map(type => {
              const config = EVENT_CONFIG[type];
              const active = activeFilters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  title={active ? `Hide ${config.label}` : `Show ${config.label}`}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? `${config.activeBg} text-white`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Event list */}
      <div className="px-4 overflow-y-auto flex-1">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading events…</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 text-sm">{error}</div>
        ) : visibleEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No events found</div>
        ) : (
          visibleEvents.map(event => <EventItem key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
