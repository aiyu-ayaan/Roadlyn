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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <CommandMenu />
      <div className={cn('transition-all lg:pl-20', sidebarOpen && 'lg:pl-64')}>
        <Topbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
