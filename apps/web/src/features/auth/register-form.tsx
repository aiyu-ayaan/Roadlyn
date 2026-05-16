'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth/auth-service';
import { OAuthClientResponse } from '@/types';

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  userId: z.string().optional(),
  scopes: z.string().default('ai:read ai:write'),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [client, setClient] = useState<OAuthClientResponse | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: 'Roadlyn Dashboard', userId: '', scopes: 'ai:read ai:write' },
  });

  async function onSubmit(values: RegisterValues) {
    const response = await authService.createOAuthClient({
      name: values.name,
      userId: values.userId || undefined,
      scopes: values.scopes.split(' ').filter(Boolean),
    });
    setClient(response.data);
  }

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <Field label="Client name" error={form.formState.errors.name?.message}>
          <Input {...form.register('name')} />
        </Field>
        <Field label="User ID" error={form.formState.errors.userId?.message}>
          <Input placeholder="Optional BYOK user owner" {...form.register('userId')} />
        </Field>
        <Field label="Scopes" error={form.formState.errors.scopes?.message}>
          <Input {...form.register('scopes')} />
        </Field>
        <Button className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
          Generate client
        </Button>
      </form>
      {client ? (
        <Card className="space-y-2 bg-secondary/50 p-4 text-sm">
          <p className="font-medium">Store this secret now. It will not be shown again.</p>
          <p className="break-all text-muted-foreground">Client ID: {client.clientId}</p>
          <p className="break-all text-muted-foreground">Client secret: {client.clientSecret}</p>
        </Card>
      ) : null}
    </div>
  );
}
