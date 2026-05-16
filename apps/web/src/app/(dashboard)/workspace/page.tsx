'use client';

import Link from 'next/link';
import { Bot, Send, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviders } from '@/hooks/use-ai';

export default function WorkspacePage() {
  const providers = useProviders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Workspace"
        description="A chat-native research and planning workspace with model controls, markdown, code, citations, and thinking states."
      />

      <div className="grid min-h-[calc(100vh-12rem)] gap-6 xl:grid-cols-[1fr_22rem]">
        <Card className="flex min-h-[40rem] flex-col overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="ai-glow flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500">
                <Bot className="size-5" />
              </span>
              <div>
                <p className="font-semibold">Roadlyn Copilot</p>
                <p className="text-xs text-muted-foreground">Streaming roadmap intelligence</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select defaultValue="auto">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto model</SelectItem>
                  <SelectItem value="reasoning">Reasoning model</SelectItem>
                  <SelectItem value="fast">Fast model</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue={providers.data?.[0]?.id ?? 'auto'}>
                <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Best provider</SelectItem>
                  {(providers.data ?? []).map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto p-4 md:p-6">
            <div className="max-w-xl text-center">
              <Sparkles className="mx-auto size-8 text-blue-300" />
              <h2 className="mt-4 text-2xl font-semibold">Workspace is empty</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start a new live-researched roadmap or ask a question here. Generated citations and planning context will
                appear after the first request.
              </p>
              <Button className="mt-5" asChild>
                <Link href="/roadmaps/generate">Generate a roadmap</Link>
              </Button>
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="ai-glow rounded-3xl border border-white/10 bg-black/35 p-3">
              <Textarea
                className="min-h-24 border-0 bg-transparent shadow-none focus-visible:ring-0"
                placeholder="Ask Roadlyn to research, compare resources, generate a roadmap, or explain a concept..."
              />
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="outline" className="border-white/10">Markdown · Code · Citations</Badge>
                <Button>
                  <Send />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold">Citations</h2>
            <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm leading-6 text-muted-foreground">
              No citations yet. Live research sources will appear here after a request.
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">AI thinking</h2>
            <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm leading-6 text-muted-foreground">
              Waiting for a prompt.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
