import { NextResponse } from 'next/server';
import { getAllSessions, estimateCost } from '@/lib/claude-sessions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessions = await getAllSessions();
    
    const enriched = sessions.map(session => ({
      ...session,
      estimatedCost: estimateCost(session),
      lastActivity: session.lastActivity?.toISOString() || null,
    }));
    
    // Aggregate stats
    const totalTokens = sessions.reduce((sum, s) => sum + s.inputTokens + s.outputTokens, 0);
    const totalCost = enriched.reduce((sum, s) => sum + s.estimatedCost, 0);
    const activeCount = sessions.filter(s => s.status === 'running').length;
    
    return NextResponse.json({
      sessions: enriched,
      stats: {
        totalSessions: sessions.length,
        activeSessions: activeCount,
        totalTokens,
        totalCost: Math.round(totalCost * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
