'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ProviderForms } from '@/features/providers/provider-forms';
import { ProviderList } from '@/features/providers/provider-list';
import { useProviderKeys, useProviders } from '@/hooks/use-ai';

export default function ProviderSettingsPage() {
  const providers = useProviders();
  const keys = useProviderKeys();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider operations"
        description="Admin configuration for platform AI providers, models, encrypted keys, defaults, and connection tests."
      />
      {providers.isLoading || keys.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : (
        <>
          <ProviderForms providers={providers.data ?? []} />
          <ProviderList
            providers={providers.data ?? []}
            keys={keys.data ?? []}
          />
        </>
      )}
    </div>
  );
}
