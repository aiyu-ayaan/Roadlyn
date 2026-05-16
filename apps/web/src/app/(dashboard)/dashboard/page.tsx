'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Code2,
  Flame,
  Github,
  Globe2,
  GraduationCap,
  Layers3,
  Play,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Video,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviderKeys, useProviders } from '@/hooks/use-ai';
import { useRoadmaps } from '@/hooks/use-roadmaps';
import { useRealtime } from '@/hooks/use-realtime';
import { useRealtimeStore } from '@/stores/realtime';

const prompts = [
  'Become an AI engineer in 12 weeks',
  'Learn DevOps with real projects',
  'Master system design for interviews',
  'Build a cybersecurity lab',
];

const trendingPaths = [
  { title: 'AI Engineering', duration: '12 weeks', level: 'Advanced', learners: '18.4k', progress: 72 },
  { title: 'Full Stack Development', duration: '16 weeks', level: 'Intermediate', learners: '42.1k', progress: 64 },
  { title: 'DevOps', duration: '10 weeks', level: 'Intermediate', learners: '15.8k', progress: 58 },
  { title: 'Cybersecurity', duration: '14 weeks', level: 'Beginner', learners: '23.6k', progress: 49 },
  { title: 'Data Science', duration: '18 weeks', level: 'Intermediate', learners: '31.2k', progress: 69 },
];

const recentRoadmaps = [
  { title: 'Production AI Agents', progress: 68, next: 'Tool calling patterns' },
  { title: 'Cloud Native DevOps', progress: 42, next: 'Kubernetes operators' },
  { title: 'Modern React Systems', progress: 81, next: 'Server component caching' },
];

export default function DashboardPage() {
  useRealtime();
  const providers = useProviders();
  const keys = useProviderKeys();
  const roadmaps = useRoadmaps();
  const events = useRealtimeStore((state) => state.events);
  const enabledProviders = providers.data?.filter((provider) => provider.enabled).length ?? 0;
  const modelCount = providers.data?.reduce((total, provider) => total + (provider.models?.length ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roadlyn"
        description="An AI-native learning cockpit that turns live web data, repositories, videos, docs, and models into personalized roadmaps."
        action={
          <Button asChild>
            <Link href="/roadmaps/generate">
              <Sparkles />
              Generate roadmap
            </Link>
          </Button>
        }
      />

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.24),transparent_34rem),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.22),transparent_28rem)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div>
            <Badge className="border-blue-400/20 bg-blue-500/10 text-blue-200" variant="outline">
              <Zap className="mr-1 size-3" />
              Live AI roadmap engine
            </Badge>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal text-white md:text-6xl">
              What do you want to learn today?
            </h2>
            <div className="ai-glow mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-xl">
              <Search className="ml-2 size-5 text-blue-200" />
              <Input
                className="h-14 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                placeholder="What do you want to learn today?"
              />
              <Button size="lg">
                <Sparkles />
                Ask AI
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-muted-foreground transition hover:border-blue-400/30 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Roadmap Generator</p>
                <h3 className="mt-1 text-xl font-semibold">Personalize the next path</h3>
              </div>
              <Brain className="size-6 text-blue-300" />
            </div>
            <div className="mt-5 space-y-3">
              <Input placeholder="Topic, role, or skill" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select defaultValue="intermediate">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="8">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 hrs / week</SelectItem>
                    <SelectItem value="8">8 hrs / week</SelectItem>
                    <SelectItem value="12">12 hrs / week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Select defaultValue={providers.data?.[0]?.id ?? 'auto'}>
                <SelectTrigger><SelectValue placeholder="AI provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto select best model</SelectItem>
                  {(providers.data ?? []).map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full" asChild>
                <Link href="/roadmaps/generate">
                  Generate roadmap
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Roadmaps', value: roadmaps.data?.length ?? 0, icon: Layers3 },
          { label: 'Providers', value: enabledProviders, icon: Brain },
          { label: 'Models', value: modelCount, icon: Sparkles },
          { label: 'Keys', value: keys.data?.length ?? 0, icon: Code2 },
          { label: 'Live events', value: events.length, icon: TrendingUp },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-5 transition hover:-translate-y-0.5 hover:border-blue-400/30">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <Icon className="size-4 text-blue-300" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
            </Card>
          );
        })}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Trending learning paths</h3>
              <p className="text-sm text-muted-foreground">Curated from tutorials, docs, repos, videos, and learner activity.</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/discover">Explore</Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {trendingPaths.map((path) => (
              <div key={path.title} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-blue-400/30 hover:bg-white/[0.06]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">{path.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{path.duration} · {path.level} · {path.learners} learners</p>
                  </div>
                  <GraduationCap className="size-5 text-violet-300" />
                </div>
                <Progress className="mt-4" value={path.progress} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold">AI insights</h3>
            <Badge variant="success">Adaptive</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Streak', value: '12d', icon: Flame },
              { label: 'Modules', value: '34', icon: BookOpen },
              { label: 'Focus', value: 'AI', icon: Target },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-2xl bg-white/[0.055] p-3">
                  <Icon className="size-4 text-blue-300" />
                  <p className="mt-3 text-xl font-semibold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {[
              'Add vector databases before agent orchestration.',
              'Your GitHub repo picks suggest building a retrieval app next.',
              'Watch one deployment video before the next project milestone.',
            ].map((insight) => (
              <div key={insight} className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-300" />
                <p className="text-muted-foreground">{insight}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="p-5">
          <h3 className="text-lg font-semibold">Continue learning</h3>
          <div className="mt-4 space-y-3">
            {recentRoadmaps.map((roadmap) => (
              <div key={roadmap.title} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium">{roadmap.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Next: {roadmap.next}</p>
                  <Progress className="mt-3" value={roadmap.progress} />
                </div>
                <Button variant="outline">
                  <Play />
                  Resume
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold">Resource intelligence</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Docs indexed', value: '2,418', icon: Globe2 },
              { label: 'GitHub repos', value: '846', icon: Github },
              { label: 'Videos mapped', value: '1,204', icon: Video },
              { label: 'Exercises', value: '392', icon: Code2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Icon className="size-5 text-blue-300" />
                  <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <aside className="fixed bottom-24 right-5 z-40 hidden w-80 rounded-3xl border border-white/10 bg-black/65 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl 2xl:block">
        <div className="flex items-center gap-3">
          <span className="ai-glow flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="font-medium">Roadlyn Copilot</p>
            <p className="text-xs text-muted-foreground">Thinking with your graph</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          I found a stronger sequence for AI Engineering: TypeScript agents, evals, then deployment.
        </p>
        <Button className="mt-4 w-full" variant="outline" asChild>
          <Link href="/workspace">Open workspace</Link>
        </Button>
      </aside>
    </div>
  );
}
