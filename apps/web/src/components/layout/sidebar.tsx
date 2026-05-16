'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, PanelLeftClose } from 'lucide-react';
import { mainNavItems } from './nav-items';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui';

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const isCourseMode = pathname.match(/^\/roadmaps\/[^/]+$/) && !pathname.endsWith('/generate');

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 bg-black/45 backdrop-blur-2xl transition-all lg:block',
        sidebarOpen ? 'w-64' : 'w-20',
        isCourseMode && '-translate-x-full peer-hover:translate-x-0 hover:translate-x-0'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="ai-glow flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white">
            <Bot className="size-5" />
          </span>
          {sidebarOpen ? <span>Roadlyn</span> : null}
        </Link>
        {sidebarOpen ? (
          <Button size="icon" variant="ghost" onClick={toggleSidebar}>
            <PanelLeftClose />
          </Button>
        ) : null}
      </div>
      <nav className="space-y-1 px-3 py-4">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground',
                active && 'bg-white/[0.11] text-foreground shadow-lg shadow-blue-500/10',
                !sidebarOpen && 'justify-center px-0',
              )}
            >
              {active ? (
                <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-blue-400 to-violet-400" />
              ) : null}
              <Icon className="size-4" />
              {sidebarOpen ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
