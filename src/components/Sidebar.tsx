'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Activity, Users, GitPullRequest } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/workers', label: 'Workers', icon: Users },
  { href: '/pipeline', label: 'Pipeline', icon: GitPullRequest },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 flex flex-col w-60 bg-slate-900/80 backdrop-blur-md border-r border-slate-700/50 z-10"
    >
      {/* Header */}
      <div className="px-4 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">🔱</span>
          <div>
            <p className="text-[13px] font-semibold text-slate-100 leading-tight">
              Proteus Dev Hub
            </p>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
              Session Monitor
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700/50">
        <p className="text-[11px] text-slate-500 font-mono">v0.1.0</p>
      </div>
    </aside>
  );
}
