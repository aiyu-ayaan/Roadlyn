'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mainNavItems } from './nav-items';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const primaryItems = mainNavItems;

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-3 rounded-2xl border border-white/10 bg-black/70 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:hidden">
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] text-muted-foreground transition',
              active && 'bg-white/[0.1] text-foreground shadow-lg shadow-blue-500/10',
            )}
          >
            <Icon className="size-4" />
            <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
