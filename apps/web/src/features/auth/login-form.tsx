'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth/auth-service';
import { useAuthStore } from '@/stores/auth';

const loginSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  scope: z.string().default('ai:read ai:write'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { clientId: '', clientSecret: '', scope: 'ai:read ai:write' },
  });

  async function onSubmit(values: LoginValues) {
    const token = await authService.login(values);
    setSession({
      accessToken: token.access_token,
      scope: token.scope,
    });
    router.replace(searchParams.get('next') ?? '/dashboard');
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Client ID" error={form.formState.errors.clientId?.message}>
        <Input autoComplete="username" {...form.register('clientId')} />
      </Field>
      <Field label="Client secret" error={form.formState.errors.clientSecret?.message}>
        <Input type="password" autoComplete="current-password" {...form.register('clientSecret')} />
      </Field>
      <Field label="Scopes" error={form.formState.errors.scope?.message}>
        <Input {...form.register('scope')} />
      </Field>
      <Button className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Sign in
      </Button>
      <div className="flex justify-between text-xs text-muted-foreground">
        <Link href="/forgot-password">Forgot password</Link>
        <Link href="/register">Create API client</Link>
      </div>
    </form>
  );
}
