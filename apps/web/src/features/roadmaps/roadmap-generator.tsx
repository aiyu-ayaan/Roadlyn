'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  Github,
  GraduationCap,
  Layers3,
  Loader2,
  PlayCircle,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
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
import { CoursePhase, GeneratedCourse } from '@/types';

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
      goal: 'Become job-ready with portfolio projects',
      weeklyHours: 8,
      providerId: '',
      modelId: '',
    },
  });
  const selectedProvider = providers.data?.find((provider) => provider.id === form.watch('providerId'));
  const models = useMemo(() => selectedProvider?.models ?? [], [selectedProvider]);
  const course = useMemo(
    () => normalizeCourse(generateRoadmap.data?.roadmap, generateRoadmap.data?.text),
    [generateRoadmap.data],
  );
  const progress =
    latest?.type === 'roadmap.progress' && typeof latest.payload.progress === 'number'
      ? latest.payload.progress
      : generateRoadmap.isPending
        ? 58
        : course
          ? 100
          : 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-5">
          <div className="mb-5">
            <Badge variant="outline" className="border-blue-400/20 bg-blue-500/10 text-blue-200">
              <Search className="mr-1 size-3" />
              Live web research
            </Badge>
            <h2 className="mt-4 text-2xl font-semibold">Build a full AI course</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Roadlyn searches current docs, videos, repos, articles, courses, and community recommendations before generating.
            </p>
          </div>
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
              <Textarea placeholder="Become job ready in 6 months." {...form.register('goal')} />
            </Field>
            <Field label="Weekly hours" error={form.formState.errors.weeklyHours?.message}>
              <Input type="number" {...form.register('weeklyHours')} />
            </Field>
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
              Generate AI course
            </Button>
          </form>
        </Card>

        <Card className="min-h-[34rem] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Course generation</h2>
              <p className="text-sm text-muted-foreground">Research, rank, structure, and synthesize.</p>
            </div>
            <Badge variant={generateRoadmap.isPending ? 'success' : 'outline'}>
              {generateRoadmap.isPending ? 'Researching web' : course ? 'Ready' : 'Idle'}
            </Badge>
          </div>
          <Progress value={progress} />

          {generateRoadmap.isPending ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {['Searching latest tutorials', 'Ranking YouTube lessons', 'Scanning GitHub repos', 'Building Udemy-style modules'].map((item) => (
                <div key={item} className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                  <Loader2 className="mb-3 size-4 animate-spin text-blue-300" />
                  {item}
                </div>
              ))}
            </div>
          ) : course ? (
            <CourseOverview course={course} />
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              Your generated course will appear here as modules, lessons, resources, projects, quizzes, interview prep, and milestones.
            </div>
          )}
        </Card>
      </section>

      {course ? <CourseDetail course={course} /> : null}
    </div>
  );
}

function CourseOverview({ course }: { course: GeneratedCourse }) {
  return (
    <div className="mt-5 space-y-5">
      <div>
        <h3 className="text-3xl font-semibold">{course.title}</h3>
        <p className="mt-3 leading-7 text-muted-foreground">{course.overview}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Duration', value: course.estimatedDuration, icon: Clock3 },
          { label: 'Level', value: course.skillLevel, icon: GraduationCap },
          { label: 'Modules', value: String(course.phases?.length ?? 0), icon: Layers3 },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-lg border border-border bg-background p-4">
              <Icon className="size-4 text-blue-300" />
              <p className="mt-3 text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-1 font-semibold">{metric.value}</p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {(course.skillOutcomes ?? []).slice(0, 6).map((outcome) => (
          <Badge key={outcome} variant="secondary">{outcome}</Badge>
        ))}
      </div>
    </div>
  );
}

function CourseDetail({ course }: { course: GeneratedCourse }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-4">
        {(course.phases ?? []).map((phase, index) => (
          <PhaseCard key={`${phase.title}-${index}`} phase={phase} index={index} />
        ))}
      </div>
      <div className="space-y-4">
        <Panel title="Projects" icon={Code2}>
          {(course.projects ?? []).map((project) => (
            <div key={project.title} className="border-b border-border py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium">{project.title}</h4>
                <Badge variant="outline">{project.level}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Milestones" icon={Target}>
          {(course.milestones ?? []).map((milestone) => (
            <div key={`${milestone.week}-${milestone.outcome}`} className="border-b border-border py-3 last:border-b-0">
              <p className="font-medium">{milestone.week}: {milestone.outcome}</p>
              <p className="mt-1 text-sm text-muted-foreground">{milestone.checkpoint}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Interview Prep" icon={BookOpen}>
          {(course.interviewPrep ?? []).map((item) => (
            <div key={item.topic} className="border-b border-border py-3 last:border-b-0">
              <h4 className="font-medium">{item.topic}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{item.portfolioSuggestion}</p>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function PhaseCard({ phase, index }: { phase: CoursePhase; index: number }) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge variant="outline">Module {index + 1} · {phase.difficultyLevel}</Badge>
          <h3 className="mt-3 text-xl font-semibold">{phase.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{phase.description}</p>
        </div>
        <Badge variant="secondary">
          <Clock3 className="mr-1 size-3" />
          {phase.estimatedDuration}
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ResourceBlock title="Official docs" icon={FileText} items={phase.officialDocs} />
        <ResourceBlock title="YouTube videos" icon={PlayCircle} items={phase.youtubeVideos} />
        <ResourceBlock title="GitHub repos" icon={Github} items={phase.githubRepos} />
        <ListBlock title="Exercises" icon={CheckCircle2} items={[...(phase.exercises ?? []), ...(phase.miniProjects ?? [])]} />
      </div>
    </Card>
  );
}

function ResourceBlock({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items?: Array<Record<string, unknown>>;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-blue-300" />
        <h4 className="font-medium">{title}</h4>
      </div>
      <div className="space-y-3">
        {(items ?? []).slice(0, 3).map((item, index) => {
          const label = String(item.title ?? item.repositoryName ?? `Resource ${index + 1}`);
          const url = typeof item.url === 'string' ? item.url : undefined;
          return (
            <a
              key={`${label}-${index}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-border px-3 py-2 text-sm transition hover:border-blue-400/30 hover:bg-white/[0.04]"
            >
              <span className="font-medium">{label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {String(item.summary ?? item.whyRecommended ?? item.whyUseful ?? item.source ?? 'Current curated resource')}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ListBlock({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-blue-300" />
        <h4 className="font-medium">{title}</h4>
      </div>
      <div className="space-y-2">
        {items.slice(0, 6).map((item) => (
          <div key={item} className="flex gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 text-blue-300" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function normalizeCourse(roadmap?: unknown, text?: string): GeneratedCourse | null {
  if (isGeneratedCourse(roadmap)) {
    return roadmap;
  }

  if (!text) {
    return null;
  }

  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[0]) as unknown;
    return isGeneratedCourse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isGeneratedCourse(value: unknown): value is GeneratedCourse {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'title' in value &&
    'phases' in value &&
    Array.isArray((value as GeneratedCourse).phases),
  );
}
