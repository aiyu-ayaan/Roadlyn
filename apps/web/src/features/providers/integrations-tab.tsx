'use client';

import * as React from 'react';
import { Loader2, PlugZap, Star, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { AddIntegrationDialog } from '@/features/providers/add-integration-dialog';
import {
  useProviders,
  useSetPlatformDefaultProvider,
  useUpdateProvider,
  useTestProvider,
} from '@/hooks/use-ai';
import { aiService } from '@/services/ai/ai-service';
import { AIProvider, AIProviderType } from '@/types';

const providerGradients: Record<AIProviderType, string> = {
  OPENAI: 'from-emerald-500/25 to-teal-500/25',
  ANTHROPIC: 'from-orange-500/25 to-amber-500/25',
  GEMINI: 'from-blue-500/25 to-cyan-500/25',
  DEEPSEEK: 'from-violet-500/25 to-purple-500/25',
  GROK: 'from-slate-400/25 to-zinc-500/25',
  MISTRAL: 'from-amber-500/25 to-yellow-500/25',
  TOGETHERAI: 'from-pink-500/25 to-rose-500/25',
  OPENROUTER: 'from-indigo-500/25 to-blue-500/25',
  OLLAMA: 'from-gray-400/25 to-gray-500/25',
  CUSTOM_OPENAI_COMPATIBLE: 'from-fuchsia-500/25 to-pink-500/25',
};

const providerBorderColors: Record<AIProviderType, string> = {
  OPENAI: 'hover:border-emerald-400/30',
  ANTHROPIC: 'hover:border-orange-400/30',
  GEMINI: 'hover:border-blue-400/30',
  DEEPSEEK: 'hover:border-violet-400/30',
  GROK: 'hover:border-slate-400/30',
  MISTRAL: 'hover:border-amber-400/30',
  TOGETHERAI: 'hover:border-pink-400/30',
  OPENROUTER: 'hover:border-indigo-400/30',
  OLLAMA: 'hover:border-gray-400/30',
  CUSTOM_OPENAI_COMPATIBLE: 'hover:border-fuchsia-400/30',
};

export function IntegrationsTab() {
  const providers = useProviders();
  const updateProvider = useUpdateProvider();
  const setDefaultProvider = useSetPlatformDefaultProvider();

  if (providers.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    );
  }

  const allProviders = providers.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Integrations</h2>
          <p className="text-sm text-muted-foreground">
            AI provider integrations with their configured models. Set a default for platform-wide use.
          </p>
        </div>
        <AddIntegrationDialog />
      </div>

      {allProviders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
            <Zap className="size-6 text-blue-300" />
          </div>
          <h3 className="mt-4 font-semibold">No integrations yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first AI integration by selecting a provider, choosing an API key, and picking your models.
          </p>
          <div className="mt-5">
            <AddIntegrationDialog />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allProviders.map((provider) => (
            <IntegrationCard
              key={provider.id}
              provider={provider}
              onToggleEnabled={(enabled) =>
                updateProvider.mutate({ id: provider.id, input: { enabled } })
              }
              onSetDefault={() => setDefaultProvider.mutate(provider.id)}
              isSettingDefault={setDefaultProvider.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({
  provider,
  onToggleEnabled,
  onSetDefault,
  isSettingDefault,
}: {
  provider: AIProvider;
  onToggleEnabled: (enabled: boolean) => void;
  onSetDefault: () => void;
  isSettingDefault: boolean;
}) {
  const [testStatus, setTestStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const testProvider = useTestProvider();

  const gradient = providerGradients[provider.providerType] ?? 'from-gray-500/25 to-gray-600/25';
  const borderColor = providerBorderColors[provider.providerType] ?? 'hover:border-gray-400/30';
  const modelCount = provider.models?.length ?? 0;
  const defaultModel = provider.models?.find((m) => m.enabled) ?? provider.models?.[0]; // Fallback to first model if none enabled
  const linkedKeys = provider.apiKeys ?? [];

  const handleTest = async () => {
    if (!defaultModel) return;
    setTestStatus('idle');
    try {
      const result = await testProvider.mutateAsync({
        providerId: provider.id,
        modelId: defaultModel.id,
      });
      if (result.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  return (
    <Card
      className={`group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 ${borderColor}`}
    >
      {/* Gradient accent */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-bold`}
          >
            {provider.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{provider.name}</h3>
              {provider.isDefault && (
                <Badge variant="secondary" className="shrink-0">
                  <Star className="mr-1 size-3" />
                  Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {provider.providerType} · {provider.baseUrl ?? 'Default endpoint'}
            </p>
          </div>
        </div>
        <Switch
          checked={provider.enabled}
          onCheckedChange={onToggleEnabled}
        />
      </div>

      {/* Capabilities */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {provider.enabled && (
          <Badge variant="success" className="text-[10px]">Active</Badge>
        )}
        {provider.supportsStreaming && (
          <Badge variant="outline" className="text-[10px]">Streaming</Badge>
        )}
        {provider.supportsVision && (
          <Badge variant="outline" className="text-[10px]">Vision</Badge>
        )}
        {provider.supportsEmbeddings && (
          <Badge variant="outline" className="text-[10px]">Embeddings</Badge>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-black/20 p-3">
          <p className="text-xs text-muted-foreground">Models</p>
          <p className="mt-0.5 text-lg font-semibold">{modelCount}</p>
        </div>
        <div className="rounded-xl bg-black/20 p-3">
          <p className="text-xs text-muted-foreground">Keys</p>
          <p className="mt-0.5 text-lg font-semibold">{linkedKeys.length}</p>
        </div>
      </div>

      {/* Model list */}
      {modelCount > 0 && (
        <div className="mt-3 space-y-1">
          {(provider.models ?? []).slice(0, 4).map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs"
            >
              <span className="truncate">{model.displayName}</span>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {model.modelName}
              </Badge>
            </div>
          ))}
          {modelCount > 4 && (
            <p className="px-2.5 text-xs text-muted-foreground">
              +{modelCount - 4} more model{modelCount - 4 !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={testStatus === 'success' ? 'secondary' : testStatus === 'error' ? 'destructive' : 'outline'}
            disabled={!defaultModel || testProvider.isPending}
            onClick={handleTest}
            className={testStatus === 'success' ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : ''}
          >
            {testProvider.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <PlugZap className="size-3.5" />
            )}
            {testStatus === 'success' ? 'Success!' : testStatus === 'error' ? 'Failed' : 'Test'}
          </Button>
          <Button
            size="sm"
            variant={provider.isDefault ? 'secondary' : 'outline'}
            disabled={provider.isDefault || isSettingDefault}
            onClick={onSetDefault}
          >
            {isSettingDefault ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Star className="size-3.5" />
            )}
            {provider.isDefault ? 'Default' : 'Set Default'}
          </Button>
        </div>
        {!defaultModel && modelCount === 0 && (
          <span className="text-[10px] text-muted-foreground">Requires model</span>
        )}
      </div>
    </Card>
  );
}
