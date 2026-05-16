'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useProviders } from '@/hooks/use-ai';
import { aiService } from '@/services/ai/ai-service';

export default function AISettingsPage() {
  const providers = useProviders();
  const [userId, setUserId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [fallbackProviderId, setFallbackProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const models = useMemo(
    () => providers.data?.find((provider) => provider.id === providerId)?.models ?? [],
    [providerId, providers.data],
  );

  return (
    <div>
      <PageHeader
        title="AI preferences"
        description="Set per-user default provider, model, BYOK mode, and fallback provider."
      />
      <Card className="max-w-2xl space-y-4 p-5">
        <input
          className="focus-ring h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          placeholder="User ID"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        />
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
        <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
          Use user-owned keys first
          <Switch checked={useOwnKeys} onCheckedChange={setUseOwnKeys} />
        </label>
        <Button
          disabled={!userId || !providerId || !modelId}
          onClick={async () => {
            await aiService.setDefaultProvider({ userId, providerId, fallbackProviderId, useOwnKeys });
            await aiService.setDefaultModel({ userId, modelId });
          }}
        >
          Save AI defaults
        </Button>
      </Card>
    </div>
  );
}
