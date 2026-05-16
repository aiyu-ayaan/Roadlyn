import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from '@/features/auth/register-form';

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create API client"
      description="Generate client credentials for the OAuth2 API flow."
      footer={
        <>
          Already have credentials? <Link href="/login" className="text-foreground">Sign in</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
