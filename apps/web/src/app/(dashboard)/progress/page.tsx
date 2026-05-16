'use client';

import { Award, CalendarDays, Flame, LineChart, Target, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const weeks = [48, 62, 58, 74, 81, 76, 88, 93];

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        description="Track streaks, skill growth, project milestones, completed modules, and AI-recommended next topics."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Learning streak', value: '12 days', icon: Flame },
          { label: 'Completed modules', value: '34', icon: Trophy },
          { label: 'Active goals', value: '5', icon: Target },
          { label: 'Skill velocity', value: '+18%', icon: LineChart },
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Weekly learning activity</h2>
            <Badge variant="success">On pace</Badge>
          </div>
          <div className="flex h-72 items-end gap-3">
            {weeks.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-2xl bg-gradient-to-t from-blue-500 to-violet-400 shadow-lg shadow-blue-500/20"
                  style={{ height: `${value}%` }}
                />
                <span className="text-xs text-muted-foreground">W{index + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Milestones</h2>
          <div className="mt-4 space-y-4">
            {[
              { title: 'RAG prototype shipped', progress: 100, icon: Award },
              { title: 'Agent eval suite', progress: 62, icon: CalendarDays },
              { title: 'Portfolio case study', progress: 24, icon: Target },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="size-5 text-violet-300" />
                    <p className="font-medium">{item.title}</p>
                  </div>
                  <Progress className="mt-3" value={item.progress} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
