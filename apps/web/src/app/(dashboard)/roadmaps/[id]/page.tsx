'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  FileText,
  Github,
  GraduationCap,
  Loader2,
  PlayCircle,
  Target,
  Trash2,
  Video,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeleteRoadmap, useRoadmap } from '@/hooks/use-roadmaps';
import { CoursePhase, CourseResource, GeneratedCourse } from '@/types';

export default function RoadmapDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const roadmap = useRoadmap(params.id);
  const deleteRoadmap = useDeleteRoadmap();
  const data = roadmap.data;
  const course = data?.generatedCourse;
  const isWorking = data?.status === 'QUEUED' || data?.status === 'RUNNING';

  return (
    <div className="space-y-6">
      <PageHeader
        title={data?.title ?? 'Roadmap'}
        description={course?.overview ?? 'Roadlyn is building this course from live web research.'}
        action={
          <div className="flex gap-2">
            {data ? (
              <Button
                variant="outline"
                disabled={deleteRoadmap.isPending}
                onClick={async () => {
                  if (!window.confirm('Delete this generated roadmap? This cannot be undone.')) return;
                  await deleteRoadmap.mutateAsync(data.id);
                  router.push('/roadmaps');
                }}
              >
                <Trash2 />
                Delete
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/roadmaps">All roadmaps</Link>
            </Button>
          </div>
        }
      />

      {roadmap.isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading roadmap...</Card>
      ) : !data ? (
        <Card className="p-6 text-sm text-muted-foreground">Roadmap not found.</Card>
      ) : data.status === 'FAILED' ? (
        <Card className="p-6">
          <Badge variant="destructive">failed</Badge>
          <h2 className="mt-3 text-xl font-semibold">Generation failed</h2>
          <p className="mt-2 text-sm text-muted-foreground">{data.errorMessage ?? 'Roadmap generation failed.'}</p>
          <Button className="mt-5" asChild>
            <Link href="/roadmaps/generate">Generate again</Link>
          </Button>
        </Card>
      ) : isWorking || !course ? (
        <GenerationStatus
          title={data.topic ?? data.title}
          status={data.status}
          progress={data.progress}
          resources={data.researchedResources ?? []}
        />
      ) : (
        <CourseScreen course={course} resources={data.researchedResources ?? course.resources ?? []} notice={data.errorMessage} />
      )}
    </div>
  );
}

function GenerationStatus({
  title,
  status,
  progress,
  resources,
}: {
  title: string;
  status: string;
  progress: number;
  resources: CourseResource[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="ai-glow flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500">
            <Loader2 className="size-5 animate-spin" />
          </span>
          <div>
            <Badge variant="success">{status.toLowerCase()}</Badge>
            <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
          </div>
        </div>
        <Progress className="mt-6" value={progress} />
        <p className="mt-3 text-sm text-muted-foreground">
          Roadlyn is searching current tutorials, official docs, videos, GitHub repositories, articles, courses, and
          community recommendations, then turning them into a structured course.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Sources found</h2>
        <div className="mt-4 space-y-3">
          {resources.length ? resources.slice(0, 6).map((resource) => (
            <a
              key={resource.url}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-white/10 bg-black/20 p-3 text-sm transition hover:border-blue-400/30"
            >
              <span className="font-medium">{resource.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{resource.source}</span>
            </a>
          )) : (
            <p className="rounded-lg border border-dashed border-white/10 bg-black/20 p-3 text-sm text-muted-foreground">
              Research sources will appear here as the background task runs.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function CourseScreen({
  course,
  resources,
  notice,
}: {
  course: GeneratedCourse;
  resources: CourseResource[];
  notice?: string | null;
}) {
  const firstPhase = course.phases?.[0];
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const activePhase = course.phases?.[activePhaseIndex] ?? firstPhase;
  const lessons = useMemo(() => buildLessons(activePhase), [activePhase]);

  return (
    <div className="grid gap-6 xl:grid-cols-[20rem_1fr]">
      <Card className="h-max overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <Badge variant="outline">{course.skillLevel}</Badge>
          <h2 className="mt-3 text-xl font-semibold">{course.title}</h2>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="size-4" />
            {course.estimatedDuration}
          </div>
        </div>
        <div className="divide-y divide-white/10">
          {(course.phases ?? []).map((phase, index) => (
            <button
              key={`${phase.title}-${index}`}
              type="button"
              onClick={() => setActivePhaseIndex(index)}
              className={`block w-full p-4 text-left transition hover:bg-white/[0.04] ${activePhaseIndex === index ? 'bg-white/[0.06]' : ''}`}
            >
              <div className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-medium">{phase.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{phase.estimatedDuration}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-6">
        {notice ? (
          <Card className="border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            {notice}
          </Card>
        ) : null}

        <Card className="overflow-hidden">
          <div className="grid min-h-[22rem] place-items-center bg-gradient-to-br from-slate-950 via-blue-950/35 to-violet-950/40 p-8 text-center">
            <div>
              <PlayCircle className="mx-auto size-14 text-blue-200" />
              <h2 className="mt-5 text-3xl font-semibold">{activePhase?.title ?? course.title}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {activePhase?.description ?? course.overview}
              </p>
            </div>
          </div>
          <div className="grid gap-4 border-t border-white/10 p-5 md:grid-cols-3">
            <Metric icon={GraduationCap} label="Outcomes" value={String(course.skillOutcomes?.length ?? 0)} />
            <Metric icon={BookOpen} label="Modules" value={String(course.phases?.length ?? 0)} />
            <Metric icon={Target} label="Milestones" value={String(course.milestones?.length ?? 0)} />
          </div>
        </Card>

        {activePhase ? (
          <Card className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <Badge variant="outline">Selected module</Badge>
                <h2 className="mt-3 text-2xl font-semibold">{activePhase.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{activePhase.description}</p>
              </div>
              <Badge variant="secondary">{activePhase.estimatedDuration}</Badge>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {lessons.map((lesson) => (
                <a
                  key={lesson.title}
                  href={lesson.href}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4 text-sm transition hover:border-blue-400/30 hover:bg-white/[0.04]"
                >
                  <span className="flex items-center gap-3">
                    <lesson.icon className="size-4 text-blue-300" />
                    <span>
                      <span className="block font-medium">{lesson.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{lesson.detail}</span>
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </Card>
        ) : null}

        <Tabs defaultValue="curriculum">
          <TabsList>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="interview">Interview</TabsTrigger>
          </TabsList>
          <TabsContent id="curriculum" value="curriculum" className="space-y-4">
            {(course.phases ?? []).map((phase, index) => (
              <PhaseModule
                key={`${phase.title}-${index}`}
                phase={phase}
                index={index}
                active={activePhaseIndex === index}
                onSelect={() => setActivePhaseIndex(index)}
              />
            ))}
          </TabsContent>
          <TabsContent value="projects" className="grid gap-4 md:grid-cols-2">
            {(course.projects ?? []).map((project) => (
              <Card key={project.title} className="p-5">
                <Badge variant="outline">{project.level}</Badge>
                <h3 className="mt-3 text-lg font-semibold">{project.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
                <div className="mt-4 space-y-2">
                  {project.deliverables?.map((deliverable) => (
                    <p key={deliverable} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                      {deliverable}
                    </p>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="resources" className="grid gap-4 md:grid-cols-2">
            {resources.map((resource) => (
              <ResourceLink key={resource.url} resource={resource} />
            ))}
          </TabsContent>
          <TabsContent value="interview" className="space-y-4">
            {(course.interviewPrep ?? []).map((item) => (
              <Card key={item.topic} className="p-5">
                <h3 className="text-lg font-semibold">{item.topic}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{item.portfolioSuggestion}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {item.practicalQuestions?.map((question) => (
                    <div key={question} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-muted-foreground">
                      {question}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PhaseModule({
  phase,
  index,
  active,
  onSelect,
}: {
  phase: CoursePhase;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Card id={`module-${index}`} className={`p-5 ${active ? 'border-blue-400/30' : ''}`}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="outline">Module {index + 1} · {phase.difficultyLevel}</Badge>
            <h3 className="mt-3 text-xl font-semibold">{phase.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{phase.description}</p>
          </div>
          <Badge variant="secondary">{phase.estimatedDuration}</Badge>
        </div>
      </button>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <DetailList title="Prerequisites" items={phase.prerequisites ?? []} />
        <DetailList title="Objectives" items={phase.learningObjectives ?? []} />
        <DetailList title="Quizzes" items={(phase.quizzes ?? []).map((quiz) => quiz.question)} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ResourceGroup title="Official docs" icon={FileText} resources={phase.officialDocs?.map((item) => ({ ...item, kind: 'officialDocs' as const, freshnessRelevance: 'Official source' })) ?? []} />
        <ResourceGroup title="YouTube lessons" icon={Video} resources={phase.youtubeVideos?.map((item) => ({ kind: 'youtube' as const, title: item.title, url: item.url, source: item.channelName ?? 'YouTube', freshnessRelevance: item.whyRecommended, summary: item.whyRecommended, duration: item.duration, channelName: item.channelName })) ?? []} />
        <ResourceGroup title="GitHub repositories" icon={Github} resources={phase.githubRepos?.map((item) => ({ kind: 'github' as const, title: item.repositoryName, url: item.url, source: 'GitHub', freshnessRelevance: item.projectRelevance, summary: item.whyUseful, stars: item.stars })) ?? []} />
        <Card className="border-white/10 bg-black/20 p-4">
          <h4 className="flex items-center gap-2 font-medium">
            <Code2 className="size-4 text-blue-300" />
            Exercises
          </h4>
          <div className="mt-3 space-y-2">
            {[...(phase.exercises ?? []), ...(phase.miniProjects ?? [])].length ? (
              [...(phase.exercises ?? []), ...(phase.miniProjects ?? [])].slice(0, 8).map((item) => (
                <label key={item} className="flex cursor-pointer gap-2 rounded-md p-1 text-sm text-muted-foreground hover:bg-white/[0.04]">
                  <input type="checkbox" className="mt-1" />
                  <span>{item}</span>
                </label>
              ))
            ) : (
              <EmptyPanel text="No exercises were generated for this module." />
            )}
          </div>
        </Card>
      </div>
    </Card>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <h4 className="font-medium">{title}</h4>
      <div className="mt-3 space-y-2">
        {items.length ? items.slice(0, 5).map((item) => (
          <p key={item} className="flex gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
            {item}
          </p>
        )) : (
          <EmptyPanel text={`No ${title.toLowerCase()} generated.`} />
        )}
      </div>
    </div>
  );
}

function ResourceGroup({
  title,
  icon: Icon,
  resources,
}: {
  title: string;
  icon: typeof FileText;
  resources: CourseResource[];
}) {
  return (
    <Card className="border-white/10 bg-black/20 p-4">
      <h4 className="flex items-center gap-2 font-medium">
        <Icon className="size-4 text-blue-300" />
        {title}
      </h4>
      <div className="mt-3 space-y-3">
        {resources.length ? (
          resources.slice(0, 4).map((resource) => (
            <ResourceLink key={resource.url} resource={resource} compact />
          ))
        ) : (
          <EmptyPanel text="No source links were generated for this section." />
        )}
      </div>
    </Card>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
      {text}
    </p>
  );
}

function buildLessons(phase?: CoursePhase) {
  if (!phase) return [];

  return [
    {
      title: 'Prerequisites',
      detail: `${phase.prerequisites?.length ?? 0} items`,
      href: '#curriculum',
      icon: CheckCircle2,
    },
    {
      title: 'Learning objectives',
      detail: `${phase.learningObjectives?.length ?? 0} objectives`,
      href: '#curriculum',
      icon: Target,
    },
    {
      title: 'Resources',
      detail: `${(phase.officialDocs?.length ?? 0) + (phase.youtubeVideos?.length ?? 0) + (phase.githubRepos?.length ?? 0)} links`,
      href: '#curriculum',
      icon: BookOpen,
    },
    {
      title: 'Exercises',
      detail: `${(phase.exercises?.length ?? 0) + (phase.miniProjects?.length ?? 0)} tasks`,
      href: '#curriculum',
      icon: Code2,
    },
  ];
}

function ResourceLink({ resource, compact = false }: { resource: CourseResource; compact?: boolean }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm transition hover:border-blue-400/30"
    >
      <span className="font-medium">{resource.title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">
        {resource.source}{resource.stars ? ` · ${resource.stars.toLocaleString()} stars` : ''}
      </span>
      {!compact && resource.summary ? (
        <span className="mt-2 block text-xs leading-5 text-muted-foreground">{resource.summary}</span>
      ) : null}
    </a>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <Icon className="size-4 text-blue-300" />
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
