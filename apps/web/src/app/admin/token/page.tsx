'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  Hash,
  Layers,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AdminRoute } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokenUsage, useTokenUsageStats } from '@/hooks/use-token-usage';
import { useProviders } from '@/hooks/use-ai';
import { DailyUsage, TokenUsageRecord } from '@/types';

export default function AdminTokenPage() {
  return (
    <AdminRoute>
      <TokenUsageContent />
    </AdminRoute>
  );
}

function TokenUsageContent() {
  const [page, setPage] = useState(1);
  const [providerId, setProviderId] = useState<string>('');
  const [operation, setOperation] = useState<string>('');
  const [successFilter, setSuccessFilter] = useState<string>('');

  const filters = useMemo(() => ({
    providerId: providerId || undefined,
    operation: operation || undefined,
    success: successFilter || undefined,
  }), [providerId, operation, successFilter]);

  const stats = useTokenUsageStats();
  const usage = useTokenUsage(page, 25, filters);
  const providers = useProviders();

  const pagination = usage.data?.pagination;
  const records = usage.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Token Usage"
        description="Track AI token consumption, costs, and usage patterns across all providers."
      />

      {/* Stats Cards */}
      {stats.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : stats.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Requests"
            value={formatNumber(stats.data.totals.requests)}
            icon={Activity}
            gradient="from-blue-500/20 to-indigo-500/20"
          />
          <StatCard
            label="Total Tokens"
            value={formatTokens(stats.data.totals.totalTokens)}
            icon={Zap}
            gradient="from-violet-500/20 to-purple-500/20"
            subtitle={`${formatTokens(stats.data.totals.promptTokens)} in · ${formatTokens(stats.data.totals.completionTokens)} out`}
          />
          <StatCard
            label="Providers Used"
            value={String(stats.data.byProvider.length)}
            icon={Layers}
            gradient="from-emerald-500/20 to-teal-500/20"
          />
          <StatCard
            label="Error Rate"
            value={`${stats.data.totals.errorRate}%`}
            icon={AlertTriangle}
            gradient={
              stats.data.totals.errorRate > 5
                ? 'from-red-500/20 to-orange-500/20'
                : 'from-green-500/20 to-emerald-500/20'
            }
            subtitle={`${stats.data.totals.errors} failed of ${stats.data.totals.requests}`}
          />
        </div>
      ) : null}

      {/* Daily Usage Chart + Provider Breakdown */}
      {stats.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="col-span-2 overflow-hidden p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-400" />
              <h3 className="font-semibold">Daily Usage (30 days)</h3>
            </div>
            {stats.data.daily.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No usage data yet
              </div>
            ) : (
              <DailyChart data={stats.data.daily} />
            )}
          </Card>

          <Card className="overflow-hidden p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="size-4 text-violet-400" />
              <h3 className="font-semibold">By Provider</h3>
            </div>
            {stats.data.byProvider.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No provider data
              </div>
            ) : (
              <div className="space-y-3">
                {stats.data.byProvider.map((p) => {
                  const pct = stats.data!.totals.totalTokens > 0
                    ? (p.totalTokens / stats.data!.totals.totalTokens) * 100
                    : 0;
                  return (
                    <div key={p.providerId}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{p.providerName}</span>
                        <span className="text-muted-foreground">
                          {formatTokens(p.totalTokens)} · {p.requests} req
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Operations */}
            {stats.data.byOperation.length > 0 && (
              <>
                <div className="mb-3 mt-6 flex items-center gap-2">
                  <CircleDot className="size-4 text-amber-400" />
                  <h3 className="font-semibold">By Operation</h3>
                </div>
                <div className="space-y-2">
                  {stats.data.byOperation.map((op) => (
                    <div
                      key={op.operation}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm"
                    >
                      <span className="truncate font-mono text-xs">{op.operation}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {op.requests} · {formatTokens(op.totalTokens)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Filters + Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-2">
            <Hash className="size-4 text-blue-400" />
            <h3 className="font-semibold">Usage Log</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All providers</SelectItem>
                {(providers.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Filter by operation..."
              value={operation}
              onChange={(e) => { setOperation(e.target.value); setPage(1); }}
              className="w-48"
            />
            <Select value={successFilter} onValueChange={(v) => { setSuccessFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All status</SelectItem>
                <SelectItem value="true">Success</SelectItem>
                <SelectItem value="false">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {usage.isLoading ? (
            <div className="space-y-2 p-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Activity className="size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                No token usage records found
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Provider</th>
                  <th className="px-5 py-3 font-medium">Model</th>
                  <th className="px-5 py-3 font-medium">Operation</th>
                  <th className="px-5 py-3 font-medium text-right">
                    <span className="inline-flex items-center gap-1">
                      <ArrowUp className="size-3" /> Prompt
                    </span>
                  </th>
                  <th className="px-5 py-3 font-medium text-right">
                    <span className="inline-flex items-center gap-1">
                      <ArrowDown className="size-3" /> Completion
                    </span>
                  </th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <UsageRow key={record.id} record={record} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total.toLocaleString()}
            </p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {generatePageNumbers(page, pagination.totalPages).map((p, i) =>
                p === '...' ? (
                  <span
                    key={`dots-${i}`}
                    className="flex h-8 items-center px-1 text-xs text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    size="sm"
                    variant={page === p ? 'secondary' : 'ghost'}
                    onClick={() => setPage(p as number)}
                    className="h-8 w-8 px-0"
                  >
                    {p}
                  </Button>
                ),
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
  subtitle?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div
          className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}
        >
          <Icon className="size-4 text-white/80" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </Card>
  );
}

function DailyChart({ data }: { data: DailyUsage[] }) {
  const maxTokens = Math.max(...data.map((d) => d.tokens), 1);

  return (
    <div className="flex h-40 items-end gap-[3px]">
      {data.map((day) => {
        const height = Math.max((day.tokens / maxTokens) * 100, 2);
        const hasErrors = day.errors > 0;

        return (
          <div
            key={day.date}
            className="group relative flex-1"
          >
            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 scale-0 rounded-lg border border-white/10 bg-card px-3 py-2 text-xs shadow-xl transition group-hover:scale-100">
              <p className="font-semibold">{formatDate(day.date)}</p>
              <p className="mt-1 text-muted-foreground">
                {formatTokens(day.tokens)} tokens · {day.requests} req
              </p>
              {hasErrors && (
                <p className="text-red-400">{day.errors} error{day.errors !== 1 ? 's' : ''}</p>
              )}
            </div>
            <div
              className={`w-full rounded-t-sm transition-all group-hover:opacity-80 ${
                hasErrors
                  ? 'bg-gradient-to-t from-red-500/60 to-red-400/40'
                  : 'bg-gradient-to-t from-blue-500/60 to-violet-400/40'
              }`}
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function UsageRow({ record }: { record: TokenUsageRecord }) {
  return (
    <tr className="border-b border-white/5 transition hover:bg-white/[0.02]">
      <td className="whitespace-nowrap px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {new Date(record.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="font-medium">{record.provider.name}</span>
      </td>
      <td className="px-5 py-3">
        <span className="text-muted-foreground">
          {record.model?.displayName ?? record.model?.modelName ?? '—'}
        </span>
      </td>
      <td className="px-5 py-3">
        <Badge variant="outline" className="font-mono text-[10px]">
          {record.operation}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
        {record.promptTokens.toLocaleString()}
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
        {record.completionTokens.toLocaleString()}
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums">
        {record.totalTokens.toLocaleString()}
      </td>
      <td className="px-5 py-3 text-center">
        {record.success ? (
          <Badge variant="success" className="text-[10px]">OK</Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">
            {record.errorCode ?? 'ERR'}
          </Badge>
        )}
      </td>
    </tr>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function generatePageNumbers(
  current: number,
  total: number,
): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  pages.push(total);

  return pages;
}
