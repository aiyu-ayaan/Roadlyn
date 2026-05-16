import Link from 'next/link';
import { settingsNavItems } from '@/components/layout/nav-items';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Configure account, AI preferences, providers, and appearance." />
      <div className="grid gap-4 md:grid-cols-2">
        {settingsNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <Card className="p-5 transition hover:bg-secondary/40">
                <Icon className="mb-4 size-5 text-muted-foreground" />
                <h2 className="font-semibold">{item.label}</h2>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
