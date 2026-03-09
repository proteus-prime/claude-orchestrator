'use client';

import { ActivityFeed } from '@/components/ActivityFeed';

export default function ActivityPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Feed</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time event stream from all Claude Code sessions
          </p>
        </div>

        <ActivityFeed maxItems={100} autoRefreshMs={10000} showFilters={true} className="min-h-96" />
      </div>
    </div>
  );
}
