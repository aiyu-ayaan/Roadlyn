'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Plus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { useAddProviderKey, useNextKeyName, useValidateKey } from '@/hooks/use-ai';
import { AIProviderType } from '@/types';

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

export function AddKeyDialog() {
  const [open, setOpen] = useState(false);
  const [providerType, setProviderType] = useState<AIProviderType | ''>('');
  const [apiKey, setApiKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [validated, setValidated] = useState<null | boolean>(null);
  const [validationError, setValidationError] = useState('');

  const nextName = useNextKeyName(providerType || undefined);
  const validateKey = useValidateKey();
  const addKey = useAddProviderKey();

  // Auto-populate key name when provider changes
  useEffect(() => {
    if (nextName.data?.name) {
      setKeyName(nextName.data.name);
    }
  }, [nextName.data?.name]);

  const resetForm = () => {
    setProviderType('');
    setApiKey('');
    setKeyName('');
    setIsDefault(true);
    setValidated(null);
    setValidationError('');
  };

  const handleValidateAndSave = async () => {
    if (!providerType || !apiKey) return;

    setValidated(null);
    setValidationError('');

    try {
      const result = await validateKey.mutateAsync({
        providerType,
        apiKey,
      });

      if (result.valid) {
        setValidated(true);
        // Key is valid — save it
        await addKey.mutateAsync({
          providerType,
          apiKey,
          keyName: keyName || undefined,
          isDefault,
        });
        resetForm();
        setOpen(false);
      } else {
        setValidated(false);
        setValidationError(result.error ?? 'Key validation failed');
      }
    } catch (error) {
      setValidated(false);
      setValidationError(
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'Validation request failed',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add API Key</DialogTitle>
          <DialogDescription>
            Choose a provider and enter your API key. We&apos;ll validate it with a real API call before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={providerType}
              onValueChange={(v) => {
                setProviderType(v as AIProviderType);
                setValidated(null);
                setValidationError('');
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
            <Label>Key name</Label>
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder={nextName.data?.name ?? 'Auto-generated'}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for auto-generated name
            </p>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setValidated(null);
                setValidationError('');
              }}
              placeholder="sk-..."
            />
          </div>

          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            Default key
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </label>

          {validated === false && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              <XCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Invalid key</p>
                <p className="mt-0.5 text-xs text-red-300/80">{validationError}</p>
              </div>
            </div>
          )}

          {validated === true && (
            <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300">
              <CheckCircle2 className="size-4 shrink-0" />
              Key validated successfully!
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleValidateAndSave}
            disabled={!providerType || !apiKey || validateKey.isPending || addKey.isPending}
          >
            {validateKey.isPending || addKey.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
            Validate & Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
