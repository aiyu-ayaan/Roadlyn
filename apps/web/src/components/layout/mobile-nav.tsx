'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot } from 'lucide-react';
import { mainNavItems } from './nav-items';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui';

export function MobileNav() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useUiStore();

  return (
    <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <DialogContent className="left-0 top-0 h-full w-80 max-w-[85vw] translate-x-0 translate-y-0 rounded-none">
        <DialogTitle className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </span>
          Roadlyn
        </DialogTitle>
        <nav className="mt-6 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground',
                  active && 'bg-secondary text-foreground',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
