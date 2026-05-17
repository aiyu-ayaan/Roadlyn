import Link from 'next/link';
import { BookOpen, CheckCircle2, Github, Lock, PlayCircle, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-white/10 bg-black/30 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline" className="border-blue-400/20 bg-blue-500/10 text-blue-200">
              <Lock className="mr-1 size-3" />
              Demo mode, AI disabled
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Roadlyn demo academy</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Explore how public courses, generated roadmaps, resources, projects, quizzes, and
              learner shelves work before signing in. This demo uses static sample data and never
              calls an AI provider.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/login?next=/dashboard">
                <PlayCircle />
                Try demo login
              </Link>
            </Button>
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">My generated roadmap</h2>
              <Badge variant="success">Public</Badge>
            </div>
            <h3 className="mt-4 text-2xl font-semibold">Modern React Developer Masterclass</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A full-length course with guided lessons, code labs, interview prep, and a capstone
              portfolio path.
            </p>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>completed</span>
                <span>100%</span>
              </div>
              <Progress value={100} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-2xl font-semibold">6</p>
                <p className="text-xs text-muted-foreground">modules</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-2xl font-semibold">18</p>
                <p className="text-xs text-muted-foreground">projects</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-2xl font-semibold">42</p>
                <p className="text-xs text-muted-foreground">learners</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-xl font-semibold">Discovery shelf</h2>
            <div className="mt-4 space-y-3">
              {publicCourses.map((course) => (
                <div
                  key={course.title}
                  className="rounded-lg border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium">{course.title}</h3>
                    <Badge variant="outline">{course.learners} added</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">By {course.author}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Course player preview</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Udemy-style roadmap modules with resources and proof of work.
                </p>
              </div>
              <Badge variant="secondary">No AI calls</Badge>
            </div>
            <div className="mt-5 grid gap-3">
              {modules.map((module, index) => (
                <div
                  key={module.title}
                  className="rounded-lg border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-sm font-semibold text-blue-200">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{module.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{module.text}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {module.icons.map((Icon, iconIndex) => (
                          <span
                            key={iconIndex}
                            className="rounded-md border border-white/10 bg-black/30 p-2"
                          >
                            <Icon className="size-4 text-blue-300" />
                          </span>
                        ))}
                      </div>
                    </div>
                    <CheckCircle2 className="ml-auto size-5 shrink-0 text-emerald-300" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

const publicCourses = [
  {
    title: 'Azure Functions Engineering Roadmap',
    author: 'Priya Sharma',
    learners: 128,
  },
  { title: 'C# & .NET Job-Ready Path', author: 'Arjun Mehta', learners: 91 },
  { title: 'Frontend Systems Masterclass', author: 'Maya Patel', learners: 76 },
];

const modules = [
  {
    title: 'Foundations and mental models',
    text: 'Start with setup, vocabulary, core concepts, and short practice loops.',
    icons: [BookOpen, Search],
  },
  {
    title: 'Guided implementation labs',
    text: 'Follow curated videos, official docs, and repositories while building real features.',
    icons: [PlayCircle, Github],
  },
  {
    title: 'Portfolio capstone studio',
    text: 'Ship a polished project, document architecture, and prepare interview walkthroughs.',
    icons: [Users, CheckCircle2],
  },
];
