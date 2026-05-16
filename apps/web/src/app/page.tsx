import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-4xl text-center">
        <h1 className="mb-4 text-5xl font-bold text-foreground">Roadlyn</h1>
        <p className="mb-8 text-xl text-muted-foreground">
          AI-powered platform for intelligent roadmap generation
        </p>

        <div className="mb-12 rounded-lg bg-card p-8 shadow-lg">
          <p className="mb-4 text-base text-card-foreground">
            Welcome to the Roadlyn SaaS platform. This is the initial scaffolding setup.
          </p>
          <p className="text-sm text-muted-foreground">
            The architecture is ready for development. Navigate to the feature pages to get
            started.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Dashboard
          </Link>
          <Link
            href="/roadmaps"
            className="rounded-lg bg-secondary px-6 py-3 font-semibold text-secondary-foreground transition hover:opacity-90"
          >
            Roadmaps
          </Link>
          <Link
            href="/settings"
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
