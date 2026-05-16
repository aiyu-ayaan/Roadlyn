'use client';

import { Activity, Brain, DatabaseZap, KeyRound, Zap } from 'lucide-react';
import { AdminRoute } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProviderForms } from '@/features/providers/provider-forms';
import { ProviderList } from '@/features/providers/provider-list';
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
  const defaultProvider = providers.data?.find((provider) => provider.isDefault);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Providers"
        description="Configure platform-owned providers, encrypted API keys, model catalogs, and default routing."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Enabled providers', value: enabledProviders, icon: Brain },
          { label: 'Configured models', value: modelCount, icon: DatabaseZap },
          { label: 'Active keys', value: activeKeys, icon: KeyRound },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <Icon className="size-4 text-blue-300" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Provider setup</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {defaultProvider
                ? `${defaultProvider.name} is the current platform default.`
                : 'Create a provider, add a model, then store the provider API key.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-blue-400/20 bg-blue-500/10 text-blue-200">
              <Zap className="mr-1 size-3" />
              Dynamic gateway
            </Badge>
            <Badge variant="success">
              <Activity className="mr-1 size-3" />
              Encrypted keys
            </Badge>
          </div>
        </div>

        {providers.isLoading || keys.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : (
          <div className="space-y-6">
            <ProviderForms providers={providers.data ?? []} />
            <ProviderList providers={providers.data ?? []} keys={keys.data ?? []} />
          </div>
        )}
      </Card>
    </div>
  );
}
