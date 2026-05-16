'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Code2,
  Layers3,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviderKeys, useProviders } from '@/hooks/use-ai';
import { useRoadmaps } from '@/hooks/use-roadmaps';
import { useRealtime } from '@/hooks/use-realtime';
import { useRealtimeStore } from '@/stores/realtime';

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
              <Badge variant="outline" className="border-white/10">
                Uses live web search
              </Badge>
              <Badge variant="outline" className="border-white/10">
                Current docs, videos, repos, and articles
              </Badge>
              <Badge variant="outline" className="border-white/10">
                Powered by your default provider
              </Badge>
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
              <h3 className="text-lg font-semibold">Your generated courses</h3>
              <p className="text-sm text-muted-foreground">Create a roadmap to populate this workspace with your own modules and resources.</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/roadmaps/generate">Create</Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-muted-foreground">
            {roadmaps.isLoading
              ? 'Loading your roadmaps...'
              : roadmaps.data?.length
                ? `${roadmaps.data.length} roadmap${roadmaps.data.length === 1 ? '' : 's'} ready.`
                : 'No roadmaps yet. Generate your first live-researched course to get started.'}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold">AI setup</h3>
            <Badge variant={enabledProviders > 0 ? 'success' : 'outline'}>
              {enabledProviders > 0 ? 'Ready' : 'Needs provider'}
            </Badge>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-300" />
              <p className="text-muted-foreground">
                Roadlyn will use the platform default provider unless you choose a provider and model while generating.
              </p>
            </div>
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <Search className="mt-0.5 size-4 shrink-0 text-blue-300" />
              <p className="text-muted-foreground">
                Every course generation searches the live web before creating modules, projects, resources, and interview prep.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
