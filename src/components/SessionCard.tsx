'use client';

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
}

export function SessionCard({ session }: { session: Session }) {
  const statusColor = {
    running: 'bg-green-500',
    completed: 'bg-gray-400',
    unknown: 'bg-yellow-500',
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {session.status}
          </span>
        </div>
        <span className="text-xs text-gray-500">{formatTime(session.lastActivity)}</span>
      </div>
      
      <h3 className="font-mono text-sm text-gray-800 dark:text-gray-200 mb-1 truncate" title={session.project}>
        {session.project}
      </h3>
      
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
          {modelShort}
        </span>
        <span className="text-xs text-gray-500">
          {session.messageCount} msgs
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Input:</span>
          <span className="ml-1 font-medium">{formatTokens(session.inputTokens)}</span>
          {session.cacheReadTokens > 0 && (
            <span className="text-green-600 ml-1">
              ({formatTokens(session.cacheReadTokens)} cached)
            </span>
          )}
        </div>
        <div>
          <span className="text-gray-500">Output:</span>
          <span className="ml-1 font-medium">{formatTokens(session.outputTokens)}</span>
        </div>
      </div>
      
      {session.toolCalls.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Tools: {[...new Set(session.toolCalls)].slice(0, 5).join(', ')}
          {session.toolCalls.length > 5 && ` +${session.toolCalls.length - 5} more`}
        </div>
      )}
      
      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
        <span className="text-xs text-gray-500">Est. cost:</span>
        <span className="font-medium text-sm">${session.estimatedCost.toFixed(4)}</span>
      </div>
    </div>
  );
}
