import { NextResponse } from 'next/server';
import { getAllSessions, getProjects, estimateCost } from '@/lib/claude-sessions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await getProjects();
    const sessions = await getAllSessions();

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
