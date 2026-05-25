'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  Check,
  GraduationCap,
  Layers3,
  Loader2,
  Lock,
  PlayCircle,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/stores/auth';
import {
  useDeleteRoadmap,
  useRoadmaps,
  useUnenrollRoadmap,
  useUpdateRoadmapVisibility,
} from '@/hooks/use-roadmaps';
import { useRealtime } from '@/hooks/use-realtime';

export default function DashboardPage() {
  useRealtime();
  const user = useAuthStore((state) => state.user);
  const roadmaps = useRoadmaps();
  
  const deleteRoadmap = useDeleteRoadmap();
  const unenrollRoadmap = useUnenrollRoadmap();
  const updateVisibility = useUpdateRoadmapVisibility();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = (id: string, slug?: string | null) => {
    const slugSuffix = slug ? `/${slug}` : '';
    const shareUrl = `${window.location.origin}/roadmaps/${id}${slugSuffix}`;
    void navigator.clipboard.writeText(shareUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Statistics calculations
  const totalRoadmaps = roadmaps.data?.length ?? 0;
  const completedRoadmaps = roadmaps.data?.filter((r) => r.progress === 100).length ?? 0;
  const inProgressRoadmaps = roadmaps.data?.filter((r) => r.progress > 0 && r.progress < 100).length ?? 0;
  
  const generatedRoadmaps = (roadmaps.data ?? []).filter(
    (roadmap) => roadmap.source !== 'enrolled'
  );
  const savedPublicRoadmaps = (roadmaps.data ?? []).filter(
    (roadmap) => roadmap.source === 'enrolled'
  );

  const generatedCount = generatedRoadmaps.length;
  const savedPublicCount = savedPublicRoadmaps.length;

  // Gradient selection for course card cover previews
  const cardGradients = [
    'from-blue-600/30 to-violet-600/30 border-blue-500/20',
    'from-purple-600/30 to-pink-600/30 border-purple-500/20',
    'from-emerald-600/30 to-teal-600/30 border-emerald-500/20',
    'from-amber-600/30 to-orange-600/30 border-amber-500/20',
    'from-rose-600/30 to-red-600/30 border-rose-500/20',
  ];

  const handleVisibilityToggle = async (id: string, currentVisibility: 'PRIVATE' | 'PUBLIC') => {
    const nextVisibility = currentVisibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    await updateVisibility.mutateAsync({ id, visibility: nextVisibility });
  };

  const handleRoadmapDelete = async (id: string, isEnrolled: boolean) => {
    const confirmMessage = isEnrolled
      ? 'Remove this course from your bookshelf?'
      : 'Delete this generated course? This cannot be undone.';
      
    if (!window.confirm(confirmMessage)) return;

    if (isEnrolled) {
      await unenrollRoadmap.mutateAsync(id);
    } else {
      await deleteRoadmap.mutateAsync(id);
    }
  };

  const isMutatingVisibility = updateVisibility.isPending;
  const visibilityMutatingId = updateVisibility.variables?.id;

  const isMutatingDeletion = deleteRoadmap.isPending || unenrollRoadmap.isPending;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">
            Learning Cockpit
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl text-white">
            Welcome back, <span className="gradient-text">{user?.name ?? 'Learner'}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Here is your personalized roadmap bookshelf. Track your progress, toggle public visibility, or jump back into learning paths.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button asChild className="rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
            <Link href="/roadmaps/generate">
              <Plus className="mr-1.5 size-4" />
              New roadmap
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-full border-white/10 hover:bg-white/5">
            <Link href="/discover">
              <Users className="mr-1.5 size-4" />
              Discover public
            </Link>
          </Button>
        </div>
      </div>

      {/* Analytics stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Courses on Shelf', value: totalRoadmaps, sub: 'Total saved paths', icon: Layers3 },
          { label: 'Completed Paths', value: completedRoadmaps, sub: '100% progress tracks', icon: GraduationCap },
          { label: 'Active Tracks', value: inProgressRoadmaps, sub: 'Currently studying', icon: PlayCircle },
          { label: 'Generated Paths', value: generatedCount, sub: 'Custom AI courses', icon: Brain },
          { label: 'Enrolled Shelf', value: savedPublicCount, sub: 'Added from community', icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/20 bg-white/[0.02] border-white/5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <Icon className="size-4 text-blue-400" />
              </div>
              <p className="mt-3 text-3xl font-bold text-white tracking-tight">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
            </Card>
          );
        })}
      </div>

      {/* Central shelf/cards */}
      {roadmaps.isLoading ? (
        <Card className="flex min-h-[22rem] items-center justify-center p-8 border-dashed border-white/10 bg-black/10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-blue-400" />
            <p className="text-sm text-muted-foreground">Loading your learning shelf...</p>
          </div>
        </Card>
      ) : roadmaps.data?.length ? (
        <div className="space-y-10">
          
          {/* Section 1: Generated Roadmaps */}
          {generatedRoadmaps.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Your Generated Roadmaps</h2>
                  <p className="text-xs text-muted-foreground">Courses you built through background AI research. Toggle public visibility to list them in discovery.</p>
                </div>
                <Badge variant="outline" className="border-blue-500/20 bg-blue-500/5 text-blue-300 rounded-full px-3 py-1 font-medium">
                  {generatedRoadmaps.length} course{generatedRoadmaps.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {generatedRoadmaps.map((roadmap, index) => {
                  const gradientClass = cardGradients[index % cardGradients.length];
                  const isPublic = roadmap.visibility === 'PUBLIC';
                  const isProcessing = roadmap.status === 'QUEUED' || roadmap.status === 'RUNNING';
                  const isSavingVis = isMutatingVisibility && visibilityMutatingId === roadmap.id;

                  return (
                    <Card
                      key={roadmap.id}
                      className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-950/10 hover:border-blue-500/30 hover:-translate-y-1.5 bg-card/60 border-white/5"
                    >
                      {/* Course top preview visual cover */}
                      <div className={`relative h-28 w-full bg-gradient-to-r ${gradientClass} flex items-center justify-center border-b`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
                        <div className="absolute top-3 left-3 flex gap-2">
                          {isPublic ? (
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 flex items-center gap-1 py-0.5 px-2">
                              <Sparkles className="size-2.5" /> Public
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700/50 flex items-center gap-1 py-0.5 px-2">
                              <Lock className="size-2.5" /> Private
                            </Badge>
                          )}
                          {isProcessing && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-400/20 flex items-center gap-1 animate-pulse">
                              <Loader2 className="size-2.5 animate-spin" /> {roadmap.status.toLowerCase()}
                            </Badge>
                          )}
                        </div>
                        
                        <GraduationCap className="size-10 text-white/40 transform transition-transform group-hover:scale-110 duration-300" />
                      </div>

                      <div className="flex flex-col flex-1 p-5 space-y-4">
                        {/* Course Header */}
                        <div>
                          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                            {roadmap.topic ?? 'Personalized Path'}
                          </p>
                          <h3 className="mt-1 line-clamp-2 text-lg font-bold text-white tracking-tight leading-snug group-hover:text-blue-300 transition-colors duration-200">
                            {roadmap.title}
                          </h3>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold">{roadmap.progress}% completed</span>
                            <span>{roadmap.status.toLowerCase()}</span>
                          </div>
                          <Progress value={roadmap.progress} className="h-1.5 bg-zinc-800" />
                        </div>

                        {/* Metadata details */}
                        <div className="grid grid-cols-2 gap-y-2 pt-2 text-xs text-muted-foreground border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3 text-muted-foreground" />
                            <span>{new Date(roadmap.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <Users className="size-3 text-muted-foreground" />
                            <span>{roadmap.enrollmentCount ?? 0} learner{(roadmap.enrollmentCount ?? 0) === 1 ? '' : 's'}</span>
                          </div>
                        </div>

                        {/* Action controllers */}
                        <div className="flex flex-col gap-3 pt-3 mt-auto border-t border-white/5">
                          <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-xs">
                            <span className="font-medium text-white flex items-center gap-1.5">
                              {isPublic ? <Sparkles className="size-3.5 text-blue-400" /> : <Lock className="size-3.5 text-zinc-400" />}
                              {isSavingVis ? 'Saving…' : isPublic ? 'Public course' : 'Private shelf'}
                            </span>
                            <Switch
                              checked={isPublic}
                              disabled={isProcessing || isSavingVis}
                              onCheckedChange={() => handleVisibilityToggle(roadmap.id, (roadmap.visibility as 'PRIVATE' | 'PUBLIC') ?? 'PRIVATE')}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" asChild className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium shadow-md shadow-blue-500/10">
                              <Link href={`/roadmaps/${roadmap.id}`}>
                                Start learning
                                <ArrowRight className="ml-1 size-3.5" />
                              </Link>
                            </Button>
                            {isPublic && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-white/10 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/5 hover:border-blue-500/20 shrink-0"
                                onClick={() => handleShare(roadmap.id, roadmap.slug)}
                              >
                                {copiedId === roadmap.id ? (
                                  <Check className="size-4 text-emerald-400" />
                                ) : (
                                  <Share2 className="size-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-white/10 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 shrink-0"
                              disabled={isMutatingDeletion}
                              onClick={() => handleRoadmapDelete(roadmap.id, false)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Enrolled Public Roadmaps */}
          {savedPublicRoadmaps.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-t border-white/5 pt-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Public Shelf Shelf</h2>
                  <p className="text-xs text-muted-foreground">Courses added from the community discovery page.</p>
                </div>
                <Badge variant="outline" className="border-violet-500/20 bg-violet-500/5 text-violet-300 rounded-full px-3 py-1 font-medium">
                  {savedPublicRoadmaps.length} course{savedPublicRoadmaps.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {savedPublicRoadmaps.map((roadmap, index) => {
                  const gradientClass = cardGradients[(index + 2) % cardGradients.length];

                  return (
                    <Card
                      key={roadmap.id}
                      className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-violet-950/10 hover:border-violet-500/30 hover:-translate-y-1.5 bg-card/60 border-white/5"
                    >
                      {/* Cover preview image */}
                      <div className={`relative h-28 w-full bg-gradient-to-r ${gradientClass} flex items-center justify-center border-b`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
                        <div className="absolute top-3 left-3">
                          <Badge variant="success" className="bg-violet-500/10 text-violet-300 border-violet-500/20 flex items-center gap-1 py-0.5 px-2">
                            <Users className="size-2.5" /> Enrolled Shelf
                          </Badge>
                        </div>
                        <PlayCircle className="size-10 text-white/40 transform transition-transform group-hover:scale-110 duration-300" />
                      </div>

                      <div className="flex flex-col flex-1 p-5 space-y-4">
                        {/* Title details */}
                        <div>
                          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                            {roadmap.topic ?? 'Community course'}
                          </p>
                          <h3 className="mt-1 line-clamp-2 text-lg font-bold text-white tracking-tight leading-snug group-hover:text-violet-300 transition-colors duration-200">
                            {roadmap.title}
                          </h3>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold">{roadmap.progress}% completed</span>
                            <span>active</span>
                          </div>
                          <Progress value={roadmap.progress} className="h-1.5 bg-zinc-800" />
                        </div>

                        {/* Meta indicators */}
                        <div className="space-y-1 pt-2 text-xs text-muted-foreground border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="size-3 text-muted-foreground" />
                              Added: {new Date(roadmap.createdAt).toLocaleDateString()}
                            </span>
                            <span>{roadmap.enrollmentCount ?? 0} active</span>
                          </div>
                          <p className="text-muted-foreground/80 line-clamp-1 italic text-[11px] mt-1">
                            By {roadmap.ownerName ?? roadmap.ownerEmail ?? 'Roadlyn author'}
                          </p>
                        </div>

                        {/* Footer buttons */}
                        <div className="flex gap-2 pt-3 mt-auto border-t border-white/5">
                          <Button size="sm" asChild className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-violet-500/10">
                            <Link href={`/roadmaps/${roadmap.id}`}>
                              Start learning
                              <ArrowRight className="ml-1 size-3.5" />
                            </Link>
                          </Button>
                          {roadmap.visibility === 'PUBLIC' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-white/10 text-muted-foreground hover:text-violet-400 hover:bg-violet-500/5 hover:border-violet-500/20 shrink-0"
                              onClick={() => handleShare(roadmap.id, roadmap.slug)}
                            >
                              {copiedId === roadmap.id ? (
                                <Check className="size-4 text-emerald-400" />
                              ) : (
                                <Share2 className="size-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-white/10 text-muted-foreground hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 shrink-0"
                            disabled={isMutatingDeletion}
                            onClick={() => handleRoadmapDelete(roadmap.id, true)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Empty State with premium visuals */
        <Card className="relative overflow-hidden flex min-h-[26rem] flex-col items-center justify-center p-8 text-center bg-white/[0.01] border-dashed border-white/10 rounded-3xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.06),transparent_22rem)]" />
          
          <div className="relative flex flex-col items-center max-w-lg space-y-5">
            <span className="ai-glow flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-xl shadow-blue-500/20 animate-pulse">
              <BookOpen className="size-7 text-white" />
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Your Learning Shelf is Empty</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You haven&apos;t generated any roadmap courses or enrolled in public pathways yet. Start research on the topic you want to learn to build your first tailored syllabus!
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-3 justify-center w-full max-w-xs">
              <Button asChild className="rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold border-0 shadow-lg shadow-blue-500/20 transition-transform active:scale-95">
                <Link href="/roadmaps/generate">
                  <Plus className="mr-1.5 size-4" />
                  Generate course
                </Link>
              </Button>
              <Button variant="outline" asChild className="rounded-full border-white/10 hover:bg-white/5">
                <Link href="/discover">
                  Discover public
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
