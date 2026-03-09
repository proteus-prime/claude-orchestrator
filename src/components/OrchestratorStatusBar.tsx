'use client';

import Link from 'next/link';
import { CheckCircle2, AlertCircle, FolderGit2, Clock, TriangleAlert } from 'lucide-react';

interface OrchestratorStatus {
  status: 'ok' | 'error';
  timestamp: string;
  orchestrator: {
    projectsTracked: number;
    totalSessions: number;
    activeSessions: number;
    totalTokens: number;
    totalCost: number;
    errorCount?: number;
  };
}

export function OrchestratorStatusBar({
  orchestratorStatus,
}: {
  orchestratorStatus: OrchestratorStatus | null;
}) {
  if (!orchestratorStatus) return null;

  const { status, timestamp, orchestrator } = orchestratorStatus;
  const errorCount = orchestrator.errorCount ?? 0;
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
          ? 'bg-emerald-950/40 border-emerald-800/40'
          : 'bg-rose-950/40 border-rose-800/40'
      }`}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        {isOk ? (
          <CheckCircle2
            size={13}
            className="text-emerald-400"
          />
        ) : (
          <AlertCircle size={13} className="text-rose-400" />
        )}
        <span
          className={`font-semibold ${
            isOk
              ? 'text-emerald-400'
              : 'text-rose-400'
          }`}
        >
          Orchestrator {isOk ? 'Online' : 'Error'}
        </span>
      </div>

      <span className="text-slate-600 hidden sm:block">|</span>

      {/* Projects */}
      <div className="flex items-center gap-1.5 text-slate-400">
        <FolderGit2 size={12} />
        <span>
          <span className="font-semibold text-slate-200">
            {orchestrator.projectsTracked}
          </span>{' '}
          projects tracked
        </span>
      </div>

      <span className="text-slate-600 hidden sm:block">|</span>

      {/* Sessions */}
      <div className="flex items-center gap-1 text-slate-400">
        <span>
          <span className="font-semibold text-emerald-400">
            {orchestrator.activeSessions}
          </span>{' '}
          active
        </span>
        <span>/</span>
        <span>
          <span className="font-semibold text-slate-200">
            {orchestrator.totalSessions}
          </span>{' '}
          total sessions
        </span>
      </div>

      {/* Error count */}
      {errorCount > 0 && (
        <>
          <span className="text-slate-600 hidden sm:block">|</span>
          <Link
            href="/errors"
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors"
          >
            <TriangleAlert size={12} />
            <span className="font-semibold">{errorCount}</span>
            <span className="text-rose-400/80">{errorCount === 1 ? 'error' : 'errors'}</span>
          </Link>
        </>
      )}

      {/* Timestamp */}
      <div className="ml-auto flex items-center gap-1 text-slate-500">
        <Clock size={11} />
        <span>Updated {lastUpdated}</span>
      </div>
    </div>
  );
}
