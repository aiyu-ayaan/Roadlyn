'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Compass, Loader2, Plus, Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useEnrollRoadmap, usePublicRoadmaps } from '@/hooks/use-roadmaps';

export default function DiscoverPage() {
  const [query, setQuery] = useState('');
  const roadmaps = usePublicRoadmaps(query);
  const enrollRoadmap = useEnrollRoadmap();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discover"
        description="Explore public Udemy-style roadmap courses created by learners and add them to your own shelf."
      />

      <Card className="p-5 md:p-7">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/35 p-3">
          <Compass className="ml-2 size-5 text-blue-300" />
          <Input
            className="h-14 border-0 bg-transparent shadow-none focus-visible:ring-0"
            placeholder="Search skills, roles, frameworks, projects..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </Card>

      {roadmaps.isLoading ? (
        <Card className="flex min-h-[18rem] items-center justify-center p-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading public courses...
        </Card>
      ) : roadmaps.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roadmaps.data.map((roadmap) => (
            <Card
              key={roadmap.id}
              className="flex flex-col p-5 transition hover:border-blue-400/30"
            >
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="success">Public</Badge>
                {roadmap.isEnrolled ? <Badge variant="outline">Added</Badge> : null}
                {roadmap.source === 'generated' ? <Badge variant="secondary">Mine</Badge> : null}
              </div>
              <h2 className="line-clamp-2 text-lg font-semibold">{roadmap.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {roadmap.topic ?? 'Generated course'} ·{' '}
                {new Date(roadmap.createdAt).toLocaleDateString()}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="size-3" />
                By {roadmap.ownerName ?? roadmap.ownerEmail ?? 'Roadlyn learner'} ·{' '}
                {roadmap.enrollmentCount ?? 0} learners added this
              </p>
              <div className="mt-auto flex gap-2 pt-5">
                <Button size="sm" asChild>
                  <Link href={`/roadmaps/${roadmap.id}`}>Preview</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    enrollRoadmap.isPending || roadmap.isEnrolled || roadmap.source === 'generated'
                  }
                  onClick={() => enrollRoadmap.mutate(roadmap.id)}
                >
                  <Plus />
                  {roadmap.isEnrolled || roadmap.source === 'generated' ? 'Added' : 'Add'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex min-h-[18rem] flex-col items-center justify-center p-8 text-center">
          <Search className="size-8 text-blue-300" />
          <h2 className="mt-4 text-2xl font-semibold">No public roadmaps yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Generate a course and publish it publicly. Completed public courses will appear here for
            other learners to add.
          </p>
          <Button className="mt-5" asChild>
            <Link href="/roadmaps/generate">Generate a course</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
