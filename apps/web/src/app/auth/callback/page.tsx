'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authService } from '@/services/auth/auth-service';
import { useAuthStore } from '@/stores/auth';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackStatus message="Completing GitHub sign in" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const [message, setMessage] = useState('Completing GitHub sign in');

  useEffect(() => {
    async function completeLogin() {
      const accessToken = searchParams.get('access_token');
      const scope = searchParams.get('scope') ?? 'ai:read ai:write';
      const next = searchParams.get('next') ?? '/dashboard';

      if (!accessToken) {
        setMessage('Missing OAuth token. Please try signing in again.');
        return;
      }

      setSession({ accessToken, scope });

      try {
        const user = await authService.me();
        setSession({ accessToken, scope, user });
      } finally {
        router.replace(next);
      }
    }

    completeLogin();
  }, [router, searchParams, setSession]);

  return (
    <CallbackStatus message={message} />
  );
}

function CallbackStatus({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        {message}
      </div>
    </main>
  );
}
