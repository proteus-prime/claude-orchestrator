import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

export type OrchestratorEventType =
  | 'session_started'
  | 'session_completed'
  | 'message_sent'
  | 'message_received'
  | 'tool_invoked'
  | 'token_usage'
  | 'error';

export interface OrchestratorEvent {
  id: string;
  type: OrchestratorEventType;
  sessionId: string;
  project: string;
  timestamp: string;
  data: Record<string, unknown>;
}

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

async function getEventsForSession(
  projectDir: string,
  sessionId: string,
  filePath: string
): Promise<OrchestratorEvent[]> {
  const project = projectDir.replace(/^-/, '').replace(/-/g, '/');
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter((l) => l.trim());

  const events: OrchestratorEvent[] = [];
  let lineIndex = 0;
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;

  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      const timestamp: string = msg.timestamp || new Date(0).toISOString();
      lineIndex++;

      if (!firstTimestamp) firstTimestamp = timestamp;
      lastTimestamp = timestamp;

      const makeId = (suffix: string) =>
        `${sessionId}-${lineIndex}-${suffix}`;

      if (msg.type === 'user' && msg.message?.content) {
        // Detect tool result errors
        const contentBlocks = Array.isArray(msg.message.content)
          ? msg.message.content
          : [];
        for (const block of contentBlocks) {
          if (block.type === 'tool_result' && block.is_error) {
            const errContent =
              typeof block.content === 'string'
                ? block.content
                : Array.isArray(block.content)
                ? block.content
                    .filter((b: Record<string, unknown>) => b.type === 'text')
                    .map((b: Record<string, unknown>) => b.text)
                    .join('\n')
                : JSON.stringify(block.content);
            events.push({
              id: makeId(`error_tool_${block.tool_use_id ?? lineIndex}`),
              type: 'error',
              sessionId,
              project,
              timestamp,
              data: {
                message: errContent,
                source: 'tool_result',
                toolUseId: block.tool_use_id,
              },
            });
          }
        }

        events.push({
          id: makeId('message_sent'),
          type: 'message_sent',
          sessionId,
          project,
          timestamp,
          data: {
            content:
              typeof msg.message.content === 'string'
                ? msg.message.content
                : JSON.stringify(msg.message.content),
          },
        });
      }

      // Detect top-level error entries
      if (msg.type === 'error' || (msg.type === 'system' && msg.level === 'error')) {
        events.push({
          id: makeId('error_system'),
          type: 'error',
          sessionId,
          project,
          timestamp,
          data: {
            message: msg.message ?? msg.error ?? JSON.stringify(msg),
            source: 'system',
            stackTrace: msg.stack ?? undefined,
          },
        });
      }

      if (msg.type === 'assistant' && msg.message) {
        const usage = msg.message.usage || {};
        const model: string = msg.message.model || 'unknown';

        if (Array.isArray(msg.message.content)) {
          for (const block of msg.message.content) {
            if (block.type === 'text') {
              events.push({
                id: makeId('message_received'),
                type: 'message_received',
                sessionId,
                project,
                timestamp,
                data: {
                  content: block.text,
                  model,
                },
              });
            } else if (block.type === 'tool_use') {
              events.push({
                id: makeId(`tool_invoked_${block.name}`),
                type: 'tool_invoked',
                sessionId,
                project,
                timestamp,
                data: {
                  toolName: block.name,
                  input: block.input,
                },
              });
            }
          }
        }

        if (usage.input_tokens || usage.output_tokens) {
          events.push({
            id: makeId('token_usage'),
            type: 'token_usage',
            sessionId,
            project,
            timestamp,
            data: {
              model,
              inputTokens: usage.input_tokens || 0,
              outputTokens: usage.output_tokens || 0,
              cacheReadTokens: usage.cache_read_input_tokens || 0,
              cacheWriteTokens: usage.cache_creation_input_tokens || 0,
            },
          });
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  // Emit session lifecycle events based on first/last timestamps
  if (firstTimestamp) {
    events.unshift({
      id: `${sessionId}-0-session_started`,
      type: 'session_started',
      sessionId,
      project,
      timestamp: firstTimestamp,
      data: {},
    });
  }

  if (lastTimestamp) {
    const stat = await fs.stat(filePath);
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const isCompleted = stat.mtimeMs <= fiveMinAgo;

    if (isCompleted) {
      events.push({
        id: `${sessionId}-${lineIndex + 1}-session_completed`,
        type: 'session_completed',
        sessionId,
        project,
        timestamp: lastTimestamp,
        data: {},
      });
    }
  }

  return events;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterSessionId = searchParams.get('sessionId');
  const filterType = searchParams.get('type') as OrchestratorEventType | null;
  const since = searchParams.get('since');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : null;

  const sinceDate = since ? new Date(since) : null;

  try {
    const projectDirs = await fs.readdir(CLAUDE_PROJECTS_DIR).catch(() => [] as string[]);
    const allEvents: OrchestratorEvent[] = [];

    for (const projectDir of projectDirs) {
      if (!projectDir.startsWith('-')) continue;

      const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);

      let files: string[];
      try {
        files = await fs.readdir(projectPath);
      } catch {
        continue;
      }

      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

      for (const file of jsonlFiles) {
        const sessionId = file.replace('.jsonl', '');

        if (filterSessionId && sessionId !== filterSessionId) continue;

        const filePath = path.join(projectPath, file);
        try {
          const events = await getEventsForSession(projectDir, sessionId, filePath);
          allEvents.push(...events);
        } catch {
          // Skip unreadable session files
        }
      }
    }

    // Sort by timestamp ascending
    allEvents.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Apply filters
    let filtered = allEvents;

    if (filterType) {
      filtered = filtered.filter((e) => e.type === filterType);
    }

    if (sinceDate) {
      filtered = filtered.filter((e) => new Date(e.timestamp) > sinceDate);
    }

    if (limit !== null && !isNaN(limit)) {
      filtered = filtered.slice(0, limit);
    }

    return NextResponse.json({
      events: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error fetching orchestrator events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
