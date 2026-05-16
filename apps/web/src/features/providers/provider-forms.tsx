'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAddProviderKey, useCreateModel, useCreateProvider } from '@/hooks/use-ai';
import { AIProvider, AIProviderType } from '@/types';

const providerTypes: AIProviderType[] = [
  'OPENAI',
  'ANTHROPIC',
  'GEMINI',
  'DEEPSEEK',
  'GROK',
  'MISTRAL',
  'TOGETHERAI',
  'OPENROUTER',
  'OLLAMA',
  'CUSTOM_OPENAI_COMPATIBLE',
];

const providerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  providerType: z.enum(providerTypes as [AIProviderType, ...AIProviderType[]]),
  baseUrl: z.string().url().optional().or(z.literal('')),
});

const modelSchema = z.object({
  providerId: z.string().min(1),
  modelName: z.string().min(1),
  displayName: z.string().min(1),
  contextWindow: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().positive().optional(),
  ),
});

const keySchema = z.object({
  providerId: z.string().min(1),
  keyName: z.string().min(1),
  apiKey: z.string().min(1),
  isDefault: z.boolean().default(false),
});

export function ProviderForms({ providers }: { providers: AIProvider[] }) {
  const createProvider = useCreateProvider();
  const createModel = useCreateModel();
  const addKey = useAddProviderKey();
  const providerForm = useForm<z.infer<typeof providerSchema>>({
    resolver: zodResolver(providerSchema),
    defaultValues: { name: '', slug: '', providerType: 'OPENAI', baseUrl: '' },
  });
  const modelForm = useForm<z.infer<typeof modelSchema>>({
    resolver: zodResolver(modelSchema),
    defaultValues: { providerId: '', modelName: '', displayName: '' },
  });
  const keyForm = useForm<z.infer<typeof keySchema>>({
    resolver: zodResolver(keySchema),
    defaultValues: { providerId: '', keyName: '', apiKey: '', isDefault: true },
  });

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Add provider</h2>
        <form
          className="space-y-4"
          onSubmit={providerForm.handleSubmit(async (values) => {
            await createProvider.mutateAsync({ ...values, baseUrl: values.baseUrl || undefined });
            providerForm.reset({ name: '', slug: '', providerType: values.providerType, baseUrl: '' });
          })}
        >
          <Field label="Name" error={providerForm.formState.errors.name?.message}>
            <Input {...providerForm.register('name')} />
          </Field>
          <Field label="Slug" error={providerForm.formState.errors.slug?.message}>
            <Input {...providerForm.register('slug')} />
          </Field>
          <Field label="Provider type" error={providerForm.formState.errors.providerType?.message}>
            <Select
              value={providerForm.watch('providerType')}
              onValueChange={(value) => providerForm.setValue('providerType', value as AIProviderType)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {providerTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Base URL" error={providerForm.formState.errors.baseUrl?.message}>
            <Input placeholder="Optional custom endpoint" {...providerForm.register('baseUrl')} />
          </Field>
          <Button className="w-full" disabled={createProvider.isPending}>
            {createProvider.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Save provider
          </Button>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Add model</h2>
        <form
          className="space-y-4"
          onSubmit={modelForm.handleSubmit(async (values) => {
            await createModel.mutateAsync(values);
            modelForm.reset({ providerId: values.providerId, modelName: '', displayName: '' });
          })}
        >
          <ProviderSelect providers={providers} value={modelForm.watch('providerId')} onChange={(value) => modelForm.setValue('providerId', value)} />
          <Field label="Model name" error={modelForm.formState.errors.modelName?.message}>
            <Input {...modelForm.register('modelName')} />
          </Field>
          <Field label="Display name" error={modelForm.formState.errors.displayName?.message}>
            <Input {...modelForm.register('displayName')} />
          </Field>
          <Field label="Context window" error={modelForm.formState.errors.contextWindow?.message}>
            <Input type="number" {...modelForm.register('contextWindow')} />
          </Field>
          <Button className="w-full" disabled={providers.length === 0 || createModel.isPending}>
            {createModel.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Save model
          </Button>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Add API key</h2>
        <form
          className="space-y-4"
          onSubmit={keyForm.handleSubmit(async (values) => {
            await addKey.mutateAsync(values);
            keyForm.reset({ providerId: values.providerId, keyName: '', apiKey: '', isDefault: true });
          })}
        >
          <ProviderSelect providers={providers} value={keyForm.watch('providerId')} onChange={(value) => keyForm.setValue('providerId', value)} />
          <Field label="Key name" error={keyForm.formState.errors.keyName?.message}>
            <Input {...keyForm.register('keyName')} />
          </Field>
          <Field label="API key" error={keyForm.formState.errors.apiKey?.message}>
            <Input type="password" {...keyForm.register('apiKey')} />
          </Field>
          <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
            Default key
            <Switch checked={keyForm.watch('isDefault')} onCheckedChange={(value) => keyForm.setValue('isDefault', value)} />
          </label>
          <Button className="w-full" disabled={providers.length === 0 || addKey.isPending}>
            {addKey.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Encrypt and save
          </Button>
        </form>
      </Card>
    </div>
  );
}

function ProviderSelect({
  providers,
  value,
  onChange,
}: {
  providers: AIProvider[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Provider">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
        <SelectContent>
          {providers.length === 0 ? (
            <SelectItem value="no-providers" disabled>Create a provider first</SelectItem>
          ) : (
            providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </Field>
  );
}
