'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Users } from 'lucide-react';
import { AdminRoute } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminUsers, useUpdateUserGenerationPolicy } from '@/hooks/use-admin';
import { AdminUser } from '@/types';

export default function AdminUsersPage() {
  return (
    <AdminRoute>
      <AdminUsersContent />
    </AdminRoute>
  );
}

function AdminUsersContent() {
  const users = useAdminUsers();
  const updatePolicy = useUpdateUserGenerationPolicy();
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const adminCount = users.data?.filter((user) => user.role === 'ADMIN').length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Users"
        description="View Roadlyn users. The first signed-in account is assigned admin automatically."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total users</p>
            <Users className="size-4 text-blue-300" />
          </div>
          <p className="mt-3 text-3xl font-semibold">{users.data?.length ?? 0}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Admins</p>
            <ShieldCheck className="size-4 text-blue-300" />
          </div>
          <p className="mt-3 text-3xl font-semibold">{adminCount}</p>
        </Card>
      </div>

      <Card className="overflow-hidden p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Users</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed-in Roadlyn users are listed here.
            </p>
          </div>
          <Badge variant="outline" className="border-blue-400/20 bg-blue-500/10 text-blue-200">
            <ShieldCheck className="mr-1 size-3" />
            Admin only
          </Badge>
        </div>

        {users.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {(users.data ?? []).map((workspaceUser) => (
              <UserPolicyRow
                key={workspaceUser.id}
                user={workspaceUser}
                isSaving={savingUserId === workspaceUser.id}
                onSave={async (input) => {
                  setSavingUserId(workspaceUser.id);
                  try {
                    await updatePolicy.mutateAsync({ id: workspaceUser.id, ...input });
                  } finally {
                    setSavingUserId((current) =>
                      current === workspaceUser.id ? null : current
                    );
                  }
                }}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function UserPolicyRow({
  user,
  isSaving,
  onSave,
}: {
  user: AdminUser;
  isSaving: boolean;
  onSave: (input: {
    maxGenerations?: number | null;
    generationCooldownSeconds?: number;
    unlimitedGenerations?: boolean;
    noGenerationCooldown?: boolean;
  }) => Promise<unknown>;
}) {
  const [maxGenerations, setMaxGenerations] = useState(user.maxGenerations?.toString() ?? '');
  const [cooldownMinutes, setCooldownMinutes] = useState(
    user.generationCooldownSeconds ? String(Math.round(user.generationCooldownSeconds / 60)) : '0'
  );
  const [unlimitedGenerations, setUnlimitedGenerations] = useState(user.unlimitedGenerations);
  const [noGenerationCooldown, setNoGenerationCooldown] = useState(user.noGenerationCooldown);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setMaxGenerations(user.maxGenerations?.toString() ?? '');
    setCooldownMinutes(
      user.generationCooldownSeconds
        ? String(Math.round(user.generationCooldownSeconds / 60))
        : '0'
    );
    setUnlimitedGenerations(user.unlimitedGenerations);
    setNoGenerationCooldown(user.noGenerationCooldown);
    setSaveError(null);
  }, [
    user.id,
    user.maxGenerations,
    user.generationCooldownSeconds,
    user.unlimitedGenerations,
    user.noGenerationCooldown,
  ]);

  const handleSave = async () => {
    setSaveError(null);

    if (!unlimitedGenerations && maxGenerations.trim() !== '') {
      const parsedMax = Number(maxGenerations);
      if (!Number.isFinite(parsedMax) || parsedMax < 0) {
        setSaveError('Max generations must be a non-negative number.');
        return;
      }
    }

    if (!noGenerationCooldown) {
      const parsedCooldown = Number(cooldownMinutes || 0);
      if (!Number.isFinite(parsedCooldown) || parsedCooldown < 0) {
        setSaveError('Cooldown minutes must be a non-negative number.');
        return;
      }
    }

    try {
      await onSave({
        maxGenerations:
          unlimitedGenerations || maxGenerations.trim() === ''
            ? null
            : Number(maxGenerations),
        generationCooldownSeconds: noGenerationCooldown
          ? 0
          : Number(cooldownMinutes || 0) * 60,
        unlimitedGenerations,
        noGenerationCooldown,
      });
    } catch {
      setSaveError('Could not save generation policy. Try again.');
    }
  };

  return (
    <div className="grid gap-4 border-b border-border px-4 py-4 last:border-b-0 xl:grid-cols-[1.2fr_0.35fr_0.7fr_1.45fr]">
      <div className="min-w-0">
        <p className="truncate font-medium">{user.name ?? user.email}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {user._count.roadmaps} roadmaps · Joined {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <Badge variant={user.role === 'ADMIN' ? 'success' : 'secondary'}>{user.role}</Badge>
        {user.isDemo ? <Badge variant="outline">Demo</Badge> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <label className="text-xs text-muted-foreground">
          Max generations
          <Input
            className="mt-1"
            type="number"
            min={0}
            disabled={unlimitedGenerations || isSaving}
            value={maxGenerations}
            placeholder="Unlimited"
            onChange={(event) => setMaxGenerations(event.target.value)}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Cooldown minutes
          <Input
            className="mt-1"
            type="number"
            min={0}
            disabled={noGenerationCooldown || isSaving}
            value={cooldownMinutes}
            onChange={(event) => setCooldownMinutes(event.target.value)}
          />
        </label>
      </div>
      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <span>
            <span className="block font-medium">Unlimited generation</span>
            <span className="text-xs text-muted-foreground">Ignore the max generation cap.</span>
          </span>
          <Switch
            checked={unlimitedGenerations}
            disabled={isSaving}
            onCheckedChange={setUnlimitedGenerations}
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <span>
            <span className="block font-medium">No cooldown</span>
            <span className="text-xs text-muted-foreground">
              Allow immediate repeat generations.
            </span>
          </span>
          <Switch
            checked={noGenerationCooldown}
            disabled={isSaving}
            onCheckedChange={setNoGenerationCooldown}
          />
        </label>
        {saveError ? <p className="text-xs text-red-400">{saveError}</p> : null}
        <Button size="sm" disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? <Loader2 className="animate-spin" /> : null}
          Save policy
        </Button>
      </div>
    </div>
  );
}
