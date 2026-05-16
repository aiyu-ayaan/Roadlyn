'use client';

import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function AppearanceSettingsPage() {
  const { setTheme } = useTheme();

  return (
    <div>
      <PageHeader title="Appearance" description="Control Roadlyn theme preferences." />
      <Card className="max-w-xl space-y-4 p-5">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => setTheme('dark')}>Dark</Button>
          <Button variant="outline" onClick={() => setTheme('light')}>Light</Button>
          <Button variant="outline" onClick={() => setTheme('system')}>System</Button>
        </div>
      </Card>
    </div>
  );
}
