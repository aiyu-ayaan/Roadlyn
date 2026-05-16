'use client';

import Link from 'next/link';
import { Flame, LineChart, Plus, Target, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRoadmaps } from '@/hooks/use-roadmaps';

export default function ProgressPage() {
  const roadmaps = useRoadmaps();
  const roadmapCount = roadmaps.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        description="Track streaks, skill growth, project milestones, completed modules, and AI-recommended next topics."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Learning streak', value: '0 days', icon: Flame },
          { label: 'Completed modules', value: '0', icon: Trophy },
          { label: 'Active roadmaps', value: String(roadmapCount), icon: Target },
          { label: 'Skill velocity', value: '0%', icon: LineChart },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-5">
              <Icon className="size-5 text-blue-300" />
              <p className="mt-4 text-2xl font-semibold">{item.value}</p>
              <p className="text-sm text-muted-foreground">{item.label}</p>
            </Card>
          );
        })}
      </div>

      <Card className="flex min-h-[20rem] flex-col items-center justify-center p-8 text-center">
        <Target className="size-8 text-blue-300" />
        <h2 className="mt-4 text-2xl font-semibold">No learning activity yet</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Your milestones, module completion, and activity history will appear after you generate and start using your own
          roadmap.
        </p>
        <Button className="mt-5" asChild>
          <Link href="/roadmaps/generate">
            <Plus />
            Generate roadmap
          </Link>
        </Button>
      </Card>
    </div>
  );
}
