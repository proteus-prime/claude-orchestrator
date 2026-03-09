import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

interface ParsedMessage {
  type: 'user' | 'assistant' | 'tool_result' | 'tool_call';
  timestamp: string;
  content: string;
  model?: string;
  toolName?: string;
  tokens?: {
    input: number;
    output: number;
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');
  
  try {
    // Find the session file
    const projects = await fs.readdir(claudeProjectsDir);
    let sessionFile: string | null = null;
    let projectName: string | null = null;
    
    for (const project of projects) {
      const projectPath = path.join(claudeProjectsDir, project);
      const stat = await fs.stat(projectPath);
      if (!stat.isDirectory()) continue;
      
      const files = await fs.readdir(projectPath);
      const match = files.find(f => f.startsWith(sessionId) && f.endsWith('.jsonl'));
      if (match) {
        sessionFile = path.join(projectPath, match);
        projectName = project;
        break;
      }
    }
    
    if (!sessionFile || !projectName) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Parse the session file
    const content = await fs.readFile(sessionFile, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    
    const messages: ParsedMessage[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let model = 'unknown';
    let linearIssue: { issueNumber: number; issueId: string; title: string; url: string } | undefined;

    // Try to extract Linear issue from project directory name first
    const dirMatch = projectName.match(/feature-(\d+)-/);
    if (dirMatch) {
      const issueNumber = parseInt(dirMatch[1], 10);
      const issueId = `THE-${issueNumber}`;
      linearIssue = { issueNumber, issueId, title: '', url: `https://linear.app/theraai/issue/${issueId}` };
    }

    for (const line of lines) {
      try {
        const msg = JSON.parse(line);

        if (msg.type === 'user' && msg.message?.content) {
          const content = typeof msg.message.content === 'string' ? msg.message.content : '';
          // Extract Linear issue title from first user message if not yet found with title
          if (linearIssue && !linearIssue.title) {
            const titleMatch = content.match(/You are working on Linear issue #\d+:\s*(.+)/);
            if (titleMatch) {
              linearIssue = { ...linearIssue, title: titleMatch[1].trim() };
            }
          } else if (!linearIssue) {
            const issueMatch = content.match(/You are working on Linear issue #(\d+):\s*(.+)/);
            if (issueMatch) {
              const issueNumber = parseInt(issueMatch[1], 10);
              const issueId = `THE-${issueNumber}`;
              linearIssue = {
                issueNumber,
                issueId,
                title: issueMatch[2].trim(),
                url: `https://linear.app/theraai/issue/${issueId}`,
              };
            }
          }
          messages.push({
            type: 'user',
            timestamp: msg.timestamp || '',
            content: typeof msg.message.content === 'string' 
              ? msg.message.content 
              : JSON.stringify(msg.message.content),
          });
        }
        
        if (msg.type === 'assistant' && msg.message) {
          if (msg.message.model) model = msg.message.model;
          
          const usage = msg.message.usage || {};
          totalInputTokens += usage.input_tokens || 0;
          totalOutputTokens += usage.output_tokens || 0;
          
          // Extract text content
          if (Array.isArray(msg.message.content)) {
            for (const block of msg.message.content) {
              if (block.type === 'text') {
                messages.push({
                  type: 'assistant',
                  timestamp: msg.timestamp || '',
                  content: block.text,
                  model: msg.message.model,
                  tokens: {
                    input: usage.input_tokens || 0,
                    output: usage.output_tokens || 0,
                  },
                });
              } else if (block.type === 'tool_use') {
                messages.push({
                  type: 'tool_call',
                  timestamp: msg.timestamp || '',
                  content: JSON.stringify(block.input, null, 2),
                  toolName: block.name,
                });
              }
            }
          }
        }
        
        if (msg.type === 'toolResult' || (msg.message?.role === 'toolResult')) {
          const result = msg.message || msg;
          messages.push({
            type: 'tool_result',
            timestamp: msg.timestamp || '',
            content: typeof result.content === 'string' 
              ? result.content 
              : JSON.stringify(result.content),
            toolName: result.toolName,
          });
        }
      } catch {
        // Skip malformed lines
      }
    }
    
    return NextResponse.json({
      sessionId,
      project: projectName.replace(/^-/, '').replace(/-/g, '/'),
      model,
      totalTokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      messageCount: messages.length,
      messages,
      linearIssue: linearIssue || null,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
