import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/features/auth/password-forms';

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      description="Set a new password using a reset token."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
