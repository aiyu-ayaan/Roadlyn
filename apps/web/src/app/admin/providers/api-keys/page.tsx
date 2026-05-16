'use client';

import { AdminRoute } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ApiKeysTab } from '@/features/providers/api-keys-tab';

export default function AdminProviderKeysPage() {
  return (
    <AdminRoute>
      <div className="space-y-6">
        <PageHeader
          title="API Keys"
          description="Manage encrypted AI provider keys for platform integrations."
        />
        <ApiKeysTab />
      </div>
    </AdminRoute>
  );
}
