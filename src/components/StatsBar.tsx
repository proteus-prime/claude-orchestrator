'use client';

interface Stats {
  totalSessions: number;
  activeSessions: number;
  totalTokens: number;
  totalCost: number;
}

export function StatsBar({ stats }: { stats: Stats }) {
  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">Active Workers</div>
        <div className="text-2xl font-bold text-green-600">{stats.activeSessions}</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</div>
        <div className="text-2xl font-bold">{stats.totalSessions}</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">Total Tokens</div>
        <div className="text-2xl font-bold">{formatTokens(stats.totalTokens)}</div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">Est. Cost</div>
        <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
      </div>
    </div>
  );
}
