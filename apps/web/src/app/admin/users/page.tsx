'use client';

import { ShieldCheck, Users } from 'lucide-react';
import { AdminRoute } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminUsers } from '@/hooks/use-admin';

export default function AdminUsersPage() {
  return (
    <AdminRoute>
      <AdminUsersContent />
    </AdminRoute>
  );
}

function AdminUsersContent() {
  const users = useAdminUsers();
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
              <div
                key={workspaceUser.id}
                className="grid gap-3 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[1.5fr_0.6fr_0.8fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{workspaceUser.name ?? workspaceUser.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{workspaceUser.email}</p>
                </div>
                <div>
                  <Badge variant={workspaceUser.role === 'ADMIN' ? 'success' : 'secondary'}>
                    {workspaceUser.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {workspaceUser._count.roadmaps} roadmaps
                </p>
                <p className="text-sm text-muted-foreground">
                  Joined {new Date(workspaceUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
