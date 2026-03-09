import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getProjects } from '@/lib/claude-sessions';

export const dynamic = 'force-dynamic';

interface PipelinePR {
  prUrl: string;
  prNumber: number;
  repo: string;
  sessionId: string;
  project: string;
  createdAt: string | null;
}

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const GITHUB_PR_URL_PATTERN = /https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/;

async function extractPRsFromSession(filePath: string, sessionId: string, project: string): Promise<PipelinePR[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const prs: PipelinePR[] = [];

  let pendingPRToolUse = false;
  let pendingTimestamp: string | null = null;

  for (const line of lines) {
    try {
      const msg = JSON.parse(line);

      if (msg.type === 'assistant' && Array.isArray(msg.message?.content)) {
        pendingPRToolUse = false;
        for (const block of msg.message.content) {
          if (
            block.type === 'tool_use' &&
            block.name === 'Bash' &&
            typeof block.input?.command === 'string' &&
            block.input.command.includes('gh pr create')
          ) {
            pendingPRToolUse = true;
            pendingTimestamp = msg.timestamp ?? null;
            break;
          }
        }
      } else if (pendingPRToolUse && msg.type === 'tool_result') {
        const resultContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
        const match = resultContent.match(GITHUB_PR_URL_PATTERN);
        if (match) {
          prs.push({
            prUrl: match[0],
            prNumber: parseInt(match[2], 10),
            repo: match[1],
            sessionId,
            project: project.replace(/^-/, '').replace(/-/g, '/'),
            createdAt: pendingTimestamp,
          });
        }
        pendingPRToolUse = false;
        pendingTimestamp = null;
      } else {
        pendingPRToolUse = false;
        pendingTimestamp = null;
      }
    } catch {
      // Skip malformed lines
    }
  }

  return prs;
}

export async function GET() {
  try {
    const projects = await getProjects();
    const allPRs: PipelinePR[] = [];

    for (const projectDir of projects) {
      const fullPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
      try {
        const entries = await fs.readdir(fullPath);
        const jsonlFiles = entries.filter(e => e.endsWith('.jsonl'));

        for (const file of jsonlFiles) {
          const sessionId = file.replace('.jsonl', '');
          const filePath = path.join(fullPath, file);
          try {
            const prs = await extractPRsFromSession(filePath, sessionId, projectDir);
            allPRs.push(...prs);
          } catch (e) {
            console.error(`Error parsing ${file}:`, e);
          }
        }
      } catch {
        // Skip unreadable directories
      }
    }

    allPRs.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      prs: allPRs,
      summary: {
        total: allPRs.length,
      },
    });
  } catch (error) {
    console.error('Error fetching pipeline PRs:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to fetch pipeline PRs',
      },
      { status: 500 }
    );
  }
}
