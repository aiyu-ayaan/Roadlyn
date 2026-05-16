'use client';

import { KeyRound, Shield, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AddKeyDialog } from '@/features/providers/add-key-dialog';
import { useDeleteProviderKey, useProviderKeys } from '@/hooks/use-ai';
import { AIProviderType, ProviderAPIKey } from '@/types';

const providerDisplayNames: Record<AIProviderType, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Google',
  DEEPSEEK: 'DeepSeek',
  GROK: 'Grok',
  MISTRAL: 'Mistral',
  TOGETHERAI: 'Together',
  OPENROUTER: 'OpenRouter',
  OLLAMA: 'Ollama',
  CUSTOM_OPENAI_COMPATIBLE: 'Custom',
};

const providerColors: Record<AIProviderType, string> = {
  OPENAI: 'from-emerald-500/30 to-teal-500/30',
  ANTHROPIC: 'from-orange-500/30 to-amber-500/30',
  GEMINI: 'from-blue-500/30 to-cyan-500/30',
  DEEPSEEK: 'from-violet-500/30 to-purple-500/30',
  GROK: 'from-slate-400/30 to-zinc-500/30',
  MISTRAL: 'from-amber-500/30 to-yellow-500/30',
  TOGETHERAI: 'from-pink-500/30 to-rose-500/30',
  OPENROUTER: 'from-indigo-500/30 to-blue-500/30',
  OLLAMA: 'from-gray-400/30 to-gray-500/30',
  CUSTOM_OPENAI_COMPATIBLE: 'from-fuchsia-500/30 to-pink-500/30',
};

export function ApiKeysTab() {
  const keys = useProviderKeys();
  const deleteKey = useDeleteProviderKey();

  if (keys.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  const activeKeys = (keys.data ?? []).filter((k) => k.isActive);

  // Group keys by provider type
  const grouped = activeKeys.reduce<Record<string, ProviderAPIKey[]>>((acc, key) => {
    const type = key.providerType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(key);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage encrypted API keys for AI providers. Keys are validated before saving.
          </p>
        </div>
        <AddKeyDialog />
      </div>

      {activeKeys.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
            <KeyRound className="size-6 text-blue-300" />
          </div>
          <h3 className="mt-4 font-semibold">No API keys yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add your first API key to start creating AI integrations. Each key is encrypted at rest and validated before saving.
          </p>
          <div className="mt-5">
            <AddKeyDialog />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(grouped).map(([providerType, providerKeys]) => (
            providerKeys.map((key) => (
              <KeyCard
                key={key.id}
                apiKey={key}
                providerType={providerType as AIProviderType}
                onDelete={() => deleteKey.mutate(key.id)}
                isDeleting={deleteKey.isPending}
              />
            ))
          ))}
        </div>
      )}
    </div>
  );
}

function KeyCard({
  apiKey,
  providerType,
  onDelete,
  isDeleting,
}: {
  apiKey: ProviderAPIKey;
  providerType: AIProviderType;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const displayName = providerDisplayNames[providerType] ?? providerType;
  const gradient = providerColors[providerType] ?? 'from-gray-500/30 to-gray-600/30';
  const validated = !!apiKey.lastValidatedAt;

  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/30 hover:shadow-lg hover:shadow-blue-500/5">
      {/* Gradient accent bar */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-xs font-bold`}
          >
            {displayName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{apiKey.keyName}</h3>
            <p className="text-xs text-muted-foreground">{displayName}</p>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 opacity-0 transition group-hover:opacity-100"
          onClick={onDelete}
          disabled={isDeleting}
          aria-label={`Delete ${apiKey.keyName}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {apiKey.isDefault && <Badge variant="secondary">Default</Badge>}
        <Badge variant={validated ? 'success' : 'outline'}>
          {validated ? (
            <><ShieldCheck className="mr-1 size-3" /> Validated</>
          ) : (
            <><Shield className="mr-1 size-3" /> Pending</>
          )}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>••••••••••••••••</span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Added {new Date(apiKey.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </Card>
  );
}
