import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Use GitHub for the SaaS dashboard or client credentials for direct API access."
      footer={
        <>
          Need a client? <Link href="/register" className="text-foreground">Create one</Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
