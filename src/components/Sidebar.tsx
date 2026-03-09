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
      className="fixed inset-y-0 left-0 flex flex-col w-60 bg-sidebar border-r border-sidebar-border z-10"
      style={{ fontFamily: 'var(--font-geist-sans, sans-serif)' }}
    >
      {/* Header */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">🦀</span>
          <div>
            <p className="text-[13px] font-semibold text-sidebar-foreground leading-tight">
              Claude Orchestrator
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 leading-tight mt-0.5">
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
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-[11px] text-sidebar-foreground/40 font-mono">v0.1.0</p>
      </div>
    </aside>
  );
}
