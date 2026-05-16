'use client';

import { Loader2, PlugZap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { aiService } from '@/services/ai/ai-service';
import { AIProvider } from '@/types';

export function ProviderList({ providers }: { providers: AIProvider[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {providers.map((provider) => {
        const defaultModel = provider.models?.find((model) => model.enabled);

        return (
          <Card key={provider.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{provider.name}</h2>
                  <Badge variant={provider.enabled ? 'success' : 'outline'}>
                    {provider.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {provider.providerType} · {provider.baseUrl ?? 'Default endpoint'}
                </p>
              </div>
              <Switch checked={provider.enabled} disabled />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>Streaming: {provider.supportsStreaming ? 'yes' : 'no'}</span>
              <span>Vision: {provider.supportsVision ? 'yes' : 'no'}</span>
              <span>Embeddings: {provider.supportsEmbeddings ? 'yes' : 'no'}</span>
            </div>
            <div className="mt-4 space-y-2">
              {(provider.models ?? []).map((model) => (
                <div key={model.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 text-sm">
                  <span>{model.displayName}</span>
                  <Badge variant={model.enabled ? 'secondary' : 'outline'}>{model.modelName}</Badge>
                </div>
              ))}
            </div>
            <Button
              className="mt-4"
              variant="outline"
              disabled={!defaultModel}
              onClick={() => defaultModel && aiService.testProvider({ providerId: provider.id, modelId: defaultModel.id })}
            >
              {false ? <Loader2 className="animate-spin" /> : <PlugZap />}
              Test connection
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
