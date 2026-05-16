'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { authService } from '@/services/auth/auth-service';
import { tokenStorage } from '@/services/auth/token-storage';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, setUser, user } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    setUser: state.setUser,
    user: state.user,
  }));

  useEffect(() => {
    if (!isAuthenticated && !tokenStorage.getAccessToken()) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }

    if (!user && tokenStorage.getAccessToken()) {
      authService.me().then(setUser).catch(() => setUser(null));
    }
  }, [isAuthenticated, pathname, router, setUser, user]);

  if (!isAuthenticated && !tokenStorage.getAccessToken()) {
    return null;
  }

  return children;
}
