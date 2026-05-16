'use client';

import { Brain, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeysTab } from '@/features/providers/api-keys-tab';
import { IntegrationsTab } from '@/features/providers/integrations-tab';

export default function ProviderSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider operations"
        description="Admin configuration for platform AI providers, models, encrypted keys, defaults, and connection tests."
      />
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
