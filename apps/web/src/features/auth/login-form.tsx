'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Github, Loader2, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth/auth-service';
import { tokenStorage } from '@/services/auth/token-storage';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const next = searchParams.get('next') ?? '/dashboard';

  return (
    <div className="flex flex-col gap-4">
      <Button
        className="h-12 w-full text-base font-medium shadow-lg hover:shadow-xl transition-all"
        type="button"
        onClick={() => {
          window.location.href = authService.getGithubLoginUrl(next);
        }}
      >
        <Github className="mr-2 size-5" />
        Continue with GitHub
      </Button>
      <Button
        className="h-12 w-full text-base font-medium"
        variant="outline"
        type="button"
        disabled={isDemoLoading}
        onClick={async () => {
          setIsDemoLoading(true);
          try {
            const token = await authService.demoLogin();
            tokenStorage.setAccessToken(token.access_token, token.scope);
            router.push(next);
          } finally {
            setIsDemoLoading(false);
          }
        }}
      >
        {isDemoLoading ? (
          <Loader2 className="mr-2 size-5 animate-spin" />
        ) : (
          <PlayCircle className="mr-2 size-5" />
        )}
        Try read-only demo
      </Button>
    </div>
  );
}
