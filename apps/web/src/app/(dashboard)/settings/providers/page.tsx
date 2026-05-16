'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ProviderForms } from '@/features/providers/provider-forms';
import { ProviderList } from '@/features/providers/provider-list';
import { useProviderKeys, useProviders } from '@/hooks/use-ai';
import { useAuthStore } from '@/stores/auth';

export default function ProviderSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const providers = useProviders();
  const keys = useProviderKeys();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider operations"
        description="Manage the providers, models, encrypted user keys, and connection tests exposed by the backend."
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
            keys={(keys.data ?? []).filter((key) => !user?.id || key.userId === user.id)}
          />
        </>
      )}
    </div>
  );
}
