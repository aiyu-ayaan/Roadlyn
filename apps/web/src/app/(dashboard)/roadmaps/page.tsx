'use client';

import Link from 'next/link';
import { BookOpen, CheckCircle2, Code2, FileText, Github, HelpCircle, Plus, Video } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const phases = [
  {
    title: 'Phase 01',
    name: 'Foundations',
    progress: 100,
    time: '2 weeks',
    items: ['Python refresh', 'Transformer basics', 'Prompt patterns'],
  },
  {
    title: 'Phase 02',
    name: 'Applied AI Systems',
    progress: 68,
    time: '4 weeks',
    items: ['RAG architecture', 'Tool calling', 'Evaluation harness'],
  },
  {
    title: 'Phase 03',
    name: 'Production Projects',
    progress: 32,
    time: '5 weeks',
    items: ['Agent workflows', 'Observability', 'Deployment'],
  },
  {
    title: 'Phase 04',
    name: 'Portfolio Launch',
    progress: 8,
    time: '1 week',
    items: ['GitHub polish', 'Demo video', 'Case study'],
  },
];

const resources = [
  { label: 'Tutorials', value: '24', icon: BookOpen },
  { label: 'Docs', value: '16', icon: FileText },
  { label: 'Repos', value: '9', icon: Github },
  { label: 'Videos', value: '31', icon: Video },
  { label: 'Exercises', value: '42', icon: Code2 },
  { label: 'Quizzes', value: '12', icon: HelpCircle },
];

export default function RoadmapsPage() {
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

      <Card className="overflow-hidden p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge variant="outline" className="border-blue-400/20 bg-blue-500/10 text-blue-200">
              AI Engineering Roadmap
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold">From model APIs to production AI systems</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A generated roadmap stitched from current docs, high-signal repositories, tutorials, and hands-on projects.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:w-64">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall progress</span>
              <span>52%</span>
            </div>
            <Progress className="mt-3" value={52} />
          </div>
        </div>

        <div className="relative mt-8 space-y-5">
          <div className="absolute left-5 top-6 hidden h-[calc(100%-3rem)] w-px bg-gradient-to-b from-blue-400 via-violet-400 to-transparent md:block" />
          {phases.map((phase, index) => (
            <div key={phase.name} className="relative grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-4 md:grid-cols-[13rem_1fr] md:p-5">
              <div className="flex gap-4">
                <span className="ai-glow z-10 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">{phase.title}</p>
                  <h3 className="mt-1 font-semibold">{phase.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{phase.time}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Module progress</span>
                  <span>{phase.progress}%</span>
                </div>
                <Progress className="mt-2" value={phase.progress} />
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {phase.items.map((item) => (
                    <button
                      key={item}
                      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm transition hover:border-blue-400/30"
                    >
                      <CheckCircle2 className="size-4 text-blue-300" />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <Card key={resource.label} className="p-4">
              <Icon className="size-5 text-blue-300" />
              <p className="mt-3 text-2xl font-semibold">{resource.value}</p>
              <p className="text-xs text-muted-foreground">{resource.label}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
