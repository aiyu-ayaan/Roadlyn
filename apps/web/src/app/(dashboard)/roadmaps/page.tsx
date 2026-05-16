'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoadmaps } from '@/hooks/use-roadmaps';
import { formatDate } from '@/lib/utils';

export default function RoadmapsPage() {
  const roadmaps = useRoadmaps();

  return (
    <div>
      <PageHeader
        title="Roadmaps"
        description="Track learning plans and progress across generated roadmaps."
        action={
          <Button asChild>
            <Link href="/roadmaps/generate"><Plus /> New roadmap</Link>
          </Button>
        }
      />
      {roadmaps.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(roadmaps.data ?? []).map((roadmap) => (
            <Card key={roadmap.id} className="p-5">
              <h2 className="font-semibold">{roadmap.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Updated {formatDate(roadmap.updatedAt)}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${roadmap.progress ?? 0}%` }} />
              </div>
            </Card>
          ))}
          {(roadmaps.data ?? []).length === 0 ? (
            <Card className="p-5 text-sm text-muted-foreground">No roadmaps yet.</Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
