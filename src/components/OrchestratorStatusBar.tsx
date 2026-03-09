'use client';

import { CheckCircle2, AlertCircle, FolderGit2, Clock } from 'lucide-react';

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

export function OrchestratorStatusBar({
  orchestratorStatus,
}: {
  orchestratorStatus: OrchestratorStatus | null;
}) {
  if (!orchestratorStatus) return null;

  const { status, timestamp, orchestrator } = orchestratorStatus;
  const lastUpdated = new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const isOk = status === 'ok';

  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 rounded-xl mb-5 border text-xs ${
        isOk
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50'
      }`}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        {isOk ? (
          <CheckCircle2
            size={13}
            className="text-emerald-600 dark:text-emerald-400"
          />
        ) : (
          <AlertCircle size={13} className="text-red-600 dark:text-red-400" />
        )}
        <span
          className={`font-semibold ${
            isOk
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-700 dark:text-red-400'
          }`}
        >
          Orchestrator {isOk ? 'Online' : 'Error'}
        </span>
      </div>

      <span className="text-border hidden sm:block">|</span>

      {/* Projects */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <FolderGit2 size={12} />
        <span>
          <span className="font-semibold text-foreground">
            {orchestrator.projectsTracked}
          </span>{' '}
          projects tracked
        </span>
      </div>

      <span className="text-border hidden sm:block">|</span>

      {/* Sessions */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {orchestrator.activeSessions}
          </span>{' '}
          active
        </span>
        <span>/</span>
        <span>
          <span className="font-semibold text-foreground">
            {orchestrator.totalSessions}
          </span>{' '}
          total sessions
        </span>
      </div>

      {/* Timestamp */}
      <div className="ml-auto flex items-center gap-1 text-muted-foreground">
        <Clock size={11} />
        <span>Updated {lastUpdated}</span>
      </div>
    </div>
  );
}
