'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authService } from '@/services/auth/auth-service';
import { tokenStorage } from '@/services/auth/token-storage';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, setUser, user } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    setUser: state.setUser,
    user: state.user,
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const isPublicRoadmapRoute =
      pathname.startsWith('/roadmaps/') &&
      pathname !== '/roadmaps' &&
      pathname !== '/roadmaps/generate';

    if (!isAuthenticated && !tokenStorage.getAccessToken() && !isPublicRoadmapRoute) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }

    if (!user && tokenStorage.getAccessToken()) {
      authService.me().then(setUser).catch(() => setUser(null));
    }
  }, [isAuthenticated, pathname, router, setUser, user, mounted]);

  if (!mounted) {
    return null;
  }

  const isPublicRoadmapRoute =
    pathname.startsWith('/roadmaps/') &&
    pathname !== '/roadmaps' &&
    pathname !== '/roadmaps/generate';

  if (!isAuthenticated && !tokenStorage.getAccessToken() && !isPublicRoadmapRoute) {
    return null;
  }

  return children;
}
