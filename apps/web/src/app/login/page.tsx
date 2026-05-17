import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in with your GitHub account to access your Roadlyn dashboard and continue learning."
      footer={
        <Link 
          href="/landing" 
          className="inline-flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to landing
        </Link>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
