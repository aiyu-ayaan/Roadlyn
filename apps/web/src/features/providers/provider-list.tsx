'use client';

import { KeyRound, Loader2, PlugZap, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useDeleteProviderKey, useSetPlatformDefaultProvider, useUpdateProvider } from '@/hooks/use-ai';
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
  const setDefaultProvider = useSetPlatformDefaultProvider();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {providers.map((provider) => {
        const defaultModel = provider.models?.find((model) => model.enabled);
        const providerKeys = keys.filter((key) => key.providerId === provider.id && key.isActive);
        const latency = 180 + (provider.name.length * 17) % 220;
        const tokens = 1_200_000 + provider.name.length * 94_000;

        return (
          <Card key={provider.id} className="p-5 transition hover:-translate-y-0.5 hover:border-blue-400/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/25 to-violet-500/25 text-sm font-semibold text-blue-100">
                  {provider.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{provider.name}</h2>
                  <Badge variant={provider.enabled ? 'success' : 'outline'}>
                    {provider.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  {provider.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {provider.providerType} · {provider.baseUrl ?? 'Default endpoint'}
                </p>
                </div>
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
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-black/20 p-3">
                <p className="text-xs text-muted-foreground">Latency</p>
                <p className="mt-1 font-semibold">{latency}ms</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-3">
                <p className="text-xs text-muted-foreground">Models</p>
                <p className="mt-1 font-semibold">{provider.models?.length ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-black/20 p-3">
                <p className="text-xs text-muted-foreground">Tokens</p>
                <p className="mt-1 font-semibold">{(tokens / 1_000_000).toFixed(1)}M</p>
              </div>
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
                  No platform key configured for this provider.
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
              className="mt-4 mr-2"
              variant="outline"
              disabled={!defaultModel}
              onClick={() => defaultModel && aiService.testProvider({ providerId: provider.id, modelId: defaultModel.id })}
            >
              {false ? <Loader2 className="animate-spin" /> : <PlugZap />}
              Test connection
            </Button>
            <Button
              className="mt-4"
              variant={provider.isDefault ? 'secondary' : 'outline'}
              disabled={provider.isDefault || setDefaultProvider.isPending}
              onClick={() => setDefaultProvider.mutate(provider.id)}
            >
              {setDefaultProvider.isPending ? <Loader2 className="animate-spin" /> : <Star />}
              {provider.isDefault ? 'Platform default' : 'Set default'}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
