import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth';
import { AIGatewayService } from '../services/ai-gateway-service';
import { ApiError } from '../utils/errors';

const defaultProviderSchema = z.object({
  providerId: z.string().min(1),
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
}
