'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Package, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAvailableModels, useCreateIntegration, useProviderKeys } from '@/hooks/use-ai';
import { AIProviderType, AvailableModel } from '@/types';

const providerTypes: { value: AIProviderType; label: string }[] = [
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'ANTHROPIC', label: 'Anthropic' },
  { value: 'GEMINI', label: 'Google (Gemini)' },
  { value: 'DEEPSEEK', label: 'DeepSeek' },
  { value: 'GROK', label: 'Grok (xAI)' },
  { value: 'MISTRAL', label: 'Mistral' },
  { value: 'TOGETHERAI', label: 'Together AI' },
  { value: 'OPENROUTER', label: 'OpenRouter' },
  { value: 'OLLAMA', label: 'Ollama (Local)' },
  { value: 'CUSTOM_OPENAI_COMPATIBLE', label: 'Custom (OpenAI-compatible)' },
];

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

type Step = 'select' | 'models' | 'confirm';

export function AddIntegrationDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('select');
  const [providerType, setProviderType] = useState<AIProviderType | ''>('');
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [modelSearch, setModelSearch] = useState('');
  const [integrationName, setIntegrationName] = useState('');

  const keys = useProviderKeys();
  const createIntegration = useCreateIntegration();

  // Filter keys by selected provider type
  const matchingKeys = useMemo(() => {
    if (!providerType || !keys.data) return [];
    return keys.data.filter((k) => k.providerType === providerType && k.isActive);
  }, [providerType, keys.data]);

  const availableModels = useAvailableModels(providerType || undefined, selectedKeyId || undefined);

  // Auto-set name when provider changes
  useEffect(() => {
    if (providerType) {
      setIntegrationName(providerDisplayNames[providerType] ?? providerType);
    }
  }, [providerType]);

  const filteredModels = useMemo(() => {
    const models = availableModels.data ?? [];
    if (!modelSearch) return models;
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
        m.name.toLowerCase().includes(modelSearch.toLowerCase())
    );
  }, [availableModels.data, modelSearch]);

  const resetForm = () => {
    setStep('select');
    setProviderType('');
    setSelectedKeyId('');
    setSelectedModels(new Set());
    setModelSearch('');
    setIntegrationName('');
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      filteredModels.forEach((m) => next.add(m.id));
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedModels(new Set());
  };

  const handleCreate = async () => {
    if (!providerType || !selectedKeyId || selectedModels.size === 0) return;

    const allModels = availableModels.data ?? [];
    const slug = integrationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    await createIntegration.mutateAsync({
      name: integrationName,
      slug: slug || providerType.toLowerCase(),
      providerType,
      keyId: selectedKeyId,
      models: Array.from(selectedModels).map((modelId) => {
        const model = allModels.find((m) => m.id === modelId);
        return {
          modelName: modelId,
          displayName: model?.name ?? modelId,
          contextWindow: model?.contextWindow ?? undefined,
        };
      }),
    });

    resetForm();
    setOpen(false);
  };

  const canGoToModels = providerType && selectedKeyId;
  const canConfirm = selectedModels.size > 0 && integrationName.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add Integration
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'New Integration'}
            {step === 'models' && 'Select Models'}
            {step === 'confirm' && 'Confirm Integration'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Choose a provider and an API key to fetch available models.'}
            {step === 'models' && 'Select which models you want to register for this integration.'}
            {step === 'confirm' && 'Review and confirm your new AI integration.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {(['select', 'models', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                  step === s
                    ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white'
                    : (['select', 'models', 'confirm'] as Step[]).indexOf(step) > i
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-white/10 text-muted-foreground'
                }`}
              >
                {(['select', 'models', 'confirm'] as Step[]).indexOf(step) > i ? (
                  <Check className="size-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && <div className="h-px w-8 bg-white/10" />}
            </div>
          ))}
        </div>

        {/* STEP 1: Select provider + key */}
        {step === 'select' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={providerType}
                onValueChange={(v) => {
                  setProviderType(v as AIProviderType);
                  setSelectedKeyId('');
                  setSelectedModels(new Set());
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerTypes.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              {matchingKeys.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-muted-foreground">
                  {providerType
                    ? `No keys found for ${providerDisplayNames[providerType] ?? providerType}. Add a key first in the API Keys tab.`
                    : 'Select a provider first'}
                </div>
              ) : (
                <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an API key" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchingKeys.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.keyName}
                        {k.isDefault ? ' (Default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button disabled={!canGoToModels} onClick={() => setStep('models')}>
                Next
                <ArrowRight />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Select models */}
        {step === 'models' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search models..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  className="text-blue-400 hover:underline"
                  onClick={selectAllVisible}
                  type="button"
                >
                  Select all
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  className="text-muted-foreground hover:underline"
                  onClick={deselectAll}
                  type="button"
                >
                  Clear
                </button>
              </div>
            </div>

            {availableModels.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-blue-400" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Fetching models from {providerDisplayNames[providerType as AIProviderType]}...
                </span>
              </div>
            ) : filteredModels.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <Package className="size-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {modelSearch
                    ? 'No models match your search'
                    : 'No models found for this provider'}
                </p>
              </Card>
            ) : (
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {filteredModels.map((model) => (
                  <ModelSelectItem
                    key={model.id}
                    model={model}
                    selected={selectedModels.has(model.id)}
                    onToggle={() => toggleModel(model.id)}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <Button variant="ghost" onClick={() => setStep('select')}>
                <ArrowLeft />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedModels.size} model
                  {selectedModels.size !== 1 ? 's' : ''} selected
                </span>
                <Button disabled={selectedModels.size === 0} onClick={() => setStep('confirm')}>
                  Next
                  <ArrowRight />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Integration name</Label>
              <Input
                value={integrationName}
                onChange={(e) => setIntegrationName(e.target.value)}
                placeholder="My OpenAI Integration"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-medium">Summary</h4>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider</span>
                  <Badge variant="secondary">
                    {providerDisplayNames[providerType as AIProviderType] ?? providerType}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Key</span>
                  <span>{matchingKeys.find((k) => k.id === selectedKeyId)?.keyName ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Models</span>
                  <span>{selectedModels.size} selected</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from(selectedModels)
                  .slice(0, 10)
                  .map((modelId) => (
                    <Badge key={modelId} variant="outline" className="text-xs">
                      {modelId}
                    </Badge>
                  ))}
                {selectedModels.size > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedModels.size - 10} more
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <Button variant="ghost" onClick={() => setStep('models')}>
                <ArrowLeft />
                Back
              </Button>
              <Button disabled={!canConfirm || createIntegration.isPending} onClick={handleCreate}>
                {createIntegration.isPending ? <Loader2 className="animate-spin" /> : <Check />}
                Create Integration
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModelSelectItem({
  model,
  selected,
  onToggle,
}: {
  model: AvailableModel;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
        selected
          ? 'border-blue-500/30 bg-blue-500/10'
          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
      }`}
    >
      <div
        className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition ${
          selected ? 'border-blue-400 bg-blue-500' : 'border-white/20 bg-white/5'
        }`}
      >
        {selected && <Check className="size-3 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{model.id}</p>
        {model.name !== model.id && (
          <p className="truncate text-xs text-muted-foreground">{model.name}</p>
        )}
      </div>
      {model.contextWindow && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {Math.round(model.contextWindow / 1000)}K ctx
        </Badge>
      )}
    </button>
  );
}
