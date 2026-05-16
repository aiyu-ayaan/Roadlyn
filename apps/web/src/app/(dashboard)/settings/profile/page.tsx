'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';

export default function ProfileSettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <PageHeader title="Profile" description="Manage account information and dashboard identity." />
      <Card className="max-w-xl space-y-4 p-5">
        <Input placeholder="Name" value={user?.name ?? ''} readOnly />
        <Input placeholder="Email" type="email" value={user?.email ?? ''} readOnly />
        <Input placeholder="User ID" value={user?.id ?? ''} readOnly />
      </Card>
    </div>
  );
}
