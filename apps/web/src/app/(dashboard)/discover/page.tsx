'use client';

import { BookOpen, Code2, Compass, Github, Star, Video } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

const paths = [
  { title: 'AI Engineering', signal: 96, sources: '824 sources', icon: Code2 },
  { title: 'System Design', signal: 89, sources: '502 sources', icon: BookOpen },
  { title: 'Cloud DevOps', signal: 84, sources: '438 sources', icon: Github },
  { title: 'Data Products', signal: 78, sources: '391 sources', icon: Video },
];

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

      <div className="grid gap-4 md:grid-cols-2">
        {paths.map((path) => {
          const Icon = path.icon;
          return (
            <Card key={path.title} className="p-5 transition hover:-translate-y-0.5 hover:border-blue-400/30">
              <div className="flex items-start justify-between">
                <div>
                  <Icon className="size-6 text-blue-300" />
                  <h2 className="mt-4 text-xl font-semibold">{path.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{path.sources} indexed by Roadlyn</p>
                </div>
                <Badge variant="outline" className="border-violet-400/20 bg-violet-500/10 text-violet-200">
                  <Star className="mr-1 size-3" />
                  Trending
                </Badge>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Signal score</span>
                  <span>{path.signal}</span>
                </div>
                <Progress value={path.signal} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
