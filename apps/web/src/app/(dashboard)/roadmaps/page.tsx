'use client';

import Link from 'next/link';
import { Loader2, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  useDeleteRoadmap,
  useRoadmaps,
  useUnenrollRoadmap,
  useUpdateRoadmapVisibility,
} from '@/hooks/use-roadmaps';
import { RoadmapSummary } from '@/services/roadmap/roadmap-service';
import { Switch } from '@/components/ui/switch';

export default function RoadmapsPage() {
  const roadmaps = useRoadmaps();
  const deleteRoadmap = useDeleteRoadmap();
  const unenrollRoadmap = useUnenrollRoadmap();
  const updateVisibility = useUpdateRoadmapVisibility();
  const generatedRoadmaps = (roadmaps.data ?? []).filter(
    (roadmap) => roadmap.source !== 'enrolled'
  );
  const savedPublicRoadmaps = (roadmaps.data ?? []).filter(
    (roadmap) => roadmap.source === 'enrolled'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roadmaps"
        description="Interactive learning timelines with projects, quizzes, docs, GitHub repositories, videos, and progress tracking."
        action={
          <Button asChild>
            <Link href="/roadmaps/generate">
              <Plus />
              New roadmap
            </Link>
          </Button>
        }
      />

      {roadmaps.isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading your roadmaps...</Card>
      ) : roadmaps.data?.length ? (
        <div className="space-y-8">
          <RoadmapGroup
            title="My generated roadmaps"
            description="Courses you created. Public courses can be added by other learners from Discovery."
            roadmaps={generatedRoadmaps}
            empty="You have not generated a roadmap yet."
            onDelete={(id) => deleteRoadmap.mutateAsync(id)}
            isMutating={deleteRoadmap.isPending}
            onVisibilityChange={(id, visibility) =>
              updateVisibility.mutateAsync({ id, visibility })
            }
            visibilityMutatingId={
              updateVisibility.isPending ? updateVisibility.variables?.id : undefined
            }
          />
          <RoadmapGroup
            title="Public roadmaps I added"
            description="Public courses from Discovery saved to your learning shelf."
            roadmaps={savedPublicRoadmaps}
            empty="Add public courses from Discovery to see them here."
            onDelete={(id) => unenrollRoadmap.mutateAsync(id)}
            isMutating={unenrollRoadmap.isPending}
            deleteLabel="Remove"
          />
        </div>
      ) : (
        <Card className="flex min-h-[22rem] flex-col items-center justify-center p-8 text-center">
          <span className="ai-glow flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500">
            <Sparkles className="size-5" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold">No roadmaps yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Generate your first course from live web research. Roadlyn will collect current docs,
            tutorials, YouTube videos, GitHub repositories, articles, projects, quizzes, milestones,
            and interview prep.
          </p>
          <Button className="mt-5" asChild>
            <Link href="/roadmaps/generate">
              <Plus />
              Generate roadmap
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}

function RoadmapGroup({
  title,
  description,
  roadmaps,
  empty,
  onDelete,
  isMutating,
  onVisibilityChange,
  visibilityMutatingId,
  deleteLabel = 'Delete',
}: {
  title: string;
  description: string;
  roadmaps: RoadmapSummary[];
  empty: string;
  onDelete: (id: string) => Promise<unknown>;
  isMutating: boolean;
  onVisibilityChange?: (id: string, visibility: 'PRIVATE' | 'PUBLIC') => Promise<unknown>;
  visibilityMutatingId?: string;
  deleteLabel?: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {roadmaps.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roadmaps.map((roadmap) => (
            <Card
              key={`${roadmap.source}-${roadmap.id}`}
              className="p-5 transition hover:border-blue-400/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {roadmap.source !== 'enrolled' && onVisibilityChange ? (
                      <RoadmapVisibilityToggle
                        roadmap={roadmap}
                        disabled={Boolean(visibilityMutatingId && visibilityMutatingId !== roadmap.id)}
                        isSaving={visibilityMutatingId === roadmap.id}
                        onChange={onVisibilityChange}
                      />
                    ) : (
                      <Badge variant={roadmap.visibility === 'PUBLIC' ? 'success' : 'secondary'}>
                        {roadmap.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                      </Badge>
                    )}
                    {roadmap.source === 'enrolled' ? <Badge variant="outline">Saved</Badge> : null}
                  </div>
                  <h3 className="line-clamp-2 text-lg font-semibold">{roadmap.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {roadmap.topic ?? 'Generated course'} ·{' '}
                    {new Date(roadmap.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    {roadmap.enrollmentCount ?? 0} learners added this
                    {roadmap.ownerName || roadmap.ownerEmail
                      ? ` · by ${roadmap.ownerName ?? roadmap.ownerEmail}`
                      : ''}
                  </p>
                </div>
                {roadmap.status === 'QUEUED' || roadmap.status === 'RUNNING' ? (
                  <Loader2 className="size-4 animate-spin text-blue-300" />
                ) : null}
              </div>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{roadmap.status.toLowerCase()}</span>
                  <span>{roadmap.progress}%</span>
                </div>
                <Progress value={roadmap.progress} />
              </div>
              <div className="mt-5 flex gap-2">
                <Button size="sm" asChild>
                  <Link href={`/roadmaps/${roadmap.id}`}>Open</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isMutating}
                  onClick={async () => {
                    if (!window.confirm(`${deleteLabel} this roadmap?`)) return;
                    await onDelete(roadmap.id);
                  }}
                >
                  <Trash2 />
                  {deleteLabel}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-5 text-sm text-muted-foreground">{empty}</Card>
      )}
    </section>
  );
}

function RoadmapVisibilityToggle({
  roadmap,
  disabled,
  isSaving,
  onChange,
}: {
  roadmap: RoadmapSummary;
  disabled?: boolean;
  isSaving?: boolean;
  onChange: (id: string, visibility: 'PRIVATE' | 'PUBLIC') => Promise<unknown>;
}) {
  const isPublic = roadmap.visibility === 'PUBLIC';
  const canPublish = roadmap.status === 'COMPLETED';

  return (
    <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs">
      <Switch
        checked={isPublic}
        disabled={disabled || isSaving || !canPublish}
        onCheckedChange={(checked) =>
          void onChange(roadmap.id, checked ? 'PUBLIC' : 'PRIVATE')
        }
      />
      <span className="font-medium text-foreground">
        {isSaving ? 'Saving…' : isPublic ? 'Public' : 'Private'}
      </span>
      {!canPublish ? (
        <span className="text-muted-foreground">(when complete)</span>
      ) : null}
    </label>
  );
}
