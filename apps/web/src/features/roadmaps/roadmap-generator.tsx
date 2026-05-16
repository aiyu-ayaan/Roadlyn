'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Brain, CheckSquare, Github, Loader2, PlaySquare, Search, Sparkles, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Field } from '@/components/forms/field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviders } from '@/hooks/use-ai';
import { useGenerateRoadmap } from '@/hooks/use-roadmaps';

const generationSchema = z.object({
  topic: z.string().min(2),
  experienceLevel: z.string().min(1),
  goal: z.string().min(2),
  weeklyHours: z.coerce.number().min(1).max(80),
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
});

type GenerationValues = z.infer<typeof generationSchema>;

export function RoadmapGenerator() {
  const router = useRouter();
  const providers = useProviders();
  const generateRoadmap = useGenerateRoadmap();
  const form = useForm<GenerationValues>({
    resolver: zodResolver(generationSchema),
    defaultValues: {
      topic: '',
      experienceLevel: 'beginner',
      goal: 'Become job-ready with portfolio projects',
      weeklyHours: 8,
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
    },
  });
  const selectedProvider = providers.data?.find((provider) => provider.id === form.watch('providerId'));
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
            Roadlyn creates a background job, scrapes current resources, ranks them, and generates a structured course with
            modules, lessons, projects, quizzes, milestones, and interview prep.
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            const result = await generateRoadmap.mutateAsync({
              ...values,
              providerId: values.providerId || undefined,
              modelId: values.modelId || undefined,
              useUserDefaults: !values.providerId || !values.modelId,
            });
            router.push(`/roadmaps/${result.roadmapId}`);
          })}
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
            <Textarea placeholder="Become job ready in 6 months." {...form.register('goal')} />
          </Field>
          <Field label="Weekly hours" error={form.formState.errors.weeklyHours?.message}>
            <Input type="number" {...form.register('weeklyHours')} />
          </Field>
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
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{task.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <Field label="Provider">
            <Select value={form.watch('providerId')} onValueChange={(value) => {
              form.setValue('providerId', value);
              form.setValue('modelId', '');
            }}>
              <SelectTrigger><SelectValue placeholder="Use platform default" /></SelectTrigger>
              <SelectContent>
                {(providers.data ?? []).map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}{provider.isDefault ? ' · default' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Model">
            <Select value={form.watch('modelId')} onValueChange={(value) => form.setValue('modelId', value)}>
              <SelectTrigger><SelectValue placeholder="Use provider default model" /></SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>{model.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button className="w-full" disabled={generateRoadmap.isPending}>
            {generateRoadmap.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Start background generation
          </Button>
        </form>
      </Card>

      <Card className="flex min-h-[34rem] flex-col justify-center p-5">
        <div className="mx-auto max-w-xl text-center">
          <Sparkles className="mx-auto size-9 text-blue-300" />
          <h2 className="mt-4 text-3xl font-semibold">Your course will keep building in the background</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            After you start generation, Roadlyn opens the course page immediately. The page polls the job until live
            research and AI course generation are complete.
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
