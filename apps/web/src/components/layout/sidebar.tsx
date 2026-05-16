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

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-background/90 backdrop-blur-xl transition-all lg:block',
        sidebarOpen ? 'w-64' : 'w-20',
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
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
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground',
                active && 'bg-secondary text-foreground',
                !sidebarOpen && 'justify-center px-0',
              )}
            >
              <Icon className="size-4" />
              {sidebarOpen ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
