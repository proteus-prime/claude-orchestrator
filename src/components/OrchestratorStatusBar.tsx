'use client';

interface OrchestratorStatus {
  status: 'ok' | 'error';
  timestamp: string;
  orchestrator: {
    projectsTracked: number;
    totalSessions: number;
    activeSessions: number;
    totalTokens: number;
    totalCost: number;
  };
}

export function OrchestratorStatusBar({ orchestratorStatus }: { orchestratorStatus: OrchestratorStatus | null }) {
  if (!orchestratorStatus) return null;

  const { status, timestamp, orchestrator } = orchestratorStatus;
  const lastUpdated = new Date(timestamp).toLocaleTimeString();

  return (
    <div className={`flex items-center gap-4 px-4 py-2 rounded-lg mb-6 text-sm ${
      status === 'ok'
        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className={`font-medium ${status === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
          Orchestrator {status === 'ok' ? 'Online' : 'Error'}
        </span>
      </div>
      <span className="text-gray-400 dark:text-gray-600">|</span>
      <span className="text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-900 dark:text-white">{orchestrator.projectsTracked}</span> projects tracked
      </span>
      <span className="text-gray-400 dark:text-gray-600">|</span>
      <span className="text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-900 dark:text-white">{orchestrator.activeSessions}</span> active /{' '}
        <span className="font-medium text-gray-900 dark:text-white">{orchestrator.totalSessions}</span> total sessions
      </span>
      <span className="ml-auto text-gray-400 dark:text-gray-500 text-xs">
        Updated {lastUpdated}
      </span>
    </div>
  );
}
