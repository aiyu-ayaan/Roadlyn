'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Github, ShieldCheck } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth/auth-service';

export default function AdminLoginPage() {
  return (
    <AuthCard
      title="Admin sign in"
      description="Use the admin GitHub account to manage Roadlyn users and AI providers."
      footer="Admin routes are separate from the learner dashboard."
    >
      <Suspense>
        <AdminLoginContent />
      </Suspense>
    </AuthCard>
  );
}

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/admin/users';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mb-3 size-5 text-blue-300" />
        Only users with the `ADMIN` role can open the admin console.
      </div>
      <Button
        className="w-full"
        type="button"
        onClick={() => {
          window.location.href = authService.getGithubLoginUrl(next);
        }}
      >
        <Github />
        Continue with GitHub
      </Button>
    </div>
  );
}
