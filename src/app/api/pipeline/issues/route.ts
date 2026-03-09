import { NextResponse } from 'next/server';
import { getAllSessions, estimateCost, SessionStats } from '@/lib/claude-sessions';

export const dynamic = 'force-dynamic';

type IssueSeverity = 'warning' | 'error';

interface PipelineIssue {
  sessionId: string;
  project: string;
  type: string;
  severity: IssueSeverity;
  message: string;
  detectedAt: string;
}

const STALLED_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const HIGH_COST_THRESHOLD = 1.0; // $1.00
const HIGH_TOKEN_THRESHOLD = 500_000;

function detectIssues(session: SessionStats): PipelineIssue[] {
  const issues: PipelineIssue[] = [];
  const now = Date.now();
  const detectedAt = new Date().toISOString();

  // Stalled session: marked running but no activity for >30 min
  if (
    session.status === 'running' &&
    session.lastActivity &&
    now - session.lastActivity.getTime() > STALLED_THRESHOLD_MS
  ) {
    const idleMinutes = Math.floor((now - session.lastActivity.getTime()) / 60_000);
    issues.push({
      sessionId: session.sessionId,
      project: session.project,
      type: 'stalled_session',
      severity: 'warning',
      message: `Session has been idle for ${idleMinutes} minutes but is still marked as running`,
      detectedAt,
    });
  }

  // High cost session
  const cost = estimateCost(session);
  if (cost >= HIGH_COST_THRESHOLD) {
    issues.push({
      sessionId: session.sessionId,
      project: session.project,
      type: 'high_cost',
      severity: 'warning',
      message: `Session has accumulated $${cost.toFixed(2)} in estimated costs`,
      detectedAt,
    });
  }

  // High token usage
  const totalTokens = session.inputTokens + session.outputTokens;
  if (totalTokens >= HIGH_TOKEN_THRESHOLD) {
    issues.push({
      sessionId: session.sessionId,
      project: session.project,
      type: 'high_token_usage',
      severity: 'warning',
      message: `Session has used ${totalTokens.toLocaleString()} tokens`,
      detectedAt,
    });
  }

  return issues;
}

export async function GET() {
  try {
    const sessions = await getAllSessions();

    const issues: PipelineIssue[] = [];
    for (const session of sessions) {
      issues.push(...detectIssues(session));
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      issues,
      summary: {
        total: issues.length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        errors: issues.filter(i => i.severity === 'error').length,
      },
    });
  } catch (error) {
    console.error('Error fetching pipeline issues:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to fetch pipeline issues',
      },
      { status: 500 }
    );
  }
}
