'use client';

import { Bot, Code2, FileText, Globe2, Loader2, Send, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviders } from '@/hooks/use-ai';

const messages = [
  {
    role: 'user',
    text: 'Create a learning plan for building production AI agents with TypeScript.',
  },
  {
    role: 'assistant',
    text: 'I would structure it in four passes: model APIs, retrieval, tool execution, then evals and deployment. Start with a small agent that reads docs and opens GitHub issues.',
  },
];

const citations = [
  { title: 'OpenAI Agents SDK docs', type: 'Docs', icon: FileText },
  { title: 'LangGraph agent examples', type: 'GitHub', icon: Code2 },
  { title: 'Vercel AI SDK guide', type: 'Guide', icon: Globe2 },
];

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

          <div className="flex-1 space-y-4 overflow-auto p-4 md:p-6">
            {messages.map((message) => (
              <div key={message.text} className={message.role === 'user' ? 'ml-auto max-w-2xl' : 'max-w-3xl'}>
                <div className={message.role === 'user'
                  ? 'rounded-3xl bg-blue-500/15 p-4 text-sm leading-6'
                  : 'rounded-3xl border border-white/10 bg-white/[0.055] p-4 text-sm leading-6'}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div className="max-w-3xl rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-100">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Thinking through roadmap dependencies, project sequence, and source quality...
              </div>
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
            <div className="mt-4 space-y-3">
              {citations.map((citation) => {
                const Icon = citation.icon;
                return (
                  <div key={citation.title} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <Icon className="size-4 text-blue-300" />
                    <p className="mt-2 text-sm font-medium">{citation.title}</p>
                    <p className="text-xs text-muted-foreground">{citation.type}</p>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">AI thinking</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p className="flex gap-2"><Sparkles className="size-4 text-violet-300" /> Extracting prerequisites</p>
              <p className="flex gap-2"><Sparkles className="size-4 text-violet-300" /> Ranking resources by freshness</p>
              <p className="flex gap-2"><Sparkles className="size-4 text-violet-300" /> Building project milestones</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
