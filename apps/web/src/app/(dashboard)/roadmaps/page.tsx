'use client';

import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRoadmaps } from '@/hooks/use-roadmaps';

export default function RoadmapsPage() {
  const roadmaps = useRoadmaps();

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
              <h2 className="text-lg font-semibold">{roadmap.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Created {new Date(roadmap.createdAt).toLocaleDateString()}
              </p>
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
