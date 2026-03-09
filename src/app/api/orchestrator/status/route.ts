import { NextResponse } from 'next/server';
import { getAllSessions, getProjects, estimateCost } from '@/lib/claude-sessions';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

async function countErrors(): Promise<number> {
  let count = 0;
  try {
    const projectDirs = await fs.readdir(CLAUDE_PROJECTS_DIR).catch(() => [] as string[]);
    for (const projectDir of projectDirs) {
      if (!projectDir.startsWith('-')) continue;
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
      let files: string[];
      try {
        files = await fs.readdir(projectPath);
      } catch {
        continue;
      }
      for (const file of files.filter(f => f.endsWith('.jsonl'))) {
        try {
          const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
          for (const line of content.trim().split('\n')) {
            try {
              const msg = JSON.parse(line);
              if (msg.type === 'error' || (msg.type === 'system' && msg.level === 'error')) {
                count++;
              }
              if (msg.type === 'user' && Array.isArray(msg.message?.content)) {
                count += msg.message.content.filter(
                  (b: Record<string, unknown>) => b.type === 'tool_result' && b.is_error
                ).length;
              }
            } catch {
              // skip
            }
          }
        } catch {
          // skip
        }
      }
    }
  } catch {
    // ignore
  }
  return count;
}

export async function GET() {
  try {
    const [projects, sessions, errorCount] = await Promise.all([
      getProjects(),
      getAllSessions(),
      countErrors(),
    ]);

    const activeSessions = sessions.filter(s => s.status === 'running');
    const totalTokens = sessions.reduce((sum, s) => sum + s.inputTokens + s.outputTokens, 0);
    const totalCost = sessions.reduce((sum, s) => sum + estimateCost(s), 0);

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      orchestrator: {
        projectsTracked: projects.length,
        totalSessions: sessions.length,
        activeSessions: activeSessions.length,
        totalTokens,
        totalCost: Math.round(totalCost * 100) / 100,
        errorCount,
      },
    });
  } catch (error) {
    console.error('Error fetching orchestrator status:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to fetch orchestrator status',
      },
      { status: 500 }
    );
  }
}
