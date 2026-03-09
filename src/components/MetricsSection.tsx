'use client';

import { Calendar, Clock, CheckCircle2, GitPullRequest, BarChart2, CalendarDays } from 'lucide-react';

export interface MetricsData {
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

interface MetricCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  subtext: string;
  accentClass: string;
  iconColorClass: string;
  valueColorClass?: string;
  children?: React.ReactNode;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  accentClass,
  iconColorClass,
  valueColorClass = 'text-slate-100',
  children,
}: MetricCardProps) {
  return (
    <div className="relative glass-card p-4 overflow-hidden hover:bg-slate-800/70 transition-all duration-200">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${accentClass}`} />
      <div className="flex items-start justify-between mb-2 pl-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          {label}
        </span>
        <div className="p-1.5 rounded-lg bg-slate-700/50">
          <Icon size={13} className={iconColorClass} />
        </div>
      </div>
      <div className="pl-2">
        <div className={`text-3xl font-bold tabular-nums tracking-tight ${valueColorClass}`}>
          {value}
        </div>
        <div className="text-xs text-slate-500 mt-1">{subtext}</div>
        {children}
      </div>
    </div>
  );
}

function IssuesTrendChart({
  data,
}: {
  data: { date: string; label: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 200;
  const H = 40;
  const padH = 6;
  const chartH = H - padH;
  const stepX = W / (data.length - 1);

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartH - (d.count / max) * chartH,
    ...d,
  }));

  const pathD =
    points.length > 1
      ? points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' ')
      : '';

  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${chartH} L 0 ${chartH} Z`
      : '';

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10">
        <defs>
          <linearGradient id="issuesTrendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {areaD && (
          <path d={areaD} fill="url(#issuesTrendGrad)" />
        )}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.count > 0 ? 2 : 1}
            fill={p.count > 0 ? '#8B5CF6' : '#475569'}
          />
        ))}
      </svg>
      <div className="flex justify-between mt-0.5">
        {data
          .filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2))
          .map((d, i) => (
            <span key={i} className="text-[9px] text-slate-600">
              {d.label}
            </span>
          ))}
      </div>
    </div>
  );
}

function SuccessRateArc({ percent }: { percent: number }) {
  const r = 14;
  const cx = 20;
  const cy = 20;
  const circumference = 2 * Math.PI * r;
  const arc = (percent / 100) * circumference;

  return (
    <div className="mt-2">
      <svg viewBox="0 0 40 40" className="w-10 h-10">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-slate-700/40"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#10B981"
          strokeWidth="4"
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text
          x={cx}
          y={cy + 3.5}
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          className="fill-emerald-400"
        >
          {percent}%
        </text>
      </svg>
    </div>
  );
}

export function MetricsSection({ metrics }: { metrics: MetricsData }) {
  const durationLabel =
    metrics.avgDurationMinutes >= 60
      ? `${Math.floor(metrics.avgDurationMinutes / 60)}h ${metrics.avgDurationMinutes % 60}m`
      : `${metrics.avgDurationMinutes}m`;

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <BarChart2 size={12} />
        Analytics
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Issues Today */}
        <MetricCard
          icon={Calendar}
          label="Issues Today"
          value={metrics.issuesThisDay.toString()}
          subtext="issues processed today"
          accentClass="bg-violet-500"
          iconColorClass="text-violet-400"
          valueColorClass="text-violet-300"
        />

        {/* Issues This Week */}
        <MetricCard
          icon={CalendarDays}
          label="Issues / Week"
          value={metrics.issuesThisWeek.toString()}
          subtext="past 7 days"
          accentClass="bg-purple-500"
          iconColorClass="text-purple-400"
          valueColorClass="text-purple-300"
        >
          <IssuesTrendChart data={metrics.issuesPerDay} />
        </MetricCard>

        {/* Avg Duration */}
        <MetricCard
          icon={Clock}
          label="Avg Duration"
          value={metrics.avgDurationMinutes === 0 ? '—' : durationLabel}
          subtext="per worker session"
          accentClass="bg-sky-500"
          iconColorClass="text-sky-400"
          valueColorClass="text-sky-300"
        />

        {/* Success Rate */}
        <MetricCard
          icon={CheckCircle2}
          label="Success Rate"
          value={`${metrics.successRate}%`}
          subtext="issues with PR created"
          accentClass="bg-emerald-500"
          iconColorClass="text-emerald-400"
          valueColorClass="text-emerald-300"
        >
          <SuccessRateArc percent={metrics.successRate} />
        </MetricCard>

        {/* PRs Created */}
        <MetricCard
          icon={GitPullRequest}
          label="PRs Created"
          value={metrics.prsCreated.toString()}
          subtext="pull requests opened"
          accentClass="bg-teal-500"
          iconColorClass="text-teal-400"
          valueColorClass="text-teal-300"
        />
      </div>
    </div>
  );
}
