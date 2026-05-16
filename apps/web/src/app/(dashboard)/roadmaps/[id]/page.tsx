'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Code2,
  ExternalLink,
  FileText,
  Github,
  GraduationCap,
  LayoutPanelLeft,
  Loader2,
  PlayCircle,
  Sparkles,
  Target,
  Trash2,
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
  const showCourse = !isWorking && course;

  if (showCourse) {
    return (
      <CourseScreen
        course={course}
        resources={data.researchedResources ?? course.resources ?? []}
        notice={data.errorMessage}
        roadmapId={data.id}
        onDelete={async () => {
          if (!window.confirm('Delete this generated roadmap? This cannot be undone.')) return;
          await deleteRoadmap.mutateAsync(data.id);
          router.push('/roadmaps');
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 lg:px-6 lg:pb-8 space-y-6">
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
      ) : (
        <GenerationStatus
          title={data.topic ?? data.title}
          status={data.status}
          progress={data.progress}
          resources={data.researchedResources ?? []}
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
  onDelete,
}: {
  course: GeneratedCourse;
  resources: CourseResource[];
  notice?: string | null;
  roadmapId: string;
  onDelete?: () => void;
}) {
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0]));
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

  const saveCompleted = (next: string[]) => {
    setCompleted(next);
    window.localStorage.setItem(`roadlyn-course-progress:${roadmapId}`, JSON.stringify(next));
  };
  const markPhaseComplete = () => {
    if (completedSet.has(completionKey)) return;
    saveCompleted([...completed, completionKey]);
  };
  const openResource = (resource: CourseResource) => {
    const phaseIndex = course.phases?.findIndex((p) =>
      phaseResources(p).some((r) => normalizeResourceUrl(r.url) === normalizeResourceUrl(resource.url))
    ) ?? -1;
    if (phaseIndex >= 0) {
      const targetItems = buildCourseItems(course.phases?.[phaseIndex]);
      const itemIndex = targetItems.findIndex((item) =>
        item.type === 'resource' && normalizeResourceUrl(item.resource.url) === normalizeResourceUrl(resource.url)
      );
      setActivePhaseIndex(phaseIndex);
      setActiveItemIndex(Math.max(0, itemIndex));
      setExpandedPhases(new Set([...expandedPhases, phaseIndex]));
    }
  };

  const togglePhase = (index: number) => {
    const next = new Set(expandedPhases);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedPhases(next);
  };

  return (
    <div className="relative flex flex-col h-[100dvh]">
      <div className="flex h-14 items-center justify-between border-b border-white/10 bg-black/60 px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/roadmaps">← Exit course</Link>
          </Button>
          <span className="font-semibold text-sm">{course.title}</span>
        </div>
        {onDelete ? (
          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={onDelete}>
            <Trash2 className="size-4 mr-2" /> Delete
          </Button>
        ) : null}
      </div>

      <main className="flex-1 flex flex-col min-h-0">
        {notice ? (
          <div className="border-b border-amber-400/20 bg-amber-500/10 p-3 text-sm text-center text-amber-100 shrink-0">
            {notice}
          </div>
        ) : null}

        <section className="flex-1 flex flex-col bg-card overflow-hidden">
          <div className="flex-1 grid lg:grid-cols-[minmax(0,1fr)_26rem] min-h-0">
            <div className="flex h-full flex-col bg-black/40 min-h-0">
              <div className="flex items-center justify-between border-b border-white/10 bg-black/60 p-4 shrink-0">
                <div>
                  <p className="text-sm font-medium text-blue-300">{activePhase?.title ?? course.title}</p>
                  <h2 className="mt-1 text-xl font-semibold">{activeItem?.title}</h2>
                </div>
                <Button 
                  variant={completedSet.has(completionKey) ? 'secondary' : 'default'} 
                  onClick={markPhaseComplete}
                >
                  <CheckCircle2 className="mr-2 size-4" />
                  {completedSet.has(completionKey) ? 'Completed' : 'Mark complete'}
                </Button>
              </div>
              <div 
                className="flex-1 overflow-y-auto min-h-0"
                onScroll={(event) => {
                  const target = event.currentTarget;
                  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 24) {
                    markPhaseComplete();
                  }
                }}
              >
                <CoursePlayer
                  course={course}
                  phase={activePhase}
                  item={activeItem}
                />
                <div className="p-6 border-t border-white/10 bg-card shrink-0">
                  <CourseOverview course={course} resources={resources} onOpenResource={openResource} />
                </div>
              </div>
            </div>

            <div className="flex h-full flex-col border-t border-white/10 bg-black/20 lg:border-l lg:border-t-0 min-h-0">
              <div className="border-b border-white/10 p-4 shrink-0">
                <h3 className="font-semibold text-lg">Course Curriculum</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{courseProgress}% complete</span>
                  <span>{course.estimatedDuration}</span>
                </div>
                <Progress className="mt-2 h-1.5" value={courseProgress} />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {(course.phases ?? []).map((phase, index) => {
                  const isExpanded = expandedPhases.has(index);
                  const isActivePhase = activePhaseIndex === index;
                  const isComplete = completedSet.has(`${roadmapId}:${index}`);
                  const phaseItems = buildCourseItems(phase);
                  
                  return (
                    <div key={`${phase.title}-${index}`} className="border-b border-white/5 last:border-0">
                      <button
                        type="button"
                        onClick={() => togglePhase(index)}
                        className={`flex w-full items-center justify-between p-4 text-left transition hover:bg-white/[0.04] ${isActivePhase ? 'bg-white/[0.02]' : ''}`}
                      >
                        <div className="flex gap-3">
                          <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isComplete ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10'}`}>
                            {isComplete ? <CheckCircle2 className="size-3" /> : index + 1}
                          </span>
                          <div>
                            <span className="block text-sm font-medium">{phase.title}</span>
                            <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{phaseItems.length} lessons</span>
                              <span>•</span>
                              <span>{phase.estimatedDuration}</span>
                            </span>
                          </div>
                        </div>
                        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isExpanded && (
                        <div className="bg-black/20 pb-2 pt-1">
                          {phaseItems.map((item, itemIdx) => {
                            const isActiveItem = isActivePhase && activeItemIndex === itemIdx;
                            return (
                              <button
                                key={`${item.type}-${itemIdx}`}
                                type="button"
                                onClick={() => {
                                  setActivePhaseIndex(index);
                                  setActiveItemIndex(itemIdx);
                                }}
                                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-white/[0.04] ${isActiveItem ? 'bg-blue-500/10 text-blue-200' : 'text-muted-foreground hover:text-foreground'}`}
                              >
                                <ItemIcon item={item} />
                                <span className="leading-5">{item.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function CoursePlayer({
  course,
  phase,
  item,
}: {
  course: GeneratedCourse;
  phase?: CoursePhase;
  item?: CourseItem;
}) {
  const embedUrl = item?.type === 'resource' ? getEmbedUrl(item.resource.url) : null;
  const isVideo = item?.type === 'resource' && item.resource.kind === 'youtube';

  return (
    <div className="flex flex-col">
      {item?.type === 'resource' ? (
        <div className="flex flex-col">
          {embedUrl ? (
            <div className="relative w-full border-b border-white/10 bg-black">
              <div className="absolute right-4 top-4 z-10 flex gap-2">
                <OpenUrlButton url={item.resource.url} label="Open in new tab" size="sm" />
              </div>
              <iframe
                title={item.resource.title}
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className={`w-full ${isVideo ? 'aspect-video' : 'h-[80vh] min-h-[600px] bg-white'}`}
              />
            </div>
          ) : (
            <ResourcePreview resource={item.resource} phase={phase} />
          )}
          <div className="p-6">
            <ResourceStudyNotes resource={item.resource} phase={phase} />
          </div>
        </div>
      ) : (
        <article className="p-8">
          <div className="mx-auto max-w-4xl">
            <Badge variant="outline">{phase?.difficultyLevel ?? course.skillLevel}</Badge>
            <h1 className="mt-4 text-4xl font-bold">{item?.title ?? phase?.title ?? course.title}</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">{phase?.description ?? course.overview}</p>
            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6 shadow-inner">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-300">
                <Sparkles className="size-5" />
                Course summary
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                {course.courseSummary ?? course.overview}
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Metric icon={GraduationCap} label="Outcomes" value={String(course.skillOutcomes?.length ?? 0)} />
              <Metric icon={BookOpen} label="Modules" value={String(course.phases?.length ?? 0)} />
              <Metric icon={Target} label="Milestones" value={String(course.milestones?.length ?? 0)} />
            </div>
            <div className="mt-8 space-y-4">
              {(item?.content ?? phase?.lessonNotes ?? phase?.learningObjectives ?? []).map((line) => (
                <div key={line} className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
                  <CheckCircle2 className="mt-1 size-5 shrink-0 text-blue-400/50" />
                  <p className="text-base leading-7 text-muted-foreground">{line}</p>
                </div>
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
            <OpenUrlButton url={resource.url} label="Open original" variant="outline" />
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

function OpenUrlButton({
  url,
  label,
  variant = 'secondary',
  size = 'md',
}: {
  url: string;
  label: string;
  variant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}) {
  const openUrl = () => {
    const normalized = normalizeExternalUrl(url);
    if (!normalized) return;
    window.open(normalized, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={size === 'sm' ? 'border-white/10 bg-black/50 text-xs backdrop-blur-md hover:bg-black/80' : undefined}
      onClick={openUrl}
    >
      {label}
      <ArrowUpRight className={size === 'sm' ? 'ml-1 size-3' : undefined} />
    </Button>
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
  if (item.type === 'summary') return <LayoutPanelLeft className="mt-0.5 size-4 shrink-0" />;
  if (item.type === 'practice') return <Code2 className="mt-0.5 size-4 shrink-0" />;
  if (item.type === 'quiz') return <Target className="mt-0.5 size-4 shrink-0" />;
  if (item.resource.kind === 'youtube') return <PlayCircle className="mt-0.5 size-4 shrink-0" />;
  if (item.resource.kind === 'github') return <Github className="mt-0.5 size-4 shrink-0" />;
  return <FileText className="mt-0.5 size-4 shrink-0" />;
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
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
  }

  return null;
}

function getYouTubeVideoId(url: string) {
  try {
    const parsed = new URL(normalizeExternalUrl(url) ?? url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be') {
      return pathParts[0] ?? null;
    }

    if (host.endsWith('youtube.com')) {
      return (
        parsed.searchParams.get('v') ??
        readYouTubePathId(pathParts, 'embed') ??
        readYouTubePathId(pathParts, 'shorts') ??
        readYouTubePathId(pathParts, 'live') ??
        readYouTubePathId(pathParts, 'v')
      );
    }
  } catch {
    return null;
  }

  return null;
}

function readYouTubePathId(pathParts: string[], segment: string) {
  const index = pathParts.indexOf(segment);
  return index >= 0 ? pathParts[index + 1] ?? null : null;
}

function normalizeExternalUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;

  return `https://${trimmed}`;
}

function normalizeResourceUrl(url: string) {
  try {
    const parsed = new URL(normalizeExternalUrl(url) ?? url);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.trim();
  }
}
