import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/features/auth/password-forms';

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot password"
      description="Request a password reset from the authentication service."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
