'use client';

import { CommandMenu } from './command-menu';
import { MobileNav } from './mobile-nav';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUiStore();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="grid-fade pointer-events-none fixed inset-0 opacity-40" />
      <Sidebar />
      <MobileNav />
      <CommandMenu />
      <div className={cn('transition-all lg:pl-20', sidebarOpen && 'lg:pl-64')}>
        <Topbar />
        <main className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-6 lg:px-6 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
