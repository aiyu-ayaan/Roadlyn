'use client';

import { AdminRoute } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/layout/page-header';
import { IntegrationsTab } from '@/features/providers/integrations-tab';

export default function AdminProviderIntegrationsPage() {
  return (
    <AdminRoute>
      <div className="space-y-6">
        <PageHeader
          title="Integrations"
          description="Configure AI provider integrations, default routing, models, and connection health."
        />
        <IntegrationsTab />
      </div>
    </AdminRoute>
  );
}
