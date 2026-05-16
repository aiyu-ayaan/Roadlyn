'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { tokenStorage } from '@/services/auth/token-storage';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated && !tokenStorage.getAccessToken()) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated && !tokenStorage.getAccessToken()) {
    return null;
  }

  return children;
}
