import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ProfileSettingsPage() {
  return (
    <div>
      <PageHeader title="Profile" description="Manage account information and dashboard identity." />
      <Card className="max-w-xl space-y-4 p-5">
        <Input placeholder="Name" />
        <Input placeholder="Email" type="email" />
      </Card>
    </div>
  );
}
