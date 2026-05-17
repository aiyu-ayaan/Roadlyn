'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen,
  Brain,
  CheckSquare,
  Github,
  Loader2,
  Lock,
  PlaySquare,
  Search,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Field } from '@/components/forms/field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProviders } from '@/hooks/use-ai';
import { useEnrollRoadmap, useGenerateRoadmap } from '@/hooks/use-roadmaps';
import { RoadmapGenerateRequest, RoadmapSimilarityResult } from '@/types';

const generationSchema = z.object({
  topic: z.string().min(2),
  experienceLevel: z.string().min(1),
  goal: z.string().min(2),
  weeklyHours: z.coerce.number().min(1).max(80),
  moduleCount: z.coerce.number().int().min(4).max(6),
  courseDepth: z.enum(['standard', 'full-length', 'masterclass']),
  generationOptions: z.object({
    liveSearch: z.boolean(),
    youtubeVideos: z.boolean(),
    githubRepos: z.boolean(),
    officialDocs: z.boolean(),
    projects: z.boolean(),
    quizzes: z.boolean(),
    interviewPrep: z.boolean(),
    summaries: z.boolean(),
    certifications: z.boolean(),
  }),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC']),
});

type GenerationValues = z.infer<typeof generationSchema>;

export function RoadmapGenerator() {
  const router = useRouter();
  const providers = useProviders();
  const generateRoadmap = useGenerateRoadmap();
  const enrollRoadmap = useEnrollRoadmap();
  const [similarityPrompt, setSimilarityPrompt] = useState<{
    values: GenerationValues;
    result: RoadmapSimilarityResult;
  } | null>(null);
  const form = useForm<GenerationValues>({
    resolver: zodResolver(generationSchema),
    defaultValues: {
      topic: '',
      experienceLevel: 'beginner',
      goal: 'Become job-ready with portfolio projects',
      weeklyHours: 8,
      moduleCount: 6,
      courseDepth: 'masterclass',
      generationOptions: {
        liveSearch: true,
        youtubeVideos: true,
        githubRepos: true,
        officialDocs: true,
        projects: true,
        quizzes: true,
        interviewPrep: true,
        summaries: true,
        certifications: true,
      },
      providerId: '',
      modelId: '',
      visibility: 'PRIVATE',
    },
  });
  const selectedProvider = providers.data?.find(
    (provider) => provider.id === form.watch('providerId')
  );
  const models = useMemo(() => selectedProvider?.models ?? [], [selectedProvider]);

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="p-5">
        <div className="mb-5">
          <Badge variant="outline" className="border-blue-400/20 bg-blue-500/10 text-blue-200">
            <Search className="mr-1 size-3" />
            Background live research
          </Badge>
          <h2 className="mt-4 text-2xl font-semibold">Build a full AI course</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Roadlyn creates a background job, scrapes current resources, ranks them, and generates a
            structured course with modules, lessons, projects, quizzes, milestones, and interview
            prep.
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            const payload = toGeneratePayload(values);
            const result = await generateRoadmap.mutateAsync(payload);

            if ('roadmapId' in result && result.roadmapId) {
              router.push(`/roadmaps/${result.roadmapId}`);
              return;
            }

            if (!result.shouldGenerateNewRoadmap && result.existingRoadmaps.length > 0) {
              setSimilarityPrompt({ values, result });
            }
          })}
        >
          <Field label="Topic" error={form.formState.errors.topic?.message}>
            <Input placeholder="AI Engineering" {...form.register('topic')} />
          </Field>
          <Field label="Experience level" error={form.formState.errors.experienceLevel?.message}>
            <Select
              value={form.watch('experienceLevel')}
              onValueChange={(value) => form.setValue('experienceLevel', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Goal" error={form.formState.errors.goal?.message}>
            <Textarea placeholder="Become job ready in 6 months." {...form.register('goal')} />
          </Field>
          <Field label="Weekly hours" error={form.formState.errors.weeklyHours?.message}>
            <Input type="number" {...form.register('weeklyHours')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course modules" error={form.formState.errors.moduleCount?.message}>
              <Select
                value={String(form.watch('moduleCount'))}
                onValueChange={(value) => form.setValue('moduleCount', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6].map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} full modules
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Course depth" error={form.formState.errors.courseDepth?.message}>
              <Select
                value={form.watch('courseDepth')}
                onValueChange={(value) =>
                  form.setValue('courseDepth', value as GenerationValues['courseDepth'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masterclass">Masterclass</SelectItem>
                  <SelectItem value="full-length">Full-length</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div>
            <p className="text-sm font-medium">Generation tasks</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {generationTasks.map((task) => {
                const Icon = task.icon;

                return (
                  <label
                    key={task.name}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm transition hover:border-blue-400/30"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      {...form.register(`generationOptions.${task.name}`)}
                    />
                    <span>
                      <span className="flex items-center gap-2 font-medium">
                        <Icon className="size-4 text-blue-300" />
                        {task.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {task.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <Field label="Provider">
            <Select
              value={form.watch('providerId')}
              onValueChange={(value) => {
                form.setValue('providerId', value);
                form.setValue('modelId', '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use platform default" />
              </SelectTrigger>
              <SelectContent>
                {(providers.data ?? []).map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                    {provider.isDefault ? ' · default' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Model">
            <Select
              value={form.watch('modelId')}
              onValueChange={(value) => form.setValue('modelId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use provider default model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Publish setting" error={form.formState.errors.visibility?.message}>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  value: 'PRIVATE',
                  label: 'Private',
                  icon: Lock,
                  text: 'Only you can open this course.',
                },
                {
                  value: 'PUBLIC',
                  label: 'Public',
                  icon: Users,
                  text: 'List it in Discovery so others can add it.',
                },
              ].map((option) => {
                const Icon = option.icon;
                const selected = form.watch('visibility') === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-lg border p-3 text-left transition ${
                      selected
                        ? 'border-blue-400/60 bg-blue-500/10'
                        : 'border-white/10 bg-black/20 hover:border-blue-400/30'
                    }`}
                    onClick={() =>
                      form.setValue('visibility', option.value as GenerationValues['visibility'])
                    }
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-blue-300" />
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {option.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
          <Button className="w-full" disabled={generateRoadmap.isPending || enrollRoadmap.isPending}>
            {generateRoadmap.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Start background generation
          </Button>
        </form>

        {similarityPrompt ? (
          <div className="mt-6 space-y-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
            <div>
              <p className="text-sm font-medium text-amber-100">
                Similar public courses already exist
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-100/80">
                Reuse an existing roadmap to save tokens and generation time, or generate a new
                course anyway.
              </p>
            </div>
            <div className="space-y-2">
                {similarityPrompt.result.existingRoadmaps.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                      <div>
                        <p className="text-sm font-medium">{match.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Math.round(match.similarityScore * 100)}% match
                          {typeof match.enrollmentCount === 'number'
                            ? ` · ${match.enrollmentCount} enrolled`
                            : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={enrollRoadmap.isPending}
                        onClick={async () => {
                          await enrollRoadmap.mutateAsync(match.id);
                          router.push(`/roadmaps/${match.id}`);
                        }}
                      >
                        Use this roadmap
                      </Button>
                  </div>
                ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setSimilarityPrompt(null)}
              >
                Back to form
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={generateRoadmap.isPending}
                onClick={async () => {
                  const result = await generateRoadmap.mutateAsync({
                    ...toGeneratePayload(similarityPrompt.values),
                    forceRegenerate: true,
                  });

                  if ('roadmapId' in result && result.roadmapId) {
                    setSimilarityPrompt(null);
                    router.push(`/roadmaps/${result.roadmapId}`);
                  }
                }}
              >
                {generateRoadmap.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                Generate new anyway
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="flex min-h-[34rem] flex-col justify-center p-5">
        <div className="mx-auto max-w-xl text-center">
          <Sparkles className="mx-auto size-9 text-blue-300" />
          <h2 className="mt-4 text-3xl font-semibold">
            Your course will keep building in the background
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            After you start generation, Roadlyn opens the course page immediately. The page polls
            the job until live research and AI course generation are complete.
          </p>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            {generationTasks.slice(0, 6).map((task) => {
              const Icon = task.icon;

              return (
                <div key={task.name} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <Icon className="size-4 text-blue-300" />
                  <p className="mt-2 text-sm font-medium">{task.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </section>
  );
}

const generationTasks = [
  {
    name: 'liveSearch',
    label: 'Live search',
    description: 'Find current tutorials, courses, docs, articles, and communities.',
    icon: Search,
  },
  {
    name: 'youtubeVideos',
    label: 'YouTube lessons',
    description: 'Prefer videos that can be opened in the course player.',
    icon: PlaySquare,
  },
  {
    name: 'githubRepos',
    label: 'GitHub labs',
    description: 'Add repositories, examples, and practice code paths.',
    icon: Github,
  },
  {
    name: 'officialDocs',
    label: 'Official docs',
    description: 'Anchor every module with trusted primary references.',
    icon: BookOpen,
  },
  {
    name: 'projects',
    label: 'Projects',
    description: 'Generate guided tasks, portfolio builds, and capstones.',
    icon: CheckSquare,
  },
  {
    name: 'quizzes',
    label: 'Quizzes',
    description: 'Add self-check questions with answers per module.',
    icon: Brain,
  },
  {
    name: 'interviewPrep',
    label: 'Interview prep',
    description: 'Create practical questions and portfolio talking points.',
    icon: Trophy,
  },
  {
    name: 'summaries',
    label: 'Course summaries',
    description: 'Generate explainers between lessons and module recaps.',
    icon: Sparkles,
  },
  {
    name: 'certifications',
    label: 'Certificates',
    description: 'Suggest relevant certificates and external credentials.',
    icon: Trophy,
  },
] as const;

function toGeneratePayload(values: GenerationValues): RoadmapGenerateRequest {
  return {
    ...values,
    providerId: values.providerId || undefined,
    modelId: values.modelId || undefined,
    useUserDefaults: !values.providerId || !values.modelId,
  };
}
