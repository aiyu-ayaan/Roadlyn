'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { mainNavItems } from '@/components/layout/nav-items';
import { useUiStore } from '@/stores/ui';

export function CommandMenu() {
  const { commandOpen, setCommandOpen } = useUiStore();

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="top-[18%] translate-y-0 p-0">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search pages, providers, roadmaps..."
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="p-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setCommandOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary"
              >
                <Icon className="size-4 text-muted-foreground" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
