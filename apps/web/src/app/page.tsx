import Link from 'next/link';
import { ArrowRight, Bot, Map, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-sm text-muted-foreground">
            <Bot className="size-4" />
            Dynamic AI gateway for learning roadmaps
          </div>
          <h1 className="text-5xl font-semibold tracking-normal text-foreground md:text-7xl">
            Roadlyn
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Generate learning paths, manage provider keys, stream AI progress, and keep
            model choice fully dynamic from the backend.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Open dashboard
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register">Create API client</Link>
            </Button>
          </div>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { icon: Bot, title: 'Provider agnostic', text: 'OpenAI, Anthropic, Ollama, custom endpoints, and future BYOK pools.' },
            { icon: Map, title: 'Roadmap workspace', text: 'Generate, track, and revisit learning plans from a focused dashboard.' },
            { icon: ShieldCheck, title: 'Secure by design', text: 'Bearer-token API flow and encrypted provider key management.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg border border-border bg-card/70 p-5">
                <Icon className="mb-4 size-5 text-muted-foreground" />
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
