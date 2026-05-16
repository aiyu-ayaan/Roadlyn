'use client';

import { usePathname } from 'next/navigation';
import { CommandMenu } from './command-menu';
import { MobileNav } from './mobile-nav';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUiStore();
  const pathname = usePathname();
  const isCourseMode = pathname.match(/^\/roadmaps\/[^/]+$/) && !pathname.endsWith('/generate');

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="grid-fade pointer-events-none fixed inset-0 opacity-40" />
      {isCourseMode && (
        <div className="fixed inset-y-0 left-0 z-50 w-4 bg-transparent peer lg:block hidden" />
      )}
      <Sidebar />
      <MobileNav />
      <CommandMenu />
      <div className={cn('transition-all', !isCourseMode && (sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'))}>
        {!isCourseMode && <Topbar />}
        <main className={cn("relative w-full", isCourseMode ? "mx-0 max-w-none px-0 pb-0 pt-0" : "mx-auto max-w-7xl px-4 pb-24 pt-6 lg:px-6 lg:pb-8")}>
          {children}
        </main>
      </div>
    </div>
  );
}
