'use client';

import { KeyRound, Loader2, PlugZap, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useDeleteProviderKey, useUpdateProvider } from '@/hooks/use-ai';
import { aiService } from '@/services/ai/ai-service';
import { AIProvider, ProviderAPIKey } from '@/types';

export function ProviderList({
  providers,
  keys,
}: {
  providers: AIProvider[];
  keys: ProviderAPIKey[];
}) {
  const updateProvider = useUpdateProvider();
  const deleteKey = useDeleteProviderKey();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {providers.map((provider) => {
        const defaultModel = provider.models?.find((model) => model.enabled);
        const providerKeys = keys.filter((key) => key.providerId === provider.id && key.isActive);

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
              <Switch
                checked={provider.enabled}
                onCheckedChange={(enabled) =>
                  updateProvider.mutate({ id: provider.id, input: { enabled } })
                }
              />
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
            <div className="mt-4 space-y-2">
              {providerKeys.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  No user keys saved for this provider.
                </div>
              ) : (
                providerKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{key.keyName}</span>
                      {key.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteKey.mutate(key.id)}
                      aria-label={`Delete ${key.keyName}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              )}
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
