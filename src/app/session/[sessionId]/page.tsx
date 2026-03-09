'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">Session Detail</h1>
            {session.linearIssue && (
              <a
                href={session.linearIssue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-md text-sm hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
              >
                <span className="font-semibold">{session.linearIssue.issueId}</span>
                {session.linearIssue.title && (
                  <span className="hidden sm:inline truncate max-w-xs">{session.linearIssue.title}</span>
                )}
                <span className="text-xs opacity-70">↗</span>
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Project:</span>
              <p className="font-mono">{session.project}</p>
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
