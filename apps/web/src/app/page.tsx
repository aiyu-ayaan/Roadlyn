'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

export default function RootRedirect() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/landing');
    }
  }, [mounted, isAuthenticated, router]);

  return <main className="min-h-screen bg-background" />;
}
