'use client';

interface Session {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  lastActivity: string | null;
  status: 'running' | 'completed' | 'unknown';
}

interface DashboardChartsProps {
  sessions: Session[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-xs">
        No token data
      </div>
    );
  }

  const cx = 50;
  const cy = 50;
  const r = 36;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * r;
  const gapDeg = 2;

  let startAngle = -90;
  const svgSegments = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / total;
      const sweepDeg = frac * 360 - gapDeg;
      const dashLen = (sweepDeg / 360) * circumference;
      const seg = {
        ...s,
        dashArray: `${Math.max(0, dashLen)} ${circumference}`,
        rotation: startAngle,
        frac,
      };
      startAngle += frac * 360;
      return seg;
    });

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-700/40"
      />
      {svgSegments.map((seg) => (
        <circle
          key={seg.label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeDasharray={seg.dashArray}
          strokeLinecap="butt"
          transform={`rotate(${seg.rotation} ${cx} ${cy})`}
        />
      ))}
      {/* Center text */}
      <text
        x={cx}
        y={cy - 5}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        className="fill-slate-100"
      >
        {formatTokens(total)}
      </text>
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontSize="5"
        className="fill-slate-400"
      >
        total tokens
      </text>
    </svg>
  );
}

function SessionTimeline({ sessions }: { sessions: Session[] }) {
  const BUCKETS = 12;
  const now = Date.now();
  const bucketMs = 3_600_000;

  const buckets = Array.from({ length: BUCKETS }, (_, i) => {
    const bucketTime = now - (BUCKETS - 1 - i) * bucketMs;
    const hour = new Date(bucketTime).getHours();
    return {
      label: `${hour.toString().padStart(2, '0')}h`,
      running: 0,
      completed: 0,
    };
  });

  for (const session of sessions) {
    if (!session.lastActivity) continue;
    const ageMs = now - new Date(session.lastActivity).getTime();
    const bucketIdx = Math.floor(ageMs / bucketMs);
    if (bucketIdx >= 0 && bucketIdx < BUCKETS) {
      const bucket = buckets[BUCKETS - 1 - bucketIdx];
      if (session.status === 'running') bucket.running++;
      else bucket.completed++;
    }
  }

  const maxCount = Math.max(...buckets.map((b) => b.running + b.completed), 1);
  const W = 280;
  const H = 88;
  const paddingBottom = 14;
  const chartH = H - paddingBottom;
  const barW = W / BUCKETS - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {buckets.map((bucket, i) => {
        const total = bucket.running + bucket.completed;
        const totalBarH = (total / maxCount) * chartH;
        const runH = (bucket.running / maxCount) * chartH;
        const compH = totalBarH - runH;
        const x = i * (W / BUCKETS) + 1;

        return (
          <g key={i}>
            {compH > 0 && (
              <rect
                x={x}
                y={chartH - totalBarH}
                width={barW}
                height={compH}
                fill="currentColor"
                className="text-slate-600/40"
                rx={1.5}
              />
            )}
            {runH > 0 && (
              <rect
                x={x}
                y={chartH - runH}
                width={barW}
                height={runH}
                fill="#10B981"
                rx={1.5}
              />
            )}
          </g>
        );
      })}
      {buckets.map((bucket, i) => {
        if (i % 3 !== 0) return null;
        return (
          <text
            key={`lbl-${i}`}
            x={i * (W / BUCKETS) + barW / 2}
            y={H - 2}
            textAnchor="middle"
            fontSize="5.5"
            className="fill-slate-500"
          >
            {bucket.label}
          </text>
        );
      })}
    </svg>
  );
}

export function DashboardCharts({ sessions }: DashboardChartsProps) {
  const totalInput = sessions.reduce((sum, s) => sum + s.inputTokens, 0);
  const totalOutput = sessions.reduce((sum, s) => sum + s.outputTokens, 0);
  const totalCached = sessions.reduce((sum, s) => sum + s.cacheReadTokens, 0);
  const grandTotal = totalInput + totalOutput + totalCached;

  const tokenSegments: DonutSegment[] = [
    { label: 'Input', value: totalInput, color: '#6366F1' },
    { label: 'Output', value: totalOutput, color: '#8B5CF6' },
    { label: 'Cached', value: totalCached, color: '#10B981' },
  ];

  const pct = (v: number) =>
    grandTotal > 0 ? `${((v / grandTotal) * 100).toFixed(0)}%` : '0%';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Token Distribution */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">
          Token Distribution
        </h3>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 shrink-0">
            <DonutChart segments={tokenSegments} />
          </div>
          <div className="flex-1 space-y-3">
            {tokenSegments.map((seg) => (
              <div key={seg.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-slate-400">{seg.label}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-medium text-slate-200">
                      {formatTokens(seg.value)}
                    </span>
                    <span className="text-slate-500 w-8 text-right">
                      {pct(seg.value)}
                    </span>
                  </div>
                </div>
                {/* Mini bar */}
                <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: pct(seg.value),
                      backgroundColor: seg.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session Activity Timeline */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200">
            Session Activity
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-emerald-500" />
              Running
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-slate-600" />
              Completed
            </div>
          </div>
        </div>
        <div className="h-28">
          <SessionTimeline sessions={sessions} />
        </div>
        <p className="text-xs text-slate-500 mt-1">Last 12 hours</p>
      </div>
    </div>
  );
}
