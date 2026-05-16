import Link from 'next/link';
import { ArrowRight, Bot, Github, Play, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="grid-fade pointer-events-none absolute inset-0 opacity-50" />
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16">
        <nav className="absolute inset-x-6 top-6 flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-2xl">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="ai-glow flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500">
              <Bot className="size-5" />
            </span>
            Roadlyn
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Open app</Link>
            </Button>
          </div>
        </nav>

        <div className="max-w-4xl pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-100">
            <Sparkles className="size-4" />
            AI-powered learning roadmaps from live web intelligence
          </div>
          <h1 className="gradient-text text-5xl font-semibold tracking-normal md:text-7xl">
            Roadlyn
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Generate personalized learning paths using AI models, tutorials, GitHub repositories,
            videos, documentation, and live discovery signals.
          </p>
          <div className="ai-glow mt-8 flex max-w-3xl items-center gap-3 rounded-3xl border border-white/10 bg-black/45 p-3 backdrop-blur-xl">
            <Search className="ml-2 size-5 text-blue-200" />
            <span className="flex-1 text-muted-foreground">What do you want to learn today?</span>
            <Button asChild>
              <Link href="/dashboard">
                Generate
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Launch dashboard
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/workspace">
                <Play />
                Try workspace
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { icon: Bot, title: 'AI-native planning', text: 'Roadmaps that adapt to your time, level, goals, and provider stack.' },
            { icon: Github, title: 'Live resource graph', text: 'Docs, GitHub repos, tutorials, videos, and exercises in one learning map.' },
            { icon: Sparkles, title: 'Admin AI gateway', text: 'Platform-owned providers, encrypted keys, models, testing, and routing.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <Icon className="mb-4 size-5 text-blue-300" />
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
