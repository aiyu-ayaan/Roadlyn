'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field } from '@/components/forms/field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviders } from '@/hooks/use-ai';
import { useGenerateRoadmap } from '@/hooks/use-roadmaps';
import { useRealtime } from '@/hooks/use-realtime';
import { useRealtimeStore } from '@/stores/realtime';

const generationSchema = z.object({
  topic: z.string().min(2),
  experienceLevel: z.string().min(1),
  goal: z.string().min(2),
  weeklyHours: z.coerce.number().min(1).max(80),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
});

type GenerationValues = z.infer<typeof generationSchema>;

export function RoadmapGenerator() {
  useRealtime();
  const providers = useProviders();
  const generateRoadmap = useGenerateRoadmap();
  const latest = useRealtimeStore((state) => state.latest);
  const form = useForm<GenerationValues>({
    resolver: zodResolver(generationSchema),
    defaultValues: {
      topic: '',
      experienceLevel: 'beginner',
      goal: '',
      weeklyHours: 6,
      providerId: '',
      modelId: '',
    },
  });
  const selectedProvider = providers.data?.find((provider) => provider.id === form.watch('providerId'));
  const models = useMemo(() => selectedProvider?.models ?? [], [selectedProvider]);
  const progress =
    latest?.type === 'roadmap.progress' && typeof latest.payload.progress === 'number'
      ? latest.payload.progress
      : generateRoadmap.isPending
        ? 42
        : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            generateRoadmap.mutateAsync({
              ...values,
              providerId: values.providerId || undefined,
              modelId: values.modelId || undefined,
              useUserDefaults: !values.providerId || !values.modelId,
            }),
          )}
        >
          <Field label="Topic" error={form.formState.errors.topic?.message}>
            <Input placeholder="AI Engineering" {...form.register('topic')} />
          </Field>
          <Field label="Experience level" error={form.formState.errors.experienceLevel?.message}>
            <Select value={form.watch('experienceLevel')} onValueChange={(value) => form.setValue('experienceLevel', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Goal" error={form.formState.errors.goal?.message}>
            <Textarea placeholder="Build production AI systems and ship portfolio projects." {...form.register('goal')} />
          </Field>
          <Field label="Weekly hours" error={form.formState.errors.weeklyHours?.message}>
            <Input type="number" {...form.register('weeklyHours')} />
          </Field>
          <Field label="Provider">
            <Select value={form.watch('providerId')} onValueChange={(value) => {
              form.setValue('providerId', value);
              form.setValue('modelId', '');
            }}>
              <SelectTrigger><SelectValue placeholder="Use user default" /></SelectTrigger>
              <SelectContent>
                {(providers.data ?? []).map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Model">
            <Select value={form.watch('modelId')} onValueChange={(value) => form.setValue('modelId', value)}>
              <SelectTrigger><SelectValue placeholder="Use default model" /></SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>{model.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button className="w-full" disabled={generateRoadmap.isPending}>
            {generateRoadmap.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate roadmap
          </Button>
        </form>
      </Card>
      <Card className="min-h-[36rem] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Generation stream</h2>
          <Badge variant={generateRoadmap.isPending ? 'success' : 'outline'}>
            {generateRoadmap.isPending ? 'Running' : 'Idle'}
          </Badge>
        </div>
        <Progress value={progress} />
        <div className="mt-4 rounded-md border border-border bg-background p-4 text-sm leading-6">
          {generateRoadmap.data?.text ? (
            <pre className="whitespace-pre-wrap font-sans">{generateRoadmap.data.text}</pre>
          ) : (
            <p className="text-muted-foreground">
              Generated roadmap output and streaming updates will appear here.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
