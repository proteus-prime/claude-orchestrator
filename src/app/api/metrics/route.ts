import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getAllSessions, getProjects, estimateCost } from '@/lib/claude-sessions';

export const dynamic = 'force-dynamic';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const GITHUB_PR_URL_PATTERN = /https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/;

// Cache for computed metrics (invalidated every 60 seconds)
let cachedMetrics: MetricsResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

interface MetricsResponse {
  issuesPerDay: { date: string; label: string; count: number }[];
  issuesThisDay: number;
  issuesThisWeek: number;
  avgDurationMinutes: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  prsCreated: number;
  computedAt: string;
}

async function getPRSessionIds(): Promise<Set<string>> {
  const projects = await getProjects();
  const sessionIds = new Set<string>();

  for (const projectDir of projects) {
    const fullPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
    try {
      const entries = await fs.readdir(fullPath);
      for (const file of entries.filter((e) => e.endsWith('.jsonl'))) {
        const sessionId = file.replace('.jsonl', '');
        const filePath = path.join(fullPath, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.trim().split('\n').filter((l) => l.trim());
          let pendingPRToolUse = false;
          for (const line of lines) {
            try {
              const msg = JSON.parse(line);
              if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
                pendingPRToolUse = msg.message.content.some(
                  (block: { type: string; name?: string; input?: { command?: string } }) =>
                    block.type === 'tool_use' &&
                    block.name === 'Bash' &&
                    typeof block.input?.command === 'string' &&
                    block.input.command.includes('gh pr create'),
                );
              } else if (pendingPRToolUse && msg.type === 'tool_result') {
                const resultContent =
                  typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
                if (GITHUB_PR_URL_PATTERN.test(resultContent)) {
                  sessionIds.add(sessionId);
                }
                pendingPRToolUse = false;
              } else {
                pendingPRToolUse = false;
              }
            } catch {
              // Skip malformed lines
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  return sessionIds;
}

async function getTotalPRCount(): Promise<number> {
  const projects = await getProjects();
  let count = 0;

  for (const projectDir of projects) {
    const fullPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
    try {
      const entries = await fs.readdir(fullPath);
      for (const file of entries.filter((e) => e.endsWith('.jsonl'))) {
        const filePath = path.join(fullPath, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.trim().split('\n').filter((l) => l.trim());
          let pendingPRToolUse = false;
          for (const line of lines) {
            try {
              const msg = JSON.parse(line);
              if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
                pendingPRToolUse = msg.message.content.some(
                  (block: { type: string; name?: string; input?: { command?: string } }) =>
                    block.type === 'tool_use' &&
                    block.name === 'Bash' &&
                    typeof block.input?.command === 'string' &&
                    block.input.command.includes('gh pr create'),
                );
              } else if (pendingPRToolUse && msg.type === 'tool_result') {
                const resultContent =
                  typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
                if (GITHUB_PR_URL_PATTERN.test(resultContent)) {
                  count++;
                }
                pendingPRToolUse = false;
              } else {
                pendingPRToolUse = false;
              }
            } catch {
              // Skip malformed lines
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  return count;
}

async function computeMetrics(): Promise<MetricsResponse> {
  const now = Date.now();

  const [sessions, sessionIdsWithPR, prsCreated] = await Promise.all([
    getAllSessions(),
    getPRSessionIds(),
    getTotalPRCount(),
  ]);

  // Issues per day (last 7 days, most recent last)
  const issuesPerDay = Array.from({ length: 7 }, (_, i) => {
    const dayOffset = 6 - i;
    const dayStart = new Date(now - dayOffset * 86_400_000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const dateStr = dayStart.toISOString().slice(0, 10);
    const label = dayStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const count = sessions.filter((s) => {
      if (!s.linearIssue || !s.lastActivity) return false;
      const t = s.lastActivity.getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;

    return { date: dateStr, label, count };
  });

  const issuesThisWeek = issuesPerDay.reduce((sum, d) => sum + d.count, 0);
  const issuesThisDay = issuesPerDay[issuesPerDay.length - 1].count;

  // Average worker duration (minutes) for completed sessions with timestamps
  const durations = sessions
    .filter((s) => s.status === 'completed' && s.startTime && s.lastActivity)
    .map((s) => (s.lastActivity!.getTime() - s.startTime!.getTime()) / 60_000)
    .filter((d) => d > 0);

  const avgDurationMinutes =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Success rate: sessions with a linear issue that produced a PR
  const issueSessions = sessions.filter((s) => s.linearIssue);
  const successCount = issueSessions.filter((s) => sessionIdsWithPR.has(s.sessionId)).length;
  const successRate =
    issueSessions.length > 0 ? Math.round((successCount / issueSessions.length) * 100) : 0;

  // Totals
  const totalTokens = sessions.reduce((sum, s) => sum + s.inputTokens + s.outputTokens, 0);
  const totalCost = sessions.reduce((sum, s) => sum + estimateCost(s), 0);

  return {
    issuesPerDay,
    issuesThisDay,
    issuesThisWeek,
    avgDurationMinutes,
    successRate,
    totalTokens,
    totalCost: Math.round(totalCost * 100) / 100,
    prsCreated,
    computedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (cachedMetrics && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json(cachedMetrics);
    }

    const metrics = await computeMetrics();
    cachedMetrics = metrics;
    cacheTimestamp = now;

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error computing metrics:', error);
    return NextResponse.json({ error: 'Failed to compute metrics' }, { status: 500 });
  }
}
