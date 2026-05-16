'use client';

import { Brain, DatabaseZap, KeyRound } from 'lucide-react';
import { AdminRoute } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeysTab } from '@/features/providers/api-keys-tab';
import { IntegrationsTab } from '@/features/providers/integrations-tab';
import { useProviderKeys, useProviders } from '@/hooks/use-ai';

export default function AdminProvidersPage() {
  return (
    <AdminRoute>
      <AdminProvidersContent />
    </AdminRoute>
  );
}

function AdminProvidersContent() {
  const providers = useProviders();
  const keys = useProviderKeys();
  const enabledProviders = providers.data?.filter((provider) => provider.enabled).length ?? 0;
  const activeKeys = keys.data?.filter((key) => key.isActive).length ?? 0;
  const modelCount = providers.data?.reduce((total, provider) => total + (provider.models?.length ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Providers"
        description="Manage API keys, configure AI integrations, and route models across the platform."
      />

      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Active keys', value: activeKeys, icon: KeyRound, gradient: 'from-emerald-500/20 to-teal-500/20' },
          { label: 'Integrations', value: enabledProviders, icon: Brain, gradient: 'from-blue-500/20 to-violet-500/20' },
          { label: 'Configured models', value: modelCount, icon: DatabaseZap, gradient: 'from-amber-500/20 to-orange-500/20' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="relative overflow-hidden p-5">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.gradient}`} />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <div className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient}`}>
                  <Icon className="size-4 text-white/80" />
                </div>
              </div>
              {providers.isLoading || keys.isLoading ? (
                <Skeleton className="mt-3 h-9 w-16" />
              ) : (
                <p className="mt-3 text-3xl font-semibold">{item.value}</p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">
            <KeyRound className="mr-1.5 size-3.5" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Brain className="mr-1.5 size-3.5" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <ApiKeysTab />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
