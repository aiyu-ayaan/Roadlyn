import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth';
import { AIGatewayService } from '../services/ai-gateway-service';
import { ApiError } from '../utils/errors';

const defaultProviderSchema = z.object({
  providerId: z.string().min(1),
});

const tokenUsageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  userId: z.string().optional(),
  operation: z.string().optional(),
  success: z.enum(['true', 'false']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function adminRoutes(fastify: FastifyInstance) {
  const gateway = new AIGatewayService(fastify.db, fastify.redis);

  fastify.get('/admin/users', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Admin'],
      summary: 'List application users',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const users = await fastify.db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            roadmaps: true,
            sessions: true,
            providerKeys: true,
          },
        },
      },
      orderBy: [
        { role: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return { success: true, data: users };
  });

  fastify.post('/admin/ai/default-provider', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Admin'],
      summary: 'Set the platform default AI provider',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['providerId'],
        properties: {
          providerId: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const input = defaultProviderSchema.parse(request.body);
    const provider = await fastify.db.$transaction(async (tx) => {
      const existing = await tx.aIProvider.findUnique({
        where: { id: input.providerId },
      });

      if (!existing) {
        throw new ApiError(404, 'AI_PROVIDER_NOT_FOUND', 'AI provider not found');
      }

      await tx.aIProvider.updateMany({
        where: { id: { not: input.providerId } },
        data: { isDefault: false },
      });

      return tx.aIProvider.update({
        where: { id: input.providerId },
        data: {
          isDefault: true,
          enabled: true,
        },
      });
    });

    await gateway.invalidateProviderCache();

    return { success: true, data: provider };
  });

  // ─── TOKEN USAGE LIST ──────────────────────────────────────────────
  fastify.get('/admin/token-usage', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Admin'],
      summary: 'List paginated token usage logs',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const query = tokenUsageQuerySchema.parse(request.query);
    const where: Record<string, unknown> = {};

    if (query.providerId) where.providerId = query.providerId;
    if (query.modelId) where.modelId = query.modelId;
    if (query.userId) where.userId = query.userId;
    if (query.operation) where.operation = query.operation;
    if (query.success !== undefined) where.success = query.success === 'true';
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [records, total] = await Promise.all([
      fastify.db.aITokenUsage.findMany({
        where,
        include: {
          provider: { select: { id: true, name: true, providerType: true } },
          model: { select: { id: true, displayName: true, modelName: true } },
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      fastify.db.aITokenUsage.count({ where }),
    ]);

    return {
      success: true,
      data: records,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  });

  // ─── TOKEN USAGE STATS ─────────────────────────────────────────────
  fastify.get('/admin/token-usage/stats', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Admin'],
      summary: 'Get aggregate token usage statistics',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totals, byProvider, recentRecords, errorCount, totalCount] = await Promise.all([
      // Overall totals
      fastify.db.aITokenUsage.aggregate({
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
        },
        _count: true,
      }),
      // Per-provider breakdown
      fastify.db.aITokenUsage.groupBy({
        by: ['providerId'],
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
        },
        _count: true,
        orderBy: { _sum: { totalTokens: 'desc' } },
      }),
      // Recent 30-day records for daily chart data
      fastify.db.aITokenUsage.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          totalTokens: true,
          promptTokens: true,
          completionTokens: true,
          createdAt: true,
          success: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // Error count
      fastify.db.aITokenUsage.count({ where: { success: false } }),
      // Total count
      fastify.db.aITokenUsage.count(),
    ]);

    // Get provider names for the breakdown
    const providerIds = byProvider.map((p) => p.providerId);
    const providers = await fastify.db.aIProvider.findMany({
      where: { id: { in: providerIds } },
      select: { id: true, name: true, providerType: true },
    });
    const providerMap = new Map(providers.map((p) => [p.id, p]));

    // Aggregate daily usage for chart
    const dailyMap = new Map<string, { tokens: number; prompt: number; completion: number; requests: number; errors: number }>();
    for (const record of recentRecords) {
      const day = record.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) ?? { tokens: 0, prompt: 0, completion: 0, requests: 0, errors: 0 };
      entry.tokens += record.totalTokens;
      entry.prompt += record.promptTokens;
      entry.completion += record.completionTokens;
      entry.requests += 1;
      if (!record.success) entry.errors += 1;
      dailyMap.set(day, entry);
    }

    // Build operations breakdown
    const operations = await fastify.db.aITokenUsage.groupBy({
      by: ['operation'],
      _sum: { totalTokens: true },
      _count: true,
      orderBy: { _count: { operation: 'desc' } },
    });

    return {
      success: true,
      data: {
        totals: {
          requests: totals._count,
          promptTokens: totals._sum.promptTokens ?? 0,
          completionTokens: totals._sum.completionTokens ?? 0,
          totalTokens: totals._sum.totalTokens ?? 0,
          errors: errorCount,
          errorRate: totalCount > 0 ? Number(((errorCount / totalCount) * 100).toFixed(2)) : 0,
        },
        byProvider: byProvider.map((p) => ({
          providerId: p.providerId,
          providerName: providerMap.get(p.providerId)?.name ?? 'Unknown',
          providerType: providerMap.get(p.providerId)?.providerType ?? 'UNKNOWN',
          requests: p._count,
          totalTokens: p._sum.totalTokens ?? 0,
          promptTokens: p._sum.promptTokens ?? 0,
          completionTokens: p._sum.completionTokens ?? 0,
        })),
        byOperation: operations.map((op) => ({
          operation: op.operation,
          requests: op._count,
          totalTokens: op._sum.totalTokens ?? 0,
        })),
        daily: Array.from(dailyMap.entries()).map(([date, data]) => ({
          date,
          ...data,
        })),
      },
    };
  });
}
