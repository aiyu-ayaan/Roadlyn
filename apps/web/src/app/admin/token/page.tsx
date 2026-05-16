'use client';

import type { ElementType } from 'react';
import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Activity, AlertTriangle, ChevronLeft, ChevronRight, CircleDot, Clock, Hash, Layers, TrendingUp, Zap } from 'lucide-react';
import { AdminRoute } from '@/components/admin/admin-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokenUsage, useTokenUsageStats } from '@/hooks/use-token-usage';
import { useProviders } from '@/hooks/use-ai';
import { AIProvider, DailyUsage, OperationBreakdown, ProviderUsageBreakdown, TokenUsageRecord } from '@/types';

const ALL_SELECT_VALUE = '__all__';

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

  const filters = useMemo(
    () => ({ providerId: providerId || undefined, operation: operation || undefined, success: successFilter || undefined }),
    [providerId, operation, successFilter]
  );

  const stats = useTokenUsageStats();
  const usage = useTokenUsage(page, 25, filters);
  const providers = useProviders();

  const pagination = usage.data?.pagination;
  const records = usage.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Token Usage" description="Track AI token consumption, costs, and usage patterns across all providers." />

      {/* Stats Cards */}
      {stats.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : stats.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Requests" value={formatNumber(stats.data.totals.requests)} icon={Activity} gradient="from-blue-500/20 to-indigo-500/20" />
          <StatCard
            label="Total Tokens"
            value={formatTokens(stats.data.totals.totalTokens)}
            icon={Zap}
            gradient="from-violet-500/20 to-purple-500/20"
            subtitle={`${formatTokens(stats.data.totals.promptTokens)} in · ${formatTokens(stats.data.totals.completionTokens)} out`}
          />
          <StatCard label="Providers Used" value={String(stats.data.byProvider.length)} icon={Layers} gradient="from-emerald-500/20 to-teal-500/20" />
          <StatCard
            label="Error Rate"
            value={`${stats.data.totals.errorRate}%`}
            icon={AlertTriangle}
            gradient={stats.data.totals.errorRate > 5 ? 'from-red-500/20 to-orange-500/20' : 'from-green-500/20 to-emerald-500/20'}
            subtitle={`${stats.data.totals.errors} failed of ${stats.data.totals.requests}`}
          />
        </div>
      ) : null}

      {/* Filters */}
      <FilterBar
        providerId={providerId}
        setProviderId={setProviderId}
        operation={operation}
        setOperation={setOperation}
        successFilter={successFilter}
        setSuccessFilter={setSuccessFilter}
        providers={providers.data ?? []}
      />

      {/* Charts */}
      {stats.data && (
        <section className="grid gap-4 lg:grid-cols-3">
          {/* Daily Usage Line Chart */}
          <Card className="col-span-2 overflow-hidden p-5 flex flex-col h-80 bg-black/60 backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-400" />
              <h3 className="font-semibold">Daily Usage (30 days)</h3>
            </div>
            {stats.data.daily.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No usage data yet</div>
            ) : (
              <DailyChart data={stats.data.daily} />
            )}
          </Card>

          {/* Provider Pie Chart */}
          <Card className="overflow-hidden p-5 flex flex-col h-80 bg-black/60 backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2">
              <Layers className="size-4 text-purple-400" />
              <h3 className="font-semibold">Tokens by Provider</h3>
            </div>
            <ProviderPieChart data={stats.data.byProvider} />
          </Card>

          {/* Operation Bar Chart */}
          <Card className="overflow-hidden p-5 flex flex-col h-80 bg-black/60 backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2">
              <CircleDot className="size-4 text-amber-400" />
              <h3 className="font-semibold">Tokens by Operation</h3>
            </div>
            <OperationBarChart data={stats.data.byOperation} />
          </Card>
        </section>
      )}

      {/* Usage Log Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-2">
            <Hash className="size-4 text-blue-400" />
            <h3 className="font-semibold">Usage Log</h3>
          </div>
        </div>
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
              <p className="mt-3 text-sm text-muted-foreground">No token usage records found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Provider</th>
                  <th className="px-5 py-3 font-medium">Model</th>
                  <th className="px-5 py-3 font-medium">Operation</th>
                  <th className="px-5 py-3 font-medium text-right">Prompt</th>
                  <th className="px-5 py-3 font-medium text-right">Completion</th>
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
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
            </p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4" />
              </Button>
              {generatePageNumbers(page, pagination.totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="flex h-8 items-center px-1 text-xs text-muted-foreground">...</span>
                ) : (
                  <Button key={p} size="sm" variant={page === p ? 'secondary' : 'ghost'} onClick={() => setPage(p as number)} className="h-8 w-8 px-0">
                    {p}
                  </Button>
                )
              )}
              <Button size="sm" variant="ghost" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

type FilterBarProps = {
  providerId: string;
  setProviderId: (value: string) => void;
  operation: string;
  setOperation: (value: string) => void;
  successFilter: string;
  setSuccessFilter: (value: string) => void;
  providers: AIProvider[];
};

function FilterBar({
  providerId,
  setProviderId,
  operation,
  setOperation,
  successFilter,
  setSuccessFilter,
  providers,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 bg-black/30 backdrop-blur-md p-4 rounded-xl border border-white/10">
      <Select value={providerId || ALL_SELECT_VALUE} onValueChange={(value) => setProviderId(value === ALL_SELECT_VALUE ? '' : value)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All providers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SELECT_VALUE}>All providers</SelectItem>
          {providers.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={operation || ALL_SELECT_VALUE} onValueChange={(value) => setOperation(value === ALL_SELECT_VALUE ? '' : value)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All operations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SELECT_VALUE}>All operations</SelectItem>
          {/* Dynamic operation list could be added here */}
        </SelectContent>
      </Select>
      <Select value={successFilter || ALL_SELECT_VALUE} onValueChange={(value) => setSuccessFilter(value === ALL_SELECT_VALUE ? '' : value)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SELECT_VALUE}>All status</SelectItem>
          <SelectItem value="true">Success</SelectItem>
          <SelectItem value="false">Failed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function DailyChart({ data }: { data: DailyUsage[] }) {
  const chartData = useMemo(() => {
    return data.map((d) => ({ ...d, formattedDate: formatDate(d.date) }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="formattedDate" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => formatTokens(val)} />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const day = payload[0].payload as DailyUsage;
              return (
                <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
                  <p className="font-semibold text-white">{formatDate(day.date)}</p>
                  <p className="mt-1 text-muted-foreground">
                    <span className="text-blue-400 font-medium">{formatTokens(day.tokens)}</span> tokens · {day.requests} req
                  </p>
                  {day.errors > 0 && <p className="mt-0.5 text-red-400">{day.errors} error{day.errors !== 1 ? 's' : ''}</p>}
                </div>
              );
            }
            return null;
          }}
          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
        />
        <Line type="monotone" dataKey="tokens" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#818cf8', stroke: 'rgba(255,255,255,0.2)', strokeWidth: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ProviderPieChart({ data }: { data: ProviderUsageBreakdown[] }) {
  const COLORS = ['#60a5fa', '#818cf8', '#a78bfa', '#f472b6', '#fb7185'];
  const chartData = useMemo(() => {
    return data.map((p) => ({ name: p.providerName, value: p.totalTokens }));
  }, [data]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} fill="#8884d8" label>
          {chartData.map((_, i) => (
            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const entry = payload[0].payload as { name: string; value: number };
              return (
                <div className="rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-xs shadow-xl backdrop-blur-md">
                  <p className="font-medium text-white">{entry.name}</p>
                  <p className="text-muted-foreground">{formatTokens(entry.value)} tokens</p>
                </div>
              );
            }
            return null;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function OperationBarChart({ data }: { data: OperationBreakdown[] }) {
  const chartData = useMemo(() => {
    return data.map((op) => ({ operation: op.operation, tokens: op.totalTokens }));
  }, [data]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="operation" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => formatTokens(val)} />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const entry = payload[0].payload as { operation: string; tokens: number };
              return (
                <div className="rounded-lg border border-white/10 bg-black/90 px-2 py-1 text-xs shadow-xl backdrop-blur-md">
                  <p className="font-medium text-white">{entry.operation}</p>
                  <p className="text-muted-foreground">{formatTokens(entry.tokens)} tokens</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="tokens" fill="#34d399" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function UsageRow({ record }: { record: TokenUsageRecord }) {
  return (
    <tr className="border-b border-white/5 transition hover:bg-white/[0.02]">
      <td className="whitespace-nowrap px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {new Date(record.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </td>
      <td className="px-5 py-3"><span className="font-medium">{record.provider.name}</span></td>
      <td className="px-5 py-3"><span className="text-muted-foreground">{record.model?.displayName ?? record.model?.modelName ?? '—'}</span></td>
      <td className="px-5 py-3"><Badge variant="outline" className="font-mono text-[10px]">{record.operation}</Badge></td>
      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">{record.promptTokens.toLocaleString()}</td>
      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">{record.completionTokens.toLocaleString()}</td>
      <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums">{record.totalTokens.toLocaleString()}</td>
      <td className="px-5 py-3 text-center">
        {record.success ? (
          <Badge variant="success" className="text-[10px]">OK</Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">{record.errorCode ?? 'ERR'}</Badge>
        )}
      </td>
    </tr>
  );
}

function StatCard({ label, value, icon: Icon, gradient, subtitle }: { label: string; value: string; icon: ElementType; gradient: string; subtitle?: string }) {
  return (
    <Card className="relative overflow-hidden p-5 bg-black/30 backdrop-blur-md">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}>
          <Icon className="size-4 text-white/80" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}

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

function generatePageNumbers(current: number, total: number): (number | '...')[] {
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
