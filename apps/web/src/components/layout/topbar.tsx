'use client';

import { Menu, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui';

export function Topbar() {
  const { setCommandOpen, toggleMobileNav } = useUiStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" className="lg:hidden" onClick={toggleMobileNav}>
          <Menu />
        </Button>
        <Button
          variant="outline"
          className="hidden w-72 justify-start text-muted-foreground md:flex"
          onClick={() => setCommandOpen(true)}
        >
          <Search />
          Search Roadlyn
          <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Ctrl K
          </kbd>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="size-8 rounded-full border border-border bg-secondary" />
      </div>
    </header>
  );
}
