'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) throw new Error('Failed to fetch session');
        const data = await res.json();
        setSession(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  const formatTime = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString();
  };

  const typeColors: Record<string, string> = {
    user: 'bg-blue-100 dark:bg-blue-900 border-blue-300',
    assistant: 'bg-green-100 dark:bg-green-900 border-green-300',
    tool_call: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300',
    tool_result: 'bg-gray-100 dark:bg-gray-800 border-gray-300',
  };

  const typeLabels: Record<string, string> = {
    user: '👤 User',
    assistant: '🤖 Assistant',
    tool_call: '🔧 Tool Call',
    tool_result: '📤 Tool Result',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-500">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-red-500">{error || 'Session not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link
                href="/pipeline"
                className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                ← Pipeline
              </Link>
              <h1 className="text-xl font-bold">Session Detail</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {session.linearIssue && (
                <a
                  href={session.linearIssue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-md text-sm hover:bg-violet-500/30 transition-colors"
                >
                  <span className="font-semibold">{session.linearIssue.issueId}</span>
                  {session.linearIssue.title && (
                    <span className="hidden sm:inline truncate max-w-xs">{session.linearIssue.title}</span>
                  )}
                  <span className="text-xs opacity-70">↗</span>
                </a>
              )}
              {session.pr && (
                <a
                  href={session.pr.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md text-sm hover:bg-cyan-500/30 transition-colors"
                >
                  <span className="font-semibold">PR #{session.pr.prNumber}</span>
                  <span className="hidden sm:inline text-xs opacity-70 truncate max-w-[140px]">{session.pr.repo}</span>
                  <span className="text-xs opacity-70">↗</span>
                </a>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Project:</span>
              <p className="font-mono text-xs truncate" title={session.project}>{session.project}</p>
            </div>
            <div>
              <span className="text-gray-500">Model:</span>
              <p>{session.model}</p>
            </div>
            <div>
              <span className="text-gray-500">Messages:</span>
              <p>{session.messageCount}</p>
            </div>
            <div>
              <span className="text-gray-500">Tokens:</span>
              <p>{session.totalTokens.input.toLocaleString()} in / {session.totalTokens.output.toLocaleString()} out</p>
            </div>
          </div>
          {session.messages.length > 0 && session.messages[0].timestamp && session.messages[session.messages.length - 1].timestamp && (
            <div className="mt-3 pt-3 border-t border-gray-700/40 text-xs text-gray-500">
              {(() => {
                const start = new Date(session.messages[0].timestamp).getTime();
                const end = new Date(session.messages[session.messages.length - 1].timestamp).getTime();
                const durMs = end - start;
                const durMins = Math.floor(durMs / 60000);
                const durHrs = Math.floor(durMins / 60);
                const remainMins = durMins % 60;
                const durStr = durHrs > 0 ? `${durHrs}h ${remainMins}m` : `${durMins}m`;
                return `Duration: ${durStr} · Started ${new Date(session.messages[0].timestamp).toLocaleString()}`;
              })()}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {session.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-4 ${typeColors[msg.type] || 'bg-white'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">
                  {typeLabels[msg.type] || msg.type}
                  {msg.toolName && <span className="ml-2 text-gray-600">({msg.toolName})</span>}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTime(msg.timestamp)}
                  {msg.tokens && (
                    <span className="ml-2">
                      {msg.tokens.input}↓ {msg.tokens.output}↑
                    </span>
                  )}
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-sm font-mono bg-white/50 dark:bg-black/20 rounded p-2 overflow-x-auto max-h-96">
                {msg.content}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
