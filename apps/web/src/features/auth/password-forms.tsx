'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth/auth-service';

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export function ForgotPasswordForm() {
  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(({ email }) => authService.forgotPassword(email))}>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" {...form.register('email')} />
      </Field>
      <Button className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token: '', password: '' },
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(authService.resetPassword)}>
      <Field label="Reset token" error={form.formState.errors.token?.message}>
        <Input {...form.register('token')} />
      </Field>
      <Field label="New password" error={form.formState.errors.password?.message}>
        <Input type="password" {...form.register('password')} />
      </Field>
      <Button className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Reset password
      </Button>
    </form>
  );
}
