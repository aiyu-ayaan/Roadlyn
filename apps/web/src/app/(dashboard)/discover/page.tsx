'use client';

import Link from 'next/link';
import { Compass, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function DiscoverPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Discover"
        description="Explore high-signal learning paths built from live docs, tutorials, repositories, videos, and community momentum."
      />

      <Card className="p-5 md:p-7">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/35 p-3">
          <Compass className="ml-2 size-5 text-blue-300" />
          <Input className="h-14 border-0 bg-transparent shadow-none focus-visible:ring-0" placeholder="Search skills, roles, frameworks, projects..." />
        </div>
      </Card>

      <Card className="flex min-h-[18rem] flex-col items-center justify-center p-8 text-center">
        <Search className="size-8 text-blue-300" />
        <h2 className="mt-4 text-2xl font-semibold">Discover is ready for live research</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Use the generator to create a course from current web results. Saved discovery collections will appear here after
          you create or save research-backed roadmaps.
        </p>
        <Button className="mt-5" asChild>
          <Link href="/roadmaps/generate">Generate a course</Link>
        </Button>
      </Card>
    </div>
  );
}
