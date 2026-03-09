'use client';

import { TrendingUp, Database, Zap, DollarSign } from 'lucide-react';

interface Stats {
  totalSessions: number;
  activeSessions: number;
  totalTokens: number;
  totalCost: number;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface StatCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  subtext: string;
  barPercent: number;
  accentClass: string;
  barClass: string;
  iconBgClass: string;
  iconColorClass: string;
  valueColorClass?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  barPercent,
  accentClass,
  barClass,
  iconBgClass,
  iconColorClass,
  valueColorClass = 'text-foreground',
}: StatCardProps) {
  return (
    <div className="relative bg-card rounded-xl border border-border p-4 overflow-hidden hover:shadow-md transition-all duration-200 group">
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${accentClass}`} />

      <div className="flex items-start justify-between mb-3 pl-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          {label}
        </span>
        <div className={`p-1.5 rounded-lg ${iconBgClass}`}>
          <Icon size={13} className={iconColorClass} />
        </div>
      </div>

      <div className="pl-2">
        <div className={`text-3xl font-bold tabular-nums tracking-tight ${valueColorClass}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{subtext}</div>

        <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barClass}`}
            style={{ width: `${Math.max(2, Math.min(100, barPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function StatsBar({ stats }: { stats: Stats }) {
  const activeRatio =
    stats.totalSessions > 0
      ? (stats.activeSessions / stats.totalSessions) * 100
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon={TrendingUp}
        label="Active Workers"
        value={stats.activeSessions.toString()}
        subtext={`of ${stats.totalSessions} total sessions`}
        barPercent={activeRatio}
        accentClass="bg-emerald-500"
        barClass="bg-emerald-500"
        iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
        iconColorClass="text-emerald-600 dark:text-emerald-400"
        valueColorClass="text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        icon={Database}
        label="Total Sessions"
        value={stats.totalSessions.toString()}
        subtext={`${stats.activeSessions} currently running`}
        barPercent={100}
        accentClass="bg-blue-500"
        barClass="bg-blue-500"
        iconBgClass="bg-blue-100 dark:bg-blue-900/30"
        iconColorClass="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        icon={Zap}
        label="Total Tokens"
        value={formatTokens(stats.totalTokens)}
        subtext="across all sessions"
        barPercent={Math.min(100, (stats.totalTokens / 1_000_000) * 100)}
        accentClass="bg-amber-500"
        barClass="bg-amber-500"
        iconBgClass="bg-amber-100 dark:bg-amber-900/30"
        iconColorClass="text-amber-600 dark:text-amber-400"
      />
      <StatCard
        icon={DollarSign}
        label="Est. Cost"
        value={`$${stats.totalCost.toFixed(2)}`}
        subtext="USD estimated total"
        barPercent={Math.min(100, (stats.totalCost / 5) * 100)}
        accentClass="bg-violet-500"
        barClass="bg-violet-500"
        iconBgClass="bg-violet-100 dark:bg-violet-900/30"
        iconColorClass="text-violet-600 dark:text-violet-400"
      />
    </div>
  );
}
