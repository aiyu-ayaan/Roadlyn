'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ProviderForms } from '@/features/providers/provider-forms';
import { ProviderList } from '@/features/providers/provider-list';
import { useProviders } from '@/hooks/use-ai';

export default function ProviderSettingsPage() {
  const providers = useProviders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider settings"
        description="Register providers, add models, encrypt API keys, and test connections."
      />
      {providers.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : (
        <>
          <ProviderForms providers={providers.data ?? []} />
          <ProviderList providers={providers.data ?? []} />
        </>
      )}
    </div>
  );
}
