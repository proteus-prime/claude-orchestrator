'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Cpu,
  MessageSquare,
  Zap,
  GitPullRequest,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Wrench,
  User,
  Bot,
  Terminal,
} from 'lucide-react';

interface Message {
  type: 'user' | 'assistant' | 'tool_result' | 'tool_call';
  timestamp: string;
  content: string;
  model?: string;
  toolName?: string;
  tokens?: {
    input: number;
    output: number;
  };
}

interface LinearIssue {
  issueNumber: number;
  issueId: string;
  title: string;
  url: string;
}

interface SessionPR {
  prUrl: string;
  prNumber: number;
  repo: string;
}

interface SessionDetail {
  sessionId: string;
  project: string;
  model: string;
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };
  messageCount: number;
  messages: Message[];
  linearIssue?: LinearIssue | null;
  pr?: SessionPR | null;
}

/* ─── Message Type Metadata ─────────────────────────────────────────── */

const MESSAGE_META = {
  user: {
    label: 'User',
    abbr: 'USER',
    icon: User,
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    glowColor: '#3b82f6',
    align: 'right' as const,
  },
  assistant: {
    label: 'Assistant',
    abbr: 'CLAUDE',
    icon: Bot,
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowColor: '#06b6d4',
    align: 'left' as const,
  },
  tool_call: {
    label: 'Tool Call',
    abbr: 'TOOL',
    icon: Wrench,
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    glowColor: '#f59e0b',
    align: 'left' as const,
  },
  tool_result: {
    label: 'Tool Result',
    abbr: 'RESULT',
    icon: Terminal,
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    glowColor: '#64748b',
    align: 'left' as const,
  },
};

/* ─── Helpers ───────────────────────────────────────────────────────── */

function formatTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const durMs = end - start;
  const durSec = Math.floor(durMs / 1000);
  const durMin = Math.floor(durSec / 60);
  const durHr = Math.floor(durMin / 60);
  
  if (durHr > 0) return `${durHr}h ${durMin % 60}m`;
  if (durMin > 0) return `${durMin}m ${durSec % 60}s`;
  return `${durSec}s`;
}

function truncateContent(content: string, maxLength: number = 500): { text: string; truncated: boolean } {
  if (content.length <= maxLength) return { text: content, truncated: false };
  return { text: content.slice(0, maxLength), truncated: true };
}

/* ─── Message Bubble Component ──────────────────────────────────────── */

function MessageBubble({ message, isCollapsed, onToggle }: { 
  message: Message; 
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const meta = MESSAGE_META[message.type] || MESSAGE_META.assistant;
  const Icon = meta.icon;
  const isToolMessage = message.type === 'tool_call' || message.type === 'tool_result';
  
  const { text: displayContent, truncated } = isCollapsed 
    ? truncateContent(message.content, isToolMessage ? 200 : 800)
    : { text: message.content, truncated: false };

  const isUser = message.type === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div 
        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${meta.bgColor} ${meta.borderColor}`}
        style={{ boxShadow: `0 0 12px ${meta.glowColor}20` }}
      >
        <Icon className={`w-4 h-4 ${meta.textColor}`} />
      </div>

      {/* Bubble */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className={`text-[10px] font-bold tracking-widest font-mono px-1.5 py-0.5 rounded ${meta.bgColor} ${meta.textColor} border ${meta.borderColor}`}>
            {meta.abbr}
          </span>
          {message.toolName && (
            <span className="text-[11px] font-mono text-slate-500">
              {message.toolName}
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-mono tabular-nums">
            {formatTime(message.timestamp)}
          </span>
          {message.tokens && (
            <span className="text-[10px] text-slate-600 font-mono">
              {message.tokens.input.toLocaleString()}↓ {message.tokens.output.toLocaleString()}↑
            </span>
          )}
        </div>

        {/* Content */}
        <div 
          className={`rounded-xl border backdrop-blur-sm overflow-hidden ${meta.bgColor} ${meta.borderColor}`}
          style={{ boxShadow: `0 0 20px ${meta.glowColor}08` }}
        >
          <pre className="whitespace-pre-wrap text-[13px] font-mono text-slate-300 p-3 leading-relaxed overflow-x-auto">
            {displayContent}
            {truncated && (
              <span className="text-slate-500">…</span>
            )}
          </pre>
          
          {(truncated || (!isCollapsed && message.content.length > 500)) && (
            <button
              onClick={onToggle}
              className="w-full px-3 py-1.5 text-[10px] font-mono text-slate-500 hover:text-cyan-400 border-t border-slate-700/30 flex items-center justify-center gap-1 transition-colors"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show full content ({message.content.length.toLocaleString()} chars)
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3" />
                  Collapse
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card Component ───────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, subValue }: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-cyan-500/10 bg-cyan-950/20 backdrop-blur-sm">
      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-cyan-400" />
      </div>
      <div>
        <p className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">{label}</p>
        <p className="text-sm font-semibold text-slate-200">{value}</p>
        {subValue && <p className="text-[10px] font-mono text-slate-500">{subValue}</p>}
      </div>
    </div>
  );
}

/* ─── Main Page Component ───────────────────────────────────────────── */

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedMessages, setCollapsedMessages] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) throw new Error('Failed to fetch session');
        const data = await res.json();
        setSession(data);
        
        // Auto-collapse long tool results
        const collapsed = new Set<number>();
        data.messages.forEach((msg: Message, idx: number) => {
          if ((msg.type === 'tool_result' || msg.type === 'tool_call') && msg.content.length > 300) {
            collapsed.add(idx);
          }
        });
        setCollapsedMessages(collapsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  const toggleCollapse = (idx: number) => {
    setCollapsedMessages(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center py-24 gap-3">
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
              LOADING SESSION…
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-xs font-mono text-red-400 border border-red-500/20 bg-red-950/20 px-4 py-2 rounded-lg">
              {error || 'Session not found'}
            </span>
            <Link
              href="/activity"
              className="text-[11px] font-mono text-slate-500 hover:text-cyan-400 transition-colors"
            >
              ← Back to Activity
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const projectShort = session.project.split('/').slice(-2).join('/');
  const modelShort = session.model.split('/').pop() || session.model;
  const hasTimestamps = session.messages.length > 0 && 
    session.messages[0].timestamp && 
    session.messages[session.messages.length - 1].timestamp;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-cyan-500/10 bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* Nav */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/activity"
              className="flex items-center gap-2 text-[11px] font-mono text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              BACK TO ACTIVITY
            </Link>
            
            {/* External Links */}
            <div className="flex items-center gap-2">
              {session.linearIssue && (
                <a
                  href={session.linearIssue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono
                    bg-violet-500/10 text-violet-400 border border-violet-500/30 
                    hover:bg-violet-500/20 hover:border-violet-500/50 transition-all"
                >
                  <span className="font-bold">{session.linearIssue.issueId}</span>
                  {session.linearIssue.title && (
                    <span className="hidden md:inline truncate max-w-[200px] opacity-70">
                      {session.linearIssue.title}
                    </span>
                  )}
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              )}
              {session.pr && (
                <a
                  href={session.pr.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono
                    bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 
                    hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all"
                >
                  <GitPullRequest className="w-3 h-3" />
                  <span className="font-bold">PR #{session.pr.prNumber}</span>
                  <span className="hidden md:inline opacity-70 truncate max-w-[120px]">
                    {session.pr.repo}
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              )}
            </div>
          </div>

          {/* Title & Project */}
          <div className="mb-4">
            <h1 className="text-lg font-semibold text-slate-100 mb-1">Session Detail</h1>
            <p className="text-[11px] font-mono text-slate-500" title={session.project}>
              {projectShort} · <span className="text-slate-600">{sessionId.slice(0, 8)}</span>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Cpu}
              label="Model"
              value={modelShort}
            />
            <StatCard
              icon={MessageSquare}
              label="Messages"
              value={session.messageCount.toLocaleString()}
            />
            <StatCard
              icon={Zap}
              label="Tokens"
              value={session.totalTokens.total.toLocaleString()}
              subValue={`${session.totalTokens.input.toLocaleString()} in · ${session.totalTokens.output.toLocaleString()} out`}
            />
            {hasTimestamps && (
              <StatCard
                icon={Clock}
                label="Duration"
                value={formatDuration(
                  session.messages[0].timestamp,
                  session.messages[session.messages.length - 1].timestamp
                )}
                subValue={new Date(session.messages[0].timestamp).toLocaleDateString()}
              />
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="space-y-4">
          {session.messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              isCollapsed={collapsedMessages.has(idx)}
              onToggle={() => toggleCollapse(idx)}
            />
          ))}
        </div>

        {/* End marker */}
        <div className="flex items-center justify-center py-8 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-slate-700/50" />
            <span className="text-[10px] font-mono text-slate-600 tracking-widest">
              END OF SESSION
            </span>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-slate-700/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
