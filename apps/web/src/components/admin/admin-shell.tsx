'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, Bot, Brain, KeyRound, LogOut, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { authService } from '@/services/auth/auth-service';
import { tokenStorage } from '@/services/auth/token-storage';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/providers/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/admin/providers/integrations', label: 'Integrations', icon: Brain },
  { href: '/admin/token', label: 'Token Usage', icon: BarChart3 },
];

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, logout, setUser, user } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    logout: state.logout,
    setUser: state.setUser,
    user: state.user,
  }));
  const token = tokenStorage.getAccessToken();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated && !token) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!user && token) {
      authService.me().then(setUser).catch(() => {
        logout();
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      });
    }
  }, [isAuthenticated, logout, pathname, router, setUser, token, user, mounted]);

  if (!mounted) {
    return <AdminLoading />;
  }

  if (!isAuthenticated && !token) {
    return null;
  }

  if (!user) {
    return <AdminLoading />;
  }

  if (user.role !== 'ADMIN') {
    return (
      <AdminShell>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-muted-foreground" />
            <div>
              <h1 className="text-xl font-semibold">Admin access required</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with the admin account to manage Roadlyn users and AI providers.
              </p>
            </div>
          </div>
        </Card>
      </AdminShell>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen bg-background">
      <div className="grid-fade pointer-events-none fixed inset-0 opacity-40" />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-black/50 backdrop-blur-2xl lg:block">
        <div className="flex h-16 items-center px-4">
          <Link href="/admin/users" className="flex items-center gap-2 font-semibold">
            <span className="ai-glow flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white">
              <Bot className="size-5" />
            </span>
            <span>Roadlyn Admin</span>
          </Link>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground',
                  active && 'bg-white/[0.11] text-foreground shadow-lg shadow-blue-500/10',
                )}
              >
                {active ? (
                  <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-blue-400 to-violet-400" />
                ) : null}
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <Bot className="size-5 text-blue-300" />
              <span className="font-semibold">Roadlyn Admin</span>
            </div>
            <div className="hidden text-sm text-muted-foreground lg:block">
              Admin console
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                window.location.href = '/admin/login';
              }}
            >
              <LogOut />
              Sign out
            </Button>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground',
                    active && 'bg-white/[0.11] text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Checking admin session...
      </div>
    </div>
  );
}
