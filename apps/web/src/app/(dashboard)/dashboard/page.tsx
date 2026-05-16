'use client';

import Link from 'next/link';
import { Activity, Bot, KeyRound, Map, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div>
      <PageHeader
        title="Dashboard"
        description="Monitor roadmap generation, provider health, and learning activity."
        action={
          <Button asChild>
            <Link href="/roadmaps/generate">
              <Sparkles />
              Generate roadmap
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Roadmaps', value: roadmaps.data?.length ?? 0, icon: Map },
          { label: 'Providers', value: providers.data?.length ?? 0, icon: Bot },
          { label: 'Models', value: modelCount, icon: Sparkles },
          { label: 'Keys', value: keys.data?.length ?? 0, icon: KeyRound },
          { label: 'Events', value: events.length, icon: Activity },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="app-surface">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Provider matrix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(providers.data ?? []).map((provider) => (
              <div key={provider.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {provider.models?.length ?? 0} models · {provider.providerType} · {enabledProviders} enabled
                  </p>
                </div>
                <Badge variant={provider.enabled ? 'success' : 'outline'}>
                  {provider.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Realtime events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No live events yet.</p>
            ) : (
              events.slice(0, 6).map((event, index) => (
                <div key={`${event.type}-${index}`} className="rounded-md bg-secondary/50 p-3 text-sm">
                  <p className="font-medium">{event.type}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {JSON.stringify(event.payload)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
