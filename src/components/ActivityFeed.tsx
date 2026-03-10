'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { OrchestratorEventType } from '@/app/api/orchestrator/events/route';

interface OrchestratorEvent {
  id: string;
  type: OrchestratorEventType;
  sessionId: string;
  project: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/* ─── Event metadata ───────────────────────────────────────────────── */

type EventMeta = {
  label: string;
  abbr: string;
  /** Tailwind text color */
  textColor: string;
  /** Tailwind bg for filled nodes */
  nodeBg: string;
  /** Tailwind border / ring color */
  nodeBorder: string;
  /** Tailwind glow shadow (box-shadow via inline or custom class) */
  glowColor: string;
  /** Node shape: circle | diamond | square | pulse */
  shape: 'circle' | 'diamond' | 'square' | 'pulse';
  /** Whether node is filled vs hollow */
  filled: boolean;
  /** Filter chip accent */
  chipBg: string;
  chipText: string;
};

const EVENT_META: Record<OrchestratorEventType, EventMeta> = {
  session_started: {
    label: 'Session Started',
    abbr: 'START',
    textColor: 'text-emerald-400',
    nodeBg: 'bg-emerald-500',
    nodeBorder: 'border-emerald-400',
    glowColor: '#10b981',
    shape: 'pulse',
    filled: true,
    chipBg: 'bg-emerald-500/15 border-emerald-500/30',
    chipText: 'text-emerald-400',
  },
  session_completed: {
    label: 'Session Ended',
    abbr: 'END',
    textColor: 'text-slate-400',
    nodeBg: 'bg-slate-500',
    nodeBorder: 'border-slate-400',
    glowColor: '#64748b',
    shape: 'square',
    filled: false,
    chipBg: 'bg-slate-500/15 border-slate-500/30',
    chipText: 'text-slate-400',
  },
  message_sent: {
    label: 'Message',
    abbr: 'MSG',
    textColor: 'text-blue-400',
    nodeBg: 'bg-blue-500',
    nodeBorder: 'border-blue-400',
    glowColor: '#3b82f6',
    shape: 'circle',
    filled: false,
    chipBg: 'bg-blue-500/15 border-blue-500/30',
    chipText: 'text-blue-400',
  },
  message_received: {
    label: 'Response',
    abbr: 'RES',
    textColor: 'text-cyan-400',
    nodeBg: 'bg-cyan-500',
    nodeBorder: 'border-cyan-400',
    glowColor: '#06b6d4',
    shape: 'circle',
    filled: true,
    chipBg: 'bg-cyan-500/15 border-cyan-500/30',
    chipText: 'text-cyan-400',
  },
  tool_invoked: {
    label: 'Tool Used',
    abbr: 'TOOL',
    textColor: 'text-amber-400',
    nodeBg: 'bg-amber-500',
    nodeBorder: 'border-amber-400',
    glowColor: '#f59e0b',
    shape: 'diamond',
    filled: true,
    chipBg: 'bg-amber-500/15 border-amber-500/30',
    chipText: 'text-amber-400',
  },
  token_usage: {
    label: 'Tokens',
    abbr: 'TOK',
    textColor: 'text-teal-400',
    nodeBg: 'bg-teal-500',
    nodeBorder: 'border-teal-400',
    glowColor: '#14b8a6',
    shape: 'diamond',
    filled: false,
    chipBg: 'bg-teal-500/15 border-teal-500/30',
    chipText: 'text-teal-400',
  },
  error: {
    label: 'Error',
    abbr: 'ERR',
    textColor: 'text-red-400',
    nodeBg: 'bg-red-500',
    nodeBorder: 'border-red-400',
    glowColor: '#ef4444',
    shape: 'diamond',
    filled: true,
    chipBg: 'bg-red-500/15 border-red-500/30',
    chipText: 'text-red-400',
  },
};

const ALL_TYPES: OrchestratorEventType[] = [
  'session_started',
  'session_completed',
  'message_sent',
  'message_received',
  'tool_invoked',
  'token_usage',
  'error',
];

/* ─── Helpers ──────────────────────────────────────────────────────── */

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatAbsTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getEventSummary(event: OrchestratorEvent): string {
  switch (event.type) {
    case 'message_sent':
    case 'message_received': {
      const content = String(event.data.content ?? '');
      return content.length > 120 ? content.slice(0, 120) + '…' : content;
    }
    case 'tool_invoked':
      return String(event.data.toolName ?? 'unknown');
    case 'token_usage': {
      const inp = Number(event.data.inputTokens ?? 0);
      const out = Number(event.data.outputTokens ?? 0);
      const model = String(event.data.model ?? '');
      const modelShort = model.split('/').pop() ?? model;
      return `${inp.toLocaleString()} in · ${out.toLocaleString()} out${modelShort ? ` · ${modelShort}` : ''}`;
    }
    case 'session_started':
      return event.data.model ? `Model: ${String(event.data.model)}` : '';
    case 'error': {
      const msg = String(event.data.message ?? '');
      return msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
    }
    default:
      return '';
  }
}

/* ─── Timeline Node ────────────────────────────────────────────────── */

function TimelineNode({ meta, isFirst }: { meta: EventMeta; isFirst: boolean }) {
  const baseSize = 'w-3 h-3';

  if (meta.shape === 'pulse') {
    return (
      <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
        {isFirst && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-60"
            style={{ backgroundColor: meta.glowColor }}
          />
        )}
        <span
          className={`relative ${baseSize} rounded-full ${meta.nodeBg}`}
          style={{ boxShadow: `0 0 8px ${meta.glowColor}` }}
        />
      </div>
    );
  }

  if (meta.shape === 'diamond') {
    return (
      <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
        <span
          className={`w-2.5 h-2.5 rotate-45 border ${meta.nodeBorder} ${meta.filled ? meta.nodeBg : 'bg-transparent'}`}
          style={meta.filled ? { boxShadow: `0 0 6px ${meta.glowColor}` } : undefined}
        />
      </div>
    );
  }

  if (meta.shape === 'square') {
    return (
      <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
        <span
          className={`w-2.5 h-2.5 border ${meta.nodeBorder} ${meta.filled ? meta.nodeBg : 'bg-transparent'}`}
        />
      </div>
    );
  }

  // circle
  return (
    <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
      <span
        className={`${baseSize} rounded-full border-2 ${meta.nodeBorder} ${meta.filled ? meta.nodeBg : 'bg-slate-950'}`}
        style={meta.filled ? { boxShadow: `0 0 6px ${meta.glowColor}` } : undefined}
      />
    </div>
  );
}

/* ─── Single Event Item ────────────────────────────────────────────── */

function EventItem({
  event,
  isLast,
  isNew,
  isFirst,
}: {
  event: OrchestratorEvent;
  isLast: boolean;
  isNew: boolean;
  isFirst: boolean;
}) {
  const meta = EVENT_META[event.type];
  const projectParts = event.project.replace(/^\//, '').split('/');
  const projectShort = projectParts.slice(-2).join('/');
  const summary = getEventSummary(event);

  const isError = event.type === 'error';

  return (
    <div
      className={`flex gap-0 group transition-all duration-500 ${isNew ? 'animate-[slideInDown_0.4s_ease-out]' : ''}`}
    >
      {/* Timeline spine column */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <TimelineNode meta={meta} isFirst={isFirst} />
        {!isLast && (
          <div
            className="w-px flex-1 mt-1"
            style={{
              background: `linear-gradient(to bottom, ${meta.glowColor}40, oklch(0.25 0.03 210))`,
              minHeight: '2rem',
            }}
          />
        )}
      </div>

      {/* Event card */}
      <div
        className={`flex-1 mb-3 ml-2 rounded-xl border transition-all duration-200 overflow-hidden
          ${isError ? 'border-red-500/40 bg-red-950/40' : isNew ? 'border-cyan-400/40 bg-cyan-950/60' : 'border-cyan-500/10 bg-cyan-950/25'}
          ${isError ? 'hover:border-red-400/50 hover:bg-red-950/50' : 'hover:border-cyan-400/30 hover:bg-cyan-950/50'} backdrop-blur-sm`}
        style={
          isNew || isError
            ? { boxShadow: `0 0 20px ${meta.glowColor}20, inset 0 0 20px ${meta.glowColor}08` }
            : undefined
        }
      >
        {/* Card header */}
        <div className="flex items-start justify-between px-3 pt-2.5 pb-1 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-[10px] font-bold tracking-widest font-mono px-1.5 py-0.5 rounded ${meta.chipBg} ${meta.chipText} border shrink-0`}
            >
              {meta.abbr}
            </span>
            <span className={`text-xs font-semibold ${meta.textColor} truncate`}>
              {meta.label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-500 font-mono tabular-nums hidden sm:block">
              {formatAbsTime(event.timestamp)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono tabular-nums whitespace-nowrap">
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
        </div>

        {/* Project link */}
        <div className="px-3 pb-1">
          <Link
            href={`/session/${event.sessionId}`}
            className="text-[11px] font-mono text-slate-500 hover:text-cyan-400 transition-colors truncate block"
            title={event.project}
          >
            {projectShort}
          </Link>
        </div>

        {/* Summary */}
        {summary && (
          <div className="px-3 pb-2.5">
            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 break-words">
              {summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Filter Chip ──────────────────────────────────────────────────── */

function FilterChip({
  type,
  active,
  count,
  onClick,
}: {
  type: OrchestratorEventType;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const meta = EVENT_META[type];
  return (
    <button
      onClick={onClick}
      title={active ? `Hide ${meta.label}` : `Show ${meta.label}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150 font-mono
        ${
          active
            ? `${meta.chipBg} ${meta.chipText} border-current/40`
            : 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:border-slate-600/50 hover:text-slate-400'
        }`}
    >
      <span className="tracking-wider">{meta.abbr}</span>
      {active && (
        <span className={`text-[9px] opacity-70 tabular-nums`}>{count}</span>
      )}
    </button>
  );
}

/* ─── Live Pulse Indicator ─────────────────────────────────────────── */

function LiveIndicator({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`relative flex h-2 w-2 shrink-0`}
      >
        {active && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-emerald-500' : 'bg-slate-600'}`}
        />
      </span>
      <span className={`text-[10px] font-mono tracking-wider ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
        {active ? 'LIVE' : 'PAUSED'}
      </span>
    </div>
  );
}

/* ─── Main ActivityFeed ────────────────────────────────────────────── */

export interface ActivityFeedProps {
  maxItems?: number;
  autoRefreshMs?: number;
  showFilters?: boolean;
  className?: string;
}

const PAGE_SIZE = 25;

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
  const [page, setPage] = useState(1);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const prevEventIds = useRef<Set<string>>(new Set());

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/orchestrator/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      const fetched = [...(data.events as OrchestratorEvent[])].reverse();

      // Track new events for animation
      const newIds = new Set<string>();
      fetched.forEach(e => {
        if (!prevEventIds.current.has(e.id)) newIds.add(e.id);
      });
      if (newIds.size > 0) {
        setNewEventIds(newIds);
        setTimeout(() => setNewEventIds(new Set()), 2000);
      }
      prevEventIds.current = new Set(fetched.map(e => e.id));

      setEvents(fetched);
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
    setPage(1);
  };

  const filteredEvents = events.filter(e => activeFilters.has(e.type));
  const visibleEvents = filteredEvents.slice(0, Math.min(page * PAGE_SIZE, maxItems));
  const hasMore = filteredEvents.length > visibleEvents.length;

  // Count per type for filter badges
  const countByType = ALL_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = events.filter(e => e.type === t).length;
    return acc;
  }, {});

  return (
    <div
      className={`flex flex-col rounded-2xl border border-cyan-500/15 bg-slate-950/80 backdrop-blur-md overflow-hidden ${className}`}
    >
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-cyan-500/10 bg-slate-900/60 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 tracking-wide">
                Activity Timeline
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 tabular-nums">
                {filteredEvents.length} events · showing {visibleEvents.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LiveIndicator active={!error} />
            <button
              onClick={() => { fetchEvents(); }}
              className="text-xs font-mono font-semibold text-emerald-400 hover:text-emerald-300 transition-all duration-150 border border-emerald-500/50 hover:border-emerald-400/70 bg-emerald-950/40 hover:bg-emerald-950/60 px-3.5 py-1.5 rounded-lg"
              style={{ boxShadow: '0 0 8px #10b98140, 0 0 16px #10b98120' }}
            >
              REFRESH
            </button>
          </div>
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div className="flex flex-wrap gap-1.5">
            {ALL_TYPES.map(type => (
              <FilterChip
                key={type}
                type={type}
                active={activeFilters.has(type)}
                count={countByType[type]}
                onClick={() => toggleFilter(type)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-[11px] font-mono text-slate-500 tracking-widest">
              LOADING EVENTS…
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-xs font-mono text-red-400 border border-red-500/20 bg-red-950/20 px-3 py-2 rounded-lg">
              {error}
            </span>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-8 h-px bg-slate-700" />
            <span className="text-[11px] font-mono text-slate-600 tracking-widest">
              NO EVENTS
            </span>
            <div className="w-8 h-px bg-slate-700" />
          </div>
        ) : (
          <>
            {visibleEvents.map((event, i) => (
              <EventItem
                key={event.id}
                event={event}
                isFirst={i === 0}
                isLast={i === visibleEvents.length - 1 && !hasMore}
                isNew={newEventIds.has(event.id)}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex flex-col items-center py-4 gap-2">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-700/50" />
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 border border-slate-700/50 hover:border-cyan-500/30 px-3 py-1.5 rounded-lg transition-all duration-150"
                  >
                    LOAD MORE · {filteredEvents.length - visibleEvents.length} remaining
                  </button>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-700/50" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
