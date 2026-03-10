'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  Clock,
  DollarSign,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Hash,
  Calendar,
  ChevronRight,
  Activity,
  GripVertical,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

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

type CardItem =
  | { kind: 'issue'; id: string; data: PipelineIssue }
  | { kind: 'pr'; id: string; data: PipelinePR };

type ColumnId = 'backlog' | 'todo' | 'inprogress' | 'done';

interface ColumnConfig {
  id: ColumnId;
  label: string;
  emoji: string;
  accent: string;
  headerGradient: string;
  borderColor: string;
  countStyle: string;
  emptyLabel: string;
  dropHighlight: string;
}

// ============================================================
// Config
// ============================================================

const COLUMNS: ColumnConfig[] = [
  {
    id: 'backlog',
    label: 'Backlog',
    emoji: '📋',
    accent: 'text-orange-400',
    headerGradient: 'from-orange-500/10 to-transparent',
    borderColor: 'border-orange-500/25',
    countStyle: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
    emptyLabel: 'No stalled sessions',
    dropHighlight: 'shadow-orange-500/10',
  },
  {
    id: 'todo',
    label: 'Todo',
    emoji: '📝',
    accent: 'text-yellow-400',
    headerGradient: 'from-yellow-500/10 to-transparent',
    borderColor: 'border-yellow-500/25',
    countStyle: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
    emptyLabel: 'No cost alerts',
    dropHighlight: 'shadow-yellow-500/10',
  },
  {
    id: 'inprogress',
    label: 'In Progress',
    emoji: '⚡',
    accent: 'text-cyan-400',
    headerGradient: 'from-cyan-500/10 to-transparent',
    borderColor: 'border-cyan-500/25',
    countStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    emptyLabel: 'No open pull requests',
    dropHighlight: 'shadow-cyan-500/10',
  },
  {
    id: 'done',
    label: 'Done',
    emoji: '✅',
    accent: 'text-emerald-400',
    headerGradient: 'from-emerald-500/10 to-transparent',
    borderColor: 'border-emerald-500/25',
    countStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    emptyLabel: 'Drag resolved items here',
    dropHighlight: 'shadow-emerald-500/10',
  },
];

// ============================================================
// Utilities
// ============================================================

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function extractLinearIssue(project: string): { id: string; url: string } | null {
  const match = project.match(/feature\/(\d+)\//);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const id = `THE-${num}`;
  return { id, url: `https://linear.app/theraai/issue/${id}` };
}

// ============================================================
// Issue Card
// ============================================================

interface IconProps { size?: number; className?: string; }

function IssueCard({
  issue,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  issue: PipelineIssue;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const TYPE_MAP: Record<string, { label: string; icon: ComponentType<IconProps>; iconClass: string }> = {
    stalled_session: { label: 'Stalled Session', icon: Clock, iconClass: 'text-orange-400' },
    high_cost: { label: 'High Cost', icon: DollarSign, iconClass: 'text-yellow-400' },
    high_token_usage: { label: 'High Token Usage', icon: TrendingUp, iconClass: 'text-yellow-400' },
  };
  const t = TYPE_MAP[issue.type] ?? { label: issue.type, icon: AlertTriangle, iconClass: 'text-slate-400' };
  const TypeIcon = t.icon;

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragEnd={onDragEnd}
      className={[
        'group glass-card p-3.5 cursor-grab active:cursor-grabbing select-none',
        'transition-all duration-200',
        issue.severity === 'error'
          ? 'border-red-500/30 hover:border-red-400/50'
          : 'border-orange-500/25 hover:border-orange-400/40',
        isDragging
          ? 'opacity-30 scale-[0.97]'
          : 'hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/30',
      ].join(' ')}
    >
      {/* Drag handle + header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-1.5 min-w-0">
          <GripVertical size={12} className="text-slate-600 group-hover:text-slate-500 mt-0.5 shrink-0 transition-colors" />
          <p className="text-sm font-medium text-slate-200 leading-snug truncate">
            {issue.project}
          </p>
        </div>
        <span className={[
          'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border',
          issue.severity === 'error'
            ? 'bg-red-500/20 text-red-300 border-red-500/30'
            : 'bg-orange-500/15 text-orange-300 border-orange-500/25',
        ].join(' ')}>
          {issue.severity === 'error' ? 'Critical' : 'Warn'}
        </span>
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-1.5 mb-2 pl-[18px]">
        <TypeIcon size={11} className={t.iconClass} />
        <span className={`text-xs ${t.iconClass}`}>{t.label}</span>
      </div>

      {/* Message */}
      <p className="text-xs text-slate-400 leading-relaxed mb-3 pl-[18px] line-clamp-2">
        {issue.message}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
        <div className="flex items-center gap-2">
          <Link
            href={`/session/${issue.sessionId}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 text-xs text-cyan-400/80 hover:text-cyan-300 font-mono transition-colors"
          >
            <ChevronRight size={10} />
            {issue.sessionId.slice(0, 8)}
          </Link>
          {extractLinearIssue(issue.project) && (
            <a
              href={extractLinearIssue(issue.project)!.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 text-xs text-violet-400/80 hover:text-violet-300 transition-colors"
            >
              <ExternalLink size={9} />
              {extractLinearIssue(issue.project)!.id}
            </a>
          )}
        </div>
        <span className="text-[10px] text-slate-500 flex items-center gap-1">
          <Clock size={9} />
          {timeAgo(issue.detectedAt)}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// PR Card
// ============================================================

function PRCard({
  pr,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  pr: PipelinePR;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragEnd={onDragEnd}
      className={[
        'group glass-card p-3.5 cursor-grab active:cursor-grabbing select-none',
        'border-cyan-500/25 hover:border-cyan-400/40 transition-all duration-200',
        isDragging
          ? 'opacity-30 scale-[0.97]'
          : 'hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/30',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-1.5 min-w-0">
          <GripVertical size={12} className="text-slate-600 group-hover:text-slate-500 mt-0.5 shrink-0 transition-colors" />
          <p className="text-sm font-medium text-slate-200 leading-snug truncate">
            {pr.repo}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
          <Hash size={8} />
          {pr.prNumber}
        </span>
      </div>

      {/* Project */}
      <div className="flex items-center gap-1.5 mb-3 pl-[18px]">
        <GitPullRequest size={11} className="text-cyan-400 shrink-0" />
        <span className="text-xs text-slate-400 truncate">{pr.project}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
        <div className="flex items-center gap-2">
          <a
            href={pr.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-cyan-400/80 hover:text-cyan-300 transition-colors"
          >
            <ExternalLink size={10} />
            View PR
          </a>
          <Link
            href={`/session/${pr.sessionId}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 text-xs text-slate-400/80 hover:text-slate-300 font-mono transition-colors"
          >
            <ChevronRight size={10} />
            Session
          </Link>
          {extractLinearIssue(pr.project) && (
            <a
              href={extractLinearIssue(pr.project)!.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 text-xs text-violet-400/80 hover:text-violet-300 transition-colors"
            >
              <ExternalLink size={9} />
              {extractLinearIssue(pr.project)!.id}
            </a>
          )}
        </div>
        {pr.createdAt && (
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Calendar size={9} />
            {timeAgo(pr.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Kanban Column
// ============================================================

function KanbanColumn({
  config,
  items,
  draggingId,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  config: ColumnConfig;
  items: CardItem[];
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (columnId: ColumnId) => void;
}) {
  const [dragDepth, setDragDepth] = useState(0);
  const isOver = dragDepth > 0 && draggingId !== null;

  return (
    <div
      className={[
        'flex flex-col min-w-[272px] w-[272px] flex-shrink-0',
        'rounded-2xl border overflow-hidden',
        'bg-cyan-950/30 backdrop-blur-sm',
        config.borderColor,
        'transition-all duration-200',
        isOver ? `shadow-xl ${config.dropHighlight} ring-1 ${config.borderColor}` : 'shadow-none',
      ].join(' ')}
      onDragEnter={() => setDragDepth(d => d + 1)}
      onDragLeave={() => setDragDepth(d => Math.max(0, d - 1))}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setDragDepth(0);
        onDrop(config.id);
      }}
    >
      {/* Column header */}
      <div className={[
        'px-4 py-3 border-b',
        `bg-gradient-to-b ${config.headerGradient}`,
        config.borderColor,
      ].join(' ')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] leading-none">{config.emoji}</span>
            <h2 className={`text-sm font-semibold tracking-wide ${config.accent}`}>
              {config.label}
            </h2>
          </div>
          <span className={[
            'inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5',
            'rounded-full text-xs font-bold border',
            config.countStyle,
          ].join(' ')}>
            {items.length}
          </span>
        </div>
      </div>

      {/* Cards area */}
      <div className={[
        'flex-1 p-3 flex flex-col gap-2 overflow-y-auto',
        'max-h-[calc(100vh-240px)] min-h-[180px]',
        isOver ? 'bg-white/[0.015]' : '',
        'transition-colors duration-150',
      ].join(' ')}>
        {items.length === 0 ? (
          <div className={[
            'flex flex-col items-center justify-center h-full min-h-[140px] gap-3 rounded-xl',
            'border-2 border-dashed',
            config.borderColor,
            'transition-all duration-200',
            isOver ? 'opacity-80 bg-white/[0.02] scale-[1.01]' : 'opacity-40',
          ].join(' ')}>
            <span className="text-2xl">{config.emoji}</span>
            <p className="text-xs text-slate-500 text-center px-4 leading-relaxed">
              {config.emptyLabel}
            </p>
          </div>
        ) : (
          items.map(item =>
            item.kind === 'issue' ? (
              <IssueCard
                key={item.id}
                issue={item.data}
                isDragging={draggingId === item.id}
                onDragStart={() => onDragStart(item.id)}
                onDragEnd={onDragEnd}
              />
            ) : (
              <PRCard
                key={item.id}
                pr={item.data}
                isDragging={draggingId === item.id}
                onDragStart={() => onDragStart(item.id)}
                onDragEnd={onDragEnd}
              />
            )
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// Loading Skeleton
// ============================================================

function ColumnSkeleton({ config }: { config: ColumnConfig }) {
  return (
    <div className={[
      'flex flex-col min-w-[272px] w-[272px] flex-shrink-0',
      'rounded-2xl border overflow-hidden',
      'bg-cyan-950/30 backdrop-blur-sm',
      config.borderColor,
    ].join(' ')}>
      <div className={`px-4 py-3 bg-gradient-to-b ${config.headerGradient} border-b ${config.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px]">{config.emoji}</span>
            <div className="h-4 w-16 bg-slate-700/50 rounded animate-pulse" />
          </div>
          <div className="h-5 w-7 bg-slate-700/50 rounded-full animate-pulse" />
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {[1, 2].map(i => (
          <div key={i} className="glass-card p-3.5 space-y-2">
            <div className="flex justify-between gap-2">
              <div className="h-3.5 w-2/3 bg-slate-700/50 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-700/50 rounded animate-pulse" />
            </div>
            <div className="h-3 w-1/3 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-3 w-full bg-slate-700/50 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-px w-full bg-slate-700/40 rounded" />
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-slate-700/50 rounded animate-pulse" />
              <div className="h-3 w-14 bg-slate-700/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Page
// ============================================================

export default function PipelinePage() {
  const [issues, setIssues] = useState<PipelineIssue[]>([]);
  const [prs, setPRs] = useState<PipelinePR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Track which column each card has been dragged to
  const [columnMap, setColumnMap] = useState<Record<string, ColumnId>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
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

      const newIssues: PipelineIssue[] = issuesData.issues ?? [];
      const newPRs: PipelinePR[] = prsData.prs ?? [];

      // Assign default columns only for items not yet manually placed
      setColumnMap(prev => {
        const next = { ...prev };
        newIssues.forEach(issue => {
          const id = `issue-${issue.sessionId}`;
          if (!(id in next)) {
            next[id] = issue.type === 'stalled_session' ? 'backlog' : 'todo';
          }
        });
        newPRs.forEach(pr => {
          const id = `pr-${pr.prUrl}`;
          if (!(id in next)) next[id] = 'inprogress';
        });
        return next;
      });

      setIssues(newIssues);
      setPRs(newPRs);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const allItems: CardItem[] = [
    ...issues.map(issue => ({ kind: 'issue' as const, id: `issue-${issue.sessionId}`, data: issue })),
    ...prs.map(pr => ({ kind: 'pr' as const, id: `pr-${pr.prUrl}`, data: pr })),
  ];

  const itemsByColumn = COLUMNS.reduce<Record<ColumnId, CardItem[]>>(
    (acc, col) => {
      acc[col.id] = allItems.filter(item => columnMap[item.id] === col.id);
      return acc;
    },
    { backlog: [], todo: [], inprogress: [], done: [] }
  );

  const handleDrop = useCallback((targetColumn: ColumnId) => {
    if (!draggingId) return;
    setColumnMap(prev => ({ ...prev, [draggingId]: targetColumn }));
    setDraggingId(null);
  }, [draggingId]);

  const totalItems = issues.length + prs.length;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-full">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold accent-gradient-text tracking-tight mb-1">
              Pipeline
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Activity size={11} />
                {totalItems} item{totalItems !== 1 ? 's' : ''} tracked
              </span>
              {lastRefresh && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 rounded-lg text-sm hover:bg-cyan-500/25 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm">
            <AlertTriangle size={15} />
            {error}
          </div>
        )}

        {/* Kanban board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {loading
            ? COLUMNS.map(col => <ColumnSkeleton key={col.id} config={col} />)
            : COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  config={col}
                  items={itemsByColumn[col.id]}
                  draggingId={draggingId}
                  onDragStart={setDraggingId}
                  onDragEnd={() => setDraggingId(null)}
                  onDrop={handleDrop}
                />
              ))
          }
        </div>
      </div>
    </div>
  );
}
