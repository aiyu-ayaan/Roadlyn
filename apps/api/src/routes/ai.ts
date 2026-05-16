import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireScope } from '../middleware/auth';
import { AIGatewayService } from '../services/ai-gateway-service';
import { encryptSecret } from '../utils/crypto';
import { ApiError } from '../utils/errors';

const providerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  providerType: z.enum([
    'OPENAI',
    'ANTHROPIC',
    'GEMINI',
    'DEEPSEEK',
    'GROK',
    'MISTRAL',
    'TOGETHERAI',
    'OPENROUTER',
    'OLLAMA',
    'CUSTOM_OPENAI_COMPATIBLE',
  ]),
  baseUrl: z.string().url().optional(),
  supportsStreaming: z.boolean().default(true),
  supportsVision: z.boolean().default(false),
  supportsEmbeddings: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

const modelSchema = z.object({
  providerId: z.string(),
  modelName: z.string().min(1),
  displayName: z.string().min(1),
  contextWindow: z.number().int().positive().optional(),
  inputPricing: z.number().nonnegative().optional(),
  outputPricing: z.number().nonnegative().optional(),
  supportsTools: z.boolean().default(false),
  supportsVision: z.boolean().default(false),
  supportsReasoning: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

const keySchema = z.object({
  providerId: z.string(),
  apiKey: z.string().min(1),
  keyName: z.string().min(1),
  userId: z.string().optional(),
  isDefault: z.boolean().default(false),
});

const defaultProviderSchema = z.object({
  userId: z.string(),
  providerId: z.string(),
  fallbackProviderId: z.string().optional(),
  useOwnKeys: z.boolean().default(false),
});

const defaultModelSchema = z.object({
  userId: z.string(),
  modelId: z.string(),
});

const testProviderSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  userId: z.string().optional(),
});

const generateSchema = z.object({
  topic: z.string().min(1),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  useUserDefaults: z.boolean().default(false),
});

const providerBodyJsonSchema = {
  type: 'object',
  required: ['name', 'slug', 'providerType'],
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    providerType: { type: 'string' },
    baseUrl: { type: 'string' },
    supportsStreaming: { type: 'boolean' },
    supportsVision: { type: 'boolean' },
    supportsEmbeddings: { type: 'boolean' },
    enabled: { type: 'boolean' },
  },
};

export async function aiRoutes(fastify: FastifyInstance) {
  const gateway = new AIGatewayService(fastify.db, fastify.redis);

  fastify.post('/ai/providers', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['AI Providers'],
      summary: 'Register a dynamic AI provider',
      security: [{ bearerAuth: [] }],
      body: providerBodyJsonSchema,
    },
  }, async (request, reply) => {
    const input = providerSchema.parse(request.body);
    const provider = await fastify.db.aIProvider.create({ data: input });
    await gateway.invalidateProviderCache(provider.id);
    reply.status(201);

    return { success: true, data: provider };
  });

  fastify.get('/ai/providers', {
    preHandler: requireScope('ai:read'),
    schema: {
      tags: ['AI Providers'],
      summary: 'List AI providers',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const providers = await fastify.db.aIProvider.findMany({
      include: { models: true },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, data: providers };
  });

  fastify.patch('/ai/providers/:id', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['AI Providers'],
      summary: 'Update an AI provider',
      security: [{ bearerAuth: [] }],
      body: { ...providerBodyJsonSchema, required: [] },
    },
  }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const input = providerSchema.partial().parse(request.body);
    const provider = await fastify.db.aIProvider.update({
      where: { id },
      data: input,
    });
    await gateway.invalidateProviderCache(id);

    return { success: true, data: provider };
  });

  fastify.delete('/ai/providers/:id', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['AI Providers'],
      summary: 'Disable an AI provider',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const provider = await fastify.db.aIProvider.update({
      where: { id },
      data: { enabled: false },
    });
    await gateway.invalidateProviderCache(id);

    return { success: true, data: provider };
  });

  fastify.post('/ai/models', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['AI Models'],
      summary: 'Register an AI model for a provider',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const input = modelSchema.parse(request.body);
    const model = await fastify.db.aIModel.create({ data: input });
    await gateway.invalidateProviderCache(input.providerId);
    reply.status(201);

    return { success: true, data: model };
  });

  fastify.get('/ai/models', {
    preHandler: requireScope('ai:read'),
    schema: {
      tags: ['AI Models'],
      summary: 'List AI models',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const query = z
      .object({ providerId: z.string().optional(), enabled: z.coerce.boolean().optional() })
      .parse(request.query);
    const models = await fastify.db.aIModel.findMany({
      where: {
        providerId: query.providerId,
        enabled: query.enabled,
      },
      include: { provider: true },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, data: models };
  });

  fastify.post('/ai/keys', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['AI Keys'],
      summary: 'Store an encrypted provider API key',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const input = keySchema.parse(request.body);

    if (input.isDefault) {
      await fastify.db.providerAPIKey.updateMany({
        where: {
          providerId: input.providerId,
          userId: input.userId ?? null,
        },
        data: { isDefault: false },
      });
    }

    const key = await fastify.db.providerAPIKey.create({
      data: {
        providerId: input.providerId,
        userId: input.userId,
        encryptedKey: encryptSecret(input.apiKey),
        keyName: input.keyName,
        isDefault: input.isDefault,
      },
      select: {
        id: true,
        providerId: true,
        userId: true,
        keyName: true,
        isDefault: true,
        isActive: true,
        lastValidatedAt: true,
        createdAt: true,
      },
    });
    await gateway.invalidateProviderCache(input.providerId);
    reply.status(201);

    return { success: true, data: key };
  });

  fastify.get('/ai/keys', {
    preHandler: requireScope('ai:read'),
    schema: {
      tags: ['AI Keys'],
      summary: 'List provider API key metadata',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const query = z
      .object({ providerId: z.string().optional(), userId: z.string().optional() })
      .parse(request.query);
    const keys = await fastify.db.providerAPIKey.findMany({
      where: query,
      select: {
        id: true,
        providerId: true,
        userId: true,
        keyName: true,
        isDefault: true,
        isActive: true,
        lastValidatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: keys };
  });

  fastify.delete('/ai/keys/:id', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['AI Keys'],
      summary: 'Disable a provider API key',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const key = await fastify.db.providerAPIKey.update({
      where: { id },
      data: { isActive: false },
    });
    await gateway.invalidateProviderCache(key.providerId);

    return { success: true };
  });

  fastify.post('/ai/default-provider', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['AI Settings'],
      summary: 'Set per-user default and fallback provider',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const input = defaultProviderSchema.parse(request.body);
    const settings = await fastify.db.userAISettings.upsert({
      where: { userId: input.userId },
      update: {
        defaultProviderId: input.providerId,
        fallbackProviderId: input.fallbackProviderId,
        useOwnKeys: input.useOwnKeys,
      },
      create: {
        userId: input.userId,
        defaultProviderId: input.providerId,
        fallbackProviderId: input.fallbackProviderId,
        useOwnKeys: input.useOwnKeys,
      },
    });

    return { success: true, data: settings };
  });

  fastify.post('/ai/default-model', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['AI Settings'],
      summary: 'Set per-user default model',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const input = defaultModelSchema.parse(request.body);
    const model = await fastify.db.aIModel.findUnique({
      where: { id: input.modelId },
    });

    if (!model) {
      throw new ApiError(404, 'AI_MODEL_NOT_FOUND', 'AI model not found');
    }

    const settings = await fastify.db.userAISettings.upsert({
      where: { userId: input.userId },
      update: {
        defaultModelId: input.modelId,
        defaultProviderId: model.providerId,
      },
      create: {
        userId: input.userId,
        defaultModelId: input.modelId,
        defaultProviderId: model.providerId,
      },
    });

    return { success: true, data: settings };
  });

  fastify.post('/ai/test-provider', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['AI Gateway'],
      summary: 'Test a provider/model connection',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const input = testProviderSchema.parse(request.body);
    const result = await gateway.testProvider(input);

    if (result.ok) {
      await fastify.db.providerAPIKey.updateMany({
        where: {
          providerId: input.providerId,
          userId: input.userId ?? null,
          isActive: true,
        },
        data: { lastValidatedAt: new Date() },
      });
    }

    return { success: true, data: result };
  });

  fastify.post('/roadmaps/generate', {
    preHandler: requireScope('ai:write'),
    schema: {
      tags: ['Roadmaps'],
      summary: 'Generate a roadmap through the dynamic AI gateway',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const input = generateSchema.parse(request.body);
    const result = await gateway.generateText({
      userId: request.auth?.userId,
      providerId: input.providerId,
      modelId: input.modelId,
      useUserDefaults: input.useUserDefaults,
      operation: 'roadmap.generate',
      system:
        'You generate concise, structured learning roadmaps. Return JSON with title, milestones, and resources.',
      prompt: `Create a practical roadmap for: ${input.topic}`,
    });

    return { success: true, data: result };
  });
}
