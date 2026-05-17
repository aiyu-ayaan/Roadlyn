'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Github,
  Layers,
  Zap,
  BrainCircuit,
  ChevronRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Can be caught by the dashboard if needed
      router.push(`/dashboard?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background selection:bg-blue-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      </div>
      <div className="grid-fade pointer-events-none absolute inset-0 opacity-40 z-0" />

      {/* Navigation */}
      <nav className="relative z-50 mx-auto mt-6 flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-white/5 px-6 py-3 backdrop-blur-md shadow-lg shadow-black/20">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
            <Bot className="size-5 text-white" />
          </span>
          <span className="text-lg">Roadlyn</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Button
            asChild
            className="rounded-full shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/40 border-0 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white"
          >
            <Link href="/demo">Demo</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
        <div className="group relative inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-200 backdrop-blur-md transition-all hover:bg-blue-500/20 hover:border-blue-400/50 cursor-pointer">
          <Sparkles className="size-4 text-blue-300" />
          <span className="font-medium">
            AI-powered learning roadmaps from live web intelligence
          </span>
          <ChevronRight className="size-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
        </div>

        <h1 className="mt-10 text-5xl font-extrabold tracking-tight md:text-7xl lg:text-[5.5rem] leading-[1.1]">
          Learn anything with <br className="hidden md:block" />
          <span className="gradient-text pb-2">hyper-personalized paths</span>
        </h1>

        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Roadlyn generates dynamic learning paths using live AI models, aggregating tutorials,
          GitHub repositories, videos, and documentation tailored precisely to your goals.
        </p>

        {/* Interactive Search Bar / CTA */}
        <form
          onSubmit={handleGenerate}
          className="ai-glow mt-12 flex w-full max-w-3xl items-center gap-3 rounded-full border border-white/10 bg-black/40 p-2.5 pl-6 backdrop-blur-2xl transition-all focus-within:border-blue-500/50 focus-within:bg-black/60 hover:border-white/20"
        >
          <Search className="size-5 text-blue-300" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to learn today?"
            className="w-full bg-transparent text-lg text-white placeholder-muted-foreground outline-none"
          />
          <Button
            type="submit"
            size="lg"
            className="rounded-full bg-white text-black hover:bg-white/90 font-semibold px-8 h-12 shadow-xl transition-transform active:scale-95"
          >
            Generate
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </form>

        {/* Sub-actions & Social Proof */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2.5 bg-white/5 rounded-full px-4 py-1.5 border border-white/5">
            <BrainCircuit className="size-4 text-violet-400" /> Auto-adapts to your level
          </div>
          <div className="flex items-center gap-2.5 bg-white/5 rounded-full px-4 py-1.5 border border-white/5">
            <Zap className="size-4 text-amber-400" /> Live resource discovery
          </div>
          <div className="flex items-center gap-2.5 bg-white/5 rounded-full px-4 py-1.5 border border-white/5">
            <Layers className="size-4 text-blue-400" /> Multi-model support
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 pb-32">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Bot,
              title: 'AI-native planning',
              text: 'Roadmaps that adapt to your time constraints, existing knowledge level, learning goals, and preferred provider stack.',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              border: 'group-hover:border-blue-500/50',
            },
            {
              icon: Github,
              title: 'Live resource graph',
              text: 'We index the latest docs, top GitHub repos, trending tutorials, and practical exercises into one cohesive learning map.',
              color: 'text-violet-400',
              bg: 'bg-violet-500/10',
              border: 'group-hover:border-violet-500/50',
            },
            {
              icon: Sparkles,
              title: 'Admin AI gateway',
              text: 'Bring your own keys. Route requests across platform-owned providers, manage models, and test outputs securely.',
              color: 'text-fuchsia-400',
              bg: 'bg-fuchsia-500/10',
              border: 'group-hover:border-fuchsia-500/50',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-blue-900/20 ${item.border}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg} ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:ring-white/20`}
                >
                  <Icon className={`size-6 ${item.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
