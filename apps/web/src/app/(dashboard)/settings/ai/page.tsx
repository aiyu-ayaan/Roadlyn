'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviders } from '@/hooks/use-ai';
import { aiService } from '@/services/ai/ai-service';
import { useAuthStore } from '@/stores/auth';

export default function AISettingsPage() {
  const user = useAuthStore((state) => state.user);
  const providers = useProviders();
  const [providerId, setProviderId] = useState('');
  const [fallbackProviderId, setFallbackProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const models = useMemo(
    () => providers.data?.find((provider) => provider.id === providerId)?.models ?? [],
    [providerId, providers.data],
  );

  return (
    <div>
      <PageHeader
        title="AI preferences"
        description="Set your default model experience. Provider API keys are configured centrally by admins."
      />
      <Card className="max-w-2xl space-y-4 p-5">
        <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm">
          <p className="font-medium">{user?.name ?? 'Signed-in user'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{user?.email ?? user?.id ?? 'User context will load after login.'}</p>
        </div>
        <Select value={providerId} onValueChange={setProviderId}>
          <SelectTrigger><SelectValue placeholder="Default provider" /></SelectTrigger>
          <SelectContent>
            {(providers.data ?? []).map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modelId} onValueChange={setModelId}>
          <SelectTrigger><SelectValue placeholder="Default model" /></SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>{model.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fallbackProviderId} onValueChange={setFallbackProviderId}>
          <SelectTrigger><SelectValue placeholder="Fallback provider" /></SelectTrigger>
          <SelectContent>
            {(providers.data ?? []).map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={!user?.id || !providerId || !modelId}
          onClick={async () => {
            if (!user?.id) {
              return;
            }

            await aiService.setDefaultProvider({
              userId: user.id,
              providerId,
              fallbackProviderId: fallbackProviderId || undefined,
            });
            await aiService.setDefaultModel({ userId: user.id, modelId });
          }}
        >
          Save AI defaults
        </Button>
      </Card>
    </div>
  );
}
