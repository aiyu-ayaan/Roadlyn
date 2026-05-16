'use client';

import { LogOut, Menu, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

export function Topbar() {
  const router = useRouter();
  const { setCommandOpen, toggleMobileNav } = useUiStore();
  const { logout, user } = useAuthStore((state) => ({
    logout: state.logout,
    user: state.user,
  }));

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
        <div className="hidden text-right text-xs md:block">
          <p className="font-medium text-foreground">{user?.name ?? 'Roadlyn user'}</p>
          <p className="max-w-44 truncate text-muted-foreground">{user?.email ?? 'Authenticated'}</p>
        </div>
        <div className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-xs font-semibold">
          {user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" className="size-full object-cover" />
          ) : (
            (user?.name ?? user?.email ?? 'R').charAt(0).toUpperCase()
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            logout();
            router.replace('/login');
          }}
          aria-label="Sign out"
        >
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
