'use client';

import Link from 'next/link';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDeleteRoadmap, useRoadmaps } from '@/hooks/use-roadmaps';

export default function RoadmapsPage() {
  const roadmaps = useRoadmaps();
  const deleteRoadmap = useDeleteRoadmap();

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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roadmaps.data.map((roadmap) => (
            <Card key={roadmap.id} className="p-5 transition hover:border-blue-400/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{roadmap.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {roadmap.topic ?? 'Generated course'} · {new Date(roadmap.createdAt).toLocaleDateString()}
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
                  disabled={deleteRoadmap.isPending}
                  onClick={async () => {
                    if (!window.confirm('Delete this generated roadmap?')) return;
                    await deleteRoadmap.mutateAsync(roadmap.id);
                  }}
                >
                  <Trash2 />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex min-h-[22rem] flex-col items-center justify-center p-8 text-center">
          <span className="ai-glow flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500">
            <Sparkles className="size-5" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold">No roadmaps yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Generate your first course from live web research. Roadlyn will collect current docs, tutorials, YouTube videos,
            GitHub repositories, articles, projects, quizzes, milestones, and interview prep.
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
