import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface SessionStats {
  sessionId: string;
  project: string;
  model: string;
  status: 'running' | 'completed' | 'unknown';
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  toolCalls: string[];
  messageCount: number;
  lastActivity: Date | null;
  filePath: string;
}

export interface Message {
  type: 'user' | 'assistant' | 'tool_result';
  timestamp?: string;
  content?: string;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

export async function getProjects(): Promise<string[]> {
  try {
    const entries = await fs.readdir(CLAUDE_PROJECTS_DIR);
    return entries.filter(e => e.startsWith('-'));
  } catch {
    return [];
  }
}

export async function getSessionsForProject(projectDir: string): Promise<SessionStats[]> {
  const fullPath = path.join(CLAUDE_PROJECTS_DIR, projectDir);
  const sessions: SessionStats[] = [];
  
  try {
    const entries = await fs.readdir(fullPath);
    const jsonlFiles = entries.filter(e => e.endsWith('.jsonl'));
    
    for (const file of jsonlFiles) {
      const sessionId = file.replace('.jsonl', '');
      const filePath = path.join(fullPath, file);
      
      try {
        const stats = await parseSessionFile(filePath, sessionId, projectDir);
        sessions.push(stats);
      } catch (e) {
        // Skip invalid files
        console.error(`Error parsing ${file}:`, e);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  
  return sessions.sort((a, b) => {
    const aTime = a.lastActivity?.getTime() || 0;
    const bTime = b.lastActivity?.getTime() || 0;
    return bTime - aTime;
  });
}

async function parseSessionFile(filePath: string, sessionId: string, project: string): Promise<SessionStats> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  let model = 'unknown';
  const toolCalls: string[] = [];
  let messageCount = 0;
  let lastActivity: Date | null = null;
  
  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      messageCount++;
      
      if (msg.timestamp) {
        lastActivity = new Date(msg.timestamp);
      }
      
      if (msg.type === 'assistant' && msg.message) {
        if (msg.message.model) {
          model = msg.message.model;
        }
        
        if (msg.message.usage) {
          inputTokens += msg.message.usage.input_tokens || 0;
          outputTokens += msg.message.usage.output_tokens || 0;
          cacheReadTokens += msg.message.usage.cache_read_input_tokens || 0;
          cacheWriteTokens += msg.message.usage.cache_creation_input_tokens || 0;
        }
        
        if (Array.isArray(msg.message.content)) {
          for (const block of msg.message.content) {
            if (block.type === 'tool_use') {
              toolCalls.push(block.name);
            }
          }
        }
      }
    } catch {
      // Skip malformed lines
    }
  }
  
  // Check if session is still active (file modified in last 5 min)
  const stat = await fs.stat(filePath);
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const status = stat.mtimeMs > fiveMinAgo ? 'running' : 'completed';
  
  return {
    sessionId,
    project: project.replace(/^-/, '').replace(/-/g, '/'),
    model,
    status,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    toolCalls,
    messageCount,
    lastActivity,
    filePath,
  };
}

export async function getAllSessions(): Promise<SessionStats[]> {
  const projects = await getProjects();
  const allSessions: SessionStats[] = [];
  
  for (const project of projects) {
    const sessions = await getSessionsForProject(project);
    allSessions.push(...sessions);
  }
  
  return allSessions.sort((a, b) => {
    const aTime = a.lastActivity?.getTime() || 0;
    const bTime = b.lastActivity?.getTime() || 0;
    return bTime - aTime;
  });
}

export function estimateCost(stats: SessionStats): number {
  // Rough pricing estimates (per 1M tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-3-5-haiku': { input: 0.25, output: 1.25 },
    'claude-3-5-sonnet': { input: 3, output: 15 },
    'claude-sonnet-4': { input: 3, output: 15 },
    'claude-opus-4': { input: 15, output: 75 },
  };
  
  // Find matching pricing
  let rates = { input: 3, output: 15 }; // Default to Sonnet
  for (const [key, value] of Object.entries(pricing)) {
    if (stats.model.toLowerCase().includes(key.replace('claude-', ''))) {
      rates = value;
      break;
    }
  }
  
  // Cache reads are 90% cheaper
  const cacheRate = 0.1;
  const effectiveInput = stats.inputTokens - (stats.cacheReadTokens * (1 - cacheRate));
  
  const inputCost = (effectiveInput / 1_000_000) * rates.input;
  const outputCost = (stats.outputTokens / 1_000_000) * rates.output;
  
  return inputCost + outputCost;
}
