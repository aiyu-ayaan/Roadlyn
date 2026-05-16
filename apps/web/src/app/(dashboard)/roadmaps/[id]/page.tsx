'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  ExternalLink,
  FileText,
  Github,
  GraduationCap,
  LayoutPanelLeft,
  Loader2,
  Menu,
  Sparkles,
  Target,
  Trash2,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeleteRoadmap, useRoadmap } from '@/hooks/use-roadmaps';
import { CoursePhase, CourseProject, CourseResource, GeneratedCourse, InterviewPrep } from '@/types';

type CourseItem =
  | { type: 'summary'; title: string; detail: string; content: string[]; resource?: never }
  | { type: 'resource'; title: string; detail: string; content?: never; resource: CourseResource }
  | { type: 'practice'; title: string; detail: string; content: string[]; resource?: never }
  | { type: 'quiz'; title: string; detail: string; content: string[]; resource?: never };

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
        <CourseScreen
          course={course}
          resources={data.researchedResources ?? course.resources ?? []}
          notice={data.errorMessage}
          roadmapId={data.id}
        />
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
  const stages = [
    { label: 'Search web', done: progress >= 20 },
    { label: 'Rank sources', done: progress >= 45 },
    { label: 'Write course', done: progress >= 75 },
    { label: 'Prepare player', done: progress >= 100 },
  ];

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
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage.label} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
              {stage.done ? <CheckCircle2 className="size-4 text-emerald-300" /> : <Circle className="size-4 text-muted-foreground" />}
              <p className="mt-2 font-medium">{stage.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          Roadlyn is preparing a course-player experience with current tutorials, official docs, videos, GitHub labs,
          projects, quizzes, summaries, and interview prep.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Sources found</h2>
        <div className="mt-4 space-y-3">
          {resources.length ? resources.slice(0, 6).map((resource) => (
            <div key={resource.url} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
              <span className="font-medium">{resource.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{resource.source}</span>
            </div>
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
  roadmapId,
}: {
  course: GeneratedCourse;
  resources: CourseResource[];
  notice?: string | null;
  roadmapId: string;
}) {
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const activePhase = course.phases?.[activePhaseIndex] ?? course.phases?.[0];
  const items = useMemo(() => buildCourseItems(activePhase), [activePhase]);
  const activeItem = items[activeItemIndex] ?? items[0];
  const completionKey = `${roadmapId}:${activePhaseIndex}`;
  const completedSet = useMemo(() => new Set(completed), [completed]);
  const completedCount = (course.phases ?? []).filter((_, index) => completedSet.has(`${roadmapId}:${index}`)).length;
  const courseProgress = course.phases?.length ? Math.round((completedCount / course.phases.length) * 100) : 0;

  useEffect(() => {
    const saved = window.localStorage.getItem(`roadlyn-course-progress:${roadmapId}`);
    if (saved) {
      setCompleted(JSON.parse(saved) as string[]);
    }
  }, [roadmapId]);

  useEffect(() => {
    setActiveItemIndex(0);
  }, [activePhaseIndex]);

  const saveCompleted = (next: string[]) => {
    setCompleted(next);
    window.localStorage.setItem(`roadlyn-course-progress:${roadmapId}`, JSON.stringify(next));
  };
  const markPhaseComplete = () => {
    if (completedSet.has(completionKey)) return;
    saveCompleted([...completed, completionKey]);
  };
  const openResource = (resource: CourseResource) => {
    const index = items.findIndex((item) => item.type === 'resource' && item.resource.url === resource.url);
    if (index >= 0) {
      setActiveItemIndex(index);
    }
  };

  return (
    <div className="relative">
      <CourseSidebar
        course={course}
        activePhaseIndex={activePhaseIndex}
        completedSet={completedSet}
        courseProgress={courseProgress}
        roadmapId={roadmapId}
        onSelectPhase={setActivePhaseIndex}
      />

      <main className="space-y-6">
        {notice ? (
          <Card className="border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            {notice}
          </Card>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-white/10 bg-card">
          <div className="grid min-h-[calc(100vh-14rem)] lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="flex min-h-[calc(100vh-14rem)] flex-col">
              <CoursePlayer
                course={course}
                phase={activePhase}
                item={activeItem}
                onEndReached={markPhaseComplete}
              />
              <div className="border-t border-white/10 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium">{activePhase?.title ?? course.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Scroll to the end of the lesson or mark it complete manually.
                    </p>
                  </div>
                  <Button variant={completedSet.has(completionKey) ? 'secondary' : 'default'} onClick={markPhaseComplete}>
                    <CheckCircle2 />
                    {completedSet.has(completionKey) ? 'Completed' : 'Mark section complete'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/20 lg:border-l lg:border-t-0">
              <div className="border-b border-white/10 p-4">
                <p className="text-sm font-medium">Course queue</p>
                <p className="mt-1 text-xs text-muted-foreground">Videos, sites, GitHub links, notes, tasks, and quizzes open here.</p>
              </div>
              <div className="max-h-[calc(100vh-18rem)] overflow-y-auto p-3">
                {items.map((item, index) => (
                  <button
                    key={`${item.type}-${item.title}-${index}`}
                    type="button"
                    onClick={() => setActiveItemIndex(index)}
                    className={`mb-2 flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition hover:border-blue-400/30 ${activeItemIndex === index ? 'border-blue-400/40 bg-blue-500/10' : 'border-white/10 bg-white/[0.035]'}`}
                  >
                    <ItemIcon item={item} />
                    <span>
                      <span className="block font-medium">{item.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CourseOverview course={course} resources={resources} onOpenResource={openResource} />
      </main>
    </div>
  );
}

function CourseSidebar({
  course,
  activePhaseIndex,
  completedSet,
  courseProgress,
  roadmapId,
  onSelectPhase,
}: {
  course: GeneratedCourse;
  activePhaseIndex: number;
  completedSet: Set<string>;
  courseProgress: number;
  roadmapId: string;
  onSelectPhase: (index: number) => void;
}) {
  return (
    <div className="group fixed left-0 top-28 z-40 hidden h-[calc(100vh-9rem)] w-10 xl:block">
      <div className="absolute left-0 top-28 flex h-20 w-10 items-center justify-center rounded-r-lg border border-l-0 border-white/10 bg-card/95 text-muted-foreground shadow-xl">
        <Menu className="size-4" />
      </div>
      <aside className="absolute left-0 top-0 h-full w-80 -translate-x-[17.75rem] overflow-hidden rounded-r-xl border border-l-0 border-white/10 bg-card/95 shadow-2xl shadow-black/30 backdrop-blur transition-transform duration-200 group-hover:translate-x-0">
        <div className="border-b border-white/10 p-4">
          <Badge variant="outline">{course.skillLevel}</Badge>
          <h2 className="mt-3 text-lg font-semibold">{course.title}</h2>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4" />
            {course.estimatedDuration}
          </div>
          <Progress className="mt-4" value={courseProgress} />
          <p className="mt-2 text-xs text-muted-foreground">{courseProgress}% complete</p>
        </div>
        <div className="h-[calc(100%-9rem)] overflow-y-auto">
          {(course.phases ?? []).map((phase, index) => {
            const isComplete = completedSet.has(`${roadmapId}:${index}`);
            const isActive = activePhaseIndex === index;

            return (
              <button
                key={`${phase.title}-${index}`}
                type="button"
                onClick={() => onSelectPhase(index)}
                className={`block w-full border-b border-white/10 p-4 text-left transition hover:bg-white/[0.04] ${isActive ? 'bg-white/[0.06]' : ''}`}
              >
                <div className="flex gap-3">
                  <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-xs ${isComplete ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/[0.06]'}`}>
                    {isComplete ? <CheckCircle2 className="size-4" /> : index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{phase.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{phase.estimatedDuration}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function CoursePlayer({
  course,
  phase,
  item,
  onEndReached,
}: {
  course: GeneratedCourse;
  phase?: CoursePhase;
  item?: CourseItem;
  onEndReached: () => void;
}) {
  const embedUrl = item?.type === 'resource' ? getEmbedUrl(item.resource.url) : null;

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      onScroll={(event) => {
        const target = event.currentTarget;
        if (target.scrollTop + target.clientHeight >= target.scrollHeight - 24) {
          onEndReached();
        }
      }}
    >
      {item?.type === 'resource' ? (
        <div className="flex min-h-[34rem] flex-col">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="outline">{item.resource.kind}</Badge>
              <h2 className="mt-2 text-xl font-semibold">{item.resource.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.resource.source}</p>
            </div>
            <Button variant="outline" asChild>
              <a href={item.resource.url} target="_blank" rel="noreferrer">
                <ArrowUpRight />
                Open original
              </a>
            </Button>
          </div>
          {embedUrl ? (
            <iframe
              title={item.resource.title}
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="aspect-video w-full bg-black"
            />
          ) : (
            <ResourcePreview resource={item.resource} phase={phase} />
          )}
          {embedUrl ? (
            <div className="border-t border-white/10 p-5">
              <ResourceStudyNotes resource={item.resource} phase={phase} />
            </div>
          ) : null}
        </div>
      ) : (
        <article className="p-6">
          <div className="mx-auto max-w-4xl">
            <Badge variant="outline">{phase?.difficultyLevel ?? course.skillLevel}</Badge>
            <h1 className="mt-4 text-3xl font-semibold">{item?.title ?? phase?.title ?? course.title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{phase?.description ?? course.overview}</p>
            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="size-5 text-blue-300" />
                Course summary
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {course.courseSummary ?? course.overview}
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Metric icon={GraduationCap} label="Outcomes" value={String(course.skillOutcomes?.length ?? 0)} />
              <Metric icon={BookOpen} label="Modules" value={String(course.phases?.length ?? 0)} />
              <Metric icon={Target} label="Milestones" value={String(course.milestones?.length ?? 0)} />
            </div>
            <div className="mt-6 space-y-3">
              {(item?.content ?? phase?.lessonNotes ?? phase?.learningObjectives ?? []).map((line) => (
                <p key={line} className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

function ResourcePreview({ resource, phase }: { resource: CourseResource; phase?: CoursePhase }) {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-white/10 bg-black/20 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-300">
                {resource.kind === 'github' ? <Github className="size-5" /> : <ExternalLink className="size-5" />}
                <span className="text-sm font-medium">{resource.kind === 'github' ? 'Repository lab' : 'Reading lesson'}</span>
              </div>
              <h3 className="mt-4 text-3xl font-semibold">{resource.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{resource.source}</p>
            </div>
            <Button variant="outline" asChild>
              <a href={resource.url} target="_blank" rel="noreferrer">
                <ArrowUpRight />
                Open original
              </a>
            </Button>
          </div>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            This site may block embedded loading, so Roadlyn keeps the learning flow inside the course and gives you the
            original link when you need the source page. Use the notes below as the playable lesson content.
          </p>
        </div>

        <ResourceStudyNotes resource={resource} phase={phase} />
      </div>
    </div>
  );
}

function ResourceStudyNotes({ resource, phase }: { resource: CourseResource; phase?: CoursePhase }) {
  const objectives = phase?.learningObjectives?.slice(0, 4) ?? [];
  const tasks = [...(phase?.exercises ?? []), ...(phase?.miniProjects ?? [])].slice(0, 4);

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
        <h4 className="text-lg font-semibold">What to learn here</h4>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {resource.summary ?? resource.freshnessRelevance}
        </p>
        <div className="mt-5 space-y-3">
          {(objectives.length ? objectives : ['Read the resource with the current module goal in mind.', 'Capture the decisions, APIs, commands, and examples you can reuse.']).map((item) => (
            <p key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
              <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-300" />
              {item}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
        <h4 className="text-lg font-semibold">Do next</h4>
        <div className="mt-3 space-y-3">
          {(tasks.length ? tasks : ['Write a short summary in your own words.', 'Create a small example that proves you understood the resource.']).map((item) => (
            <label key={item} className="flex cursor-pointer gap-2 rounded-lg p-2 text-sm leading-6 text-muted-foreground hover:bg-white/[0.04]">
              <input type="checkbox" className="mt-1" />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function CourseOverview({
  course,
  resources,
  onOpenResource,
}: {
  course: GeneratedCourse;
  resources: CourseResource[];
  onOpenResource: (resource: CourseResource) => void;
}) {
  return (
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
            onOpenResource={onOpenResource}
          />
        ))}
      </TabsContent>
      <TabsContent value="projects" className="grid gap-4 md:grid-cols-2">
        {(course.projects ?? []).map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </TabsContent>
      <TabsContent value="resources" className="grid gap-4 md:grid-cols-2">
        {resources.map((resource) => (
          <ResourceButton key={resource.url} resource={resource} onOpen={() => onOpenResource(resource)} />
        ))}
      </TabsContent>
      <TabsContent value="interview" className="space-y-4">
        {(course.interviewPrep ?? []).map((item) => (
          <InterviewCard key={item.topic} item={item} />
        ))}
      </TabsContent>
    </Tabs>
  );
}

function PhaseModule({
  phase,
  index,
  onOpenResource,
}: {
  phase: CoursePhase;
  index: number;
  onOpenResource: (resource: CourseResource) => void;
}) {
  const resources = phaseResources(phase);

  return (
    <Card id={`module-${index}`} className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge variant="outline">Module {index + 1} · {phase.difficultyLevel}</Badge>
          <h3 className="mt-3 text-xl font-semibold">{phase.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{phase.description}</p>
        </div>
        <Badge variant="secondary">{phase.estimatedDuration}</Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <DetailList title="Objectives" items={phase.learningObjectives ?? []} />
        <DetailList title="Lesson notes" items={phase.lessonNotes ?? []} />
        <DetailList title="Recap" items={[phase.recap ?? 'Complete the resources, explain the ideas, and ship a small proof of work.']} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {resources.slice(0, 6).map((resource) => (
          <ResourceButton key={resource.url} resource={resource} onOpen={() => onOpenResource(resource)} />
        ))}
      </div>
    </Card>
  );
}

function ProjectCard({ project }: { project: CourseProject }) {
  return (
    <Card className="p-5">
      <Badge variant="outline">{project.level}</Badge>
      <h3 className="mt-3 text-lg font-semibold">{project.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
      <p className="mt-4 text-sm font-medium">Deliverables</p>
      <div className="mt-3 space-y-2">
        {project.deliverables?.map((deliverable) => (
          <p key={deliverable} className="flex gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
            {deliverable}
          </p>
        ))}
      </div>
    </Card>
  );
}

function InterviewCard({ item }: { item: InterviewPrep }) {
  return (
    <Card className="p-5">
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
          <p className="text-sm text-muted-foreground">No {title.toLowerCase()} generated.</p>
        )}
      </div>
    </div>
  );
}

function ResourceButton({ resource, onOpen }: { resource: CourseResource; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block rounded-lg border border-white/10 bg-white/[0.035] p-4 text-left text-sm transition hover:border-blue-400/30"
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="font-medium">{resource.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {resource.source}{resource.stars ? ` · ${resource.stars.toLocaleString()} stars` : ''}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </span>
      {resource.summary ? (
        <span className="mt-2 block text-xs leading-5 text-muted-foreground">{resource.summary}</span>
      ) : null}
    </button>
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

function ItemIcon({ item }: { item: CourseItem }) {
  if (item.type === 'summary') return <LayoutPanelLeft className="mt-0.5 size-4 shrink-0 text-blue-300" />;
  if (item.type === 'practice') return <Code2 className="mt-0.5 size-4 shrink-0 text-blue-300" />;
  if (item.type === 'quiz') return <Target className="mt-0.5 size-4 shrink-0 text-blue-300" />;
  if (item.resource.kind === 'youtube') return <Video className="mt-0.5 size-4 shrink-0 text-blue-300" />;
  if (item.resource.kind === 'github') return <Github className="mt-0.5 size-4 shrink-0 text-blue-300" />;
  return <FileText className="mt-0.5 size-4 shrink-0 text-blue-300" />;
}

function buildCourseItems(phase?: CoursePhase): CourseItem[] {
  if (!phase) return [];

  const resources = phaseResources(phase);
  const practice = [...(phase.exercises ?? []), ...(phase.miniProjects ?? [])];
  const quizLines = (phase.quizzes ?? []).map((quiz) => `${quiz.question} Answer: ${quiz.answer}`);

  return [
    {
      type: 'summary',
      title: phase.title,
      detail: phase.recap ?? phase.description,
      content: [
        phase.description,
        ...(phase.lessonNotes ?? []),
        ...(phase.learningObjectives ?? []).map((objective) => `Goal: ${objective}`),
      ],
    },
    ...resources.map((resource): CourseItem => ({
      type: 'resource',
      title: resource.title,
      detail: `${resource.source} · ${resource.freshnessRelevance}`,
      resource,
    })),
    {
      type: 'practice',
      title: 'Practice tasks',
      detail: `${practice.length} exercises and mini-projects`,
      content: practice.length ? practice : ['Build a small demo, document your steps, and compare it with the linked resources.'],
    },
    {
      type: 'quiz',
      title: 'Knowledge check',
      detail: `${quizLines.length} self-check questions`,
      content: quizLines.length ? quizLines : ['Explain the module in your own words and list one mistake you can now avoid.'],
    },
  ];
}

function phaseResources(phase: CoursePhase): CourseResource[] {
  return [
    ...(phase.officialDocs ?? []).map((item) => ({
      kind: 'officialDocs' as const,
      title: item.title,
      url: item.url,
      source: item.source,
      summary: item.summary,
      freshnessRelevance: 'Official source',
    })),
    ...(phase.youtubeVideos ?? []).map((item) => ({
      kind: 'youtube' as const,
      title: item.title,
      url: item.url,
      source: item.channelName ?? 'YouTube',
      summary: item.whyRecommended,
      freshnessRelevance: item.whyRecommended,
      duration: item.duration,
      channelName: item.channelName,
    })),
    ...(phase.githubRepos ?? []).map((item) => ({
      kind: 'github' as const,
      title: item.repositoryName,
      url: item.url,
      source: 'GitHub',
      summary: item.whyUseful,
      freshnessRelevance: item.projectRelevance,
      stars: item.stars,
    })),
    ...(phase.tutorials ?? []).map((item) => ({
      kind: 'article' as const,
      title: item.title,
      url: item.url,
      source: item.source,
      summary: item.summary,
      freshnessRelevance: item.freshnessRelevance,
    })),
  ];
}

function getEmbedUrl(url: string) {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  }

  return null;
}

function getYouTubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '');
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v') ?? parsed.pathname.match(/\/shorts\/([^/?]+)/)?.[1] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}
