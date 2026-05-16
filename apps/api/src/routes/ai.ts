import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin, requireScope } from '../middleware/auth';
import { AIGatewayService } from '../services/ai-gateway-service';
import { AIProviderFactory } from '../providers/ai-provider-factory';
import { encryptSecret, decryptSecret } from '../utils/crypto';
import { ApiError } from '../utils/errors';

const providerTypes = [
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
] as const;

const providerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  providerType: z.enum(providerTypes),
  baseUrl: z.string().url().optional(),
  supportsStreaming: z.boolean().default(true),
  supportsVision: z.boolean().default(false),
  supportsEmbeddings: z.boolean().default(false),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
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
  providerType: z.enum(providerTypes),
  providerId: z.string().optional(),
  apiKey: z.string().min(1),
  keyName: z.string().optional(),
  isDefault: z.boolean().default(false),
});

const validateKeySchema = z.object({
  providerType: z.enum(providerTypes),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
});

const availableModelsSchema = z.object({
  providerType: z.enum(providerTypes),
  keyId: z.string().min(1),
});

const bulkCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  providerType: z.enum(providerTypes),
  keyId: z.string().min(1),
  baseUrl: z.string().url().optional(),
  models: z.array(z.object({
    modelName: z.string().min(1),
    displayName: z.string().min(1),
    contextWindow: z.number().int().positive().optional(),
  })).min(1),
});

const defaultProviderSchema = z.object({
  userId: z.string(),
  providerId: z.string(),
  fallbackProviderId: z.string().optional(),
});

const defaultModelSchema = z.object({
  userId: z.string(),
  modelId: z.string(),
});

const testProviderSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
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
    isDefault: { type: 'boolean' },
  },
};

export async function aiRoutes(fastify: FastifyInstance) {
  const gateway = new AIGatewayService(fastify.db, fastify.redis);
  const factory = new AIProviderFactory();

  // ─── KEY VALIDATION ──────────────────────────────────────────────
  fastify.post('/ai/keys/validate', {
    preHandler: requireAdmin,
    schema: {
      tags: ['AI Keys'],
      summary: 'Validate an API key by making a test AI call',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const input = validateKeySchema.parse(request.body);
    const result = await factory.validateKey(
      input.providerType,
      input.apiKey,
      input.baseUrl,
    );

    return { success: true, data: result };
  });

  // ─── NEXT KEY NAME ───────────────────────────────────────────────
  fastify.get('/ai/keys/next-name', {
    preHandler: requireAdmin,
    schema: {
      tags: ['AI Keys'],
      summary: 'Get the next auto-generated key name for a provider type',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const query = z.object({ providerType: z.enum(providerTypes) }).parse(request.query);
    const displayName = factory.getDisplayName(query.providerType);

    const existingKeys = await fastify.db.providerAPIKey.findMany({
      where: { providerType: query.providerType, userId: null },
      select: { keyName: true },
    });

    let counter = 1;
    const existingNames = new Set(existingKeys.map((k) => k.keyName));
    while (existingNames.has(`${displayName} ${counter}`)) {
      counter++;
    }

    return { success: true, data: { name: `${displayName} ${counter}` } };
  });

  // ─── AVAILABLE MODELS (from provider API) ────────────────────────
  fastify.post('/ai/available-models', {
    preHandler: requireAdmin,
    schema: {
      tags: ['AI Models'],
      summary: 'Fetch available models from a provider using a stored key',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const input = availableModelsSchema.parse(request.body);

    const keyRecord = await fastify.db.providerAPIKey.findUnique({
      where: { id: input.keyId },
    });

    if (!keyRecord || !keyRecord.isActive) {
      throw new ApiError(404, 'KEY_NOT_FOUND', 'API key not found or inactive');
    }

    const apiKey = decryptSecret(keyRecord.encryptedKey);
    const models = await factory.listAvailableModels(
      input.providerType,
      apiKey,
    );

    return { success: true, data: models };
  });

  // ─── BULK CREATE INTEGRATION ─────────────────────────────────────
  fastify.post('/ai/integrations', {
    preHandler: requireAdmin,
    schema: {
      tags: ['AI Providers'],
      summary: 'Create a provider integration with selected models in one step',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const input = bulkCreateSchema.parse(request.body);

    const keyRecord = await fastify.db.providerAPIKey.findUnique({
      where: { id: input.keyId },
    });

    if (!keyRecord || !keyRecord.isActive) {
      throw new ApiError(404, 'KEY_NOT_FOUND', 'API key not found or inactive');
    }

    const provider = await fastify.db.aIProvider.create({
      data: {
        name: input.name,
        slug: input.slug,
        providerType: input.providerType,
        baseUrl: input.baseUrl,
        enabled: true,
        isDefault: false,
      },
    });

    // Link the key to this provider
    await fastify.db.providerAPIKey.update({
      where: { id: input.keyId },
      data: { providerId: provider.id },
    });

    // Create all selected models
    await fastify.db.aIModel.createMany({
      data: input.models.map((m) => ({
        providerId: provider.id,
        modelName: m.modelName,
        displayName: m.displayName,
        contextWindow: m.contextWindow,
        enabled: true,
      })),
    });

    const full = await fastify.db.aIProvider.findUnique({
      where: { id: provider.id },
      include: { models: true },
    });

    await gateway.invalidateProviderCache(provider.id);
    reply.status(201);

    return { success: true, data: full };
  });

  // ─── PROVIDERS CRUD ──────────────────────────────────────────────
  fastify.post('/ai/providers', {
    preHandler: requireAdmin,
    schema: {
      tags: ['AI Providers'],
      summary: 'Register a dynamic AI provider',
      security: [{ bearerAuth: [] }],
      body: providerBodyJsonSchema,
    },
  }, async (request, reply) => {
    const input = providerSchema.parse(request.body);
    if (input.isDefault) {
      await fastify.db.aIProvider.updateMany({ data: { isDefault: false } });
    }

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
      include: { models: true, apiKeys: { where: { isActive: true }, select: { id: true, keyName: true, providerType: true, isDefault: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, data: providers };
  });

  fastify.patch('/ai/providers/:id', {
    preHandler: requireAdmin,
    schema: {
      tags: ['AI Providers'],
      summary: 'Update an AI provider',
      security: [{ bearerAuth: [] }],
      body: { ...providerBodyJsonSchema, required: [] },
    },
  }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const input = providerSchema.partial().parse(request.body);
    if (input.isDefault) {
      await fastify.db.aIProvider.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    const provider = await fastify.db.aIProvider.update({
      where: { id },
      data: input,
    });
    await gateway.invalidateProviderCache(id);

    return { success: true, data: provider };
  });

  fastify.delete('/ai/providers/:id', {
    preHandler: requireAdmin,
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

  // ─── MODELS ──────────────────────────────────────────────────────
  fastify.post('/ai/models', {
    preHandler: requireAdmin,
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

  // ─── KEYS CRUD ───────────────────────────────────────────────────
  fastify.post('/ai/keys', {
    preHandler: requireAdmin,
    schema: {
      tags: ['AI Keys'],
      summary: 'Store an encrypted provider API key',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const input = keySchema.parse(request.body);

    // Auto-generate key name if not provided
    let keyName = input.keyName;
    if (!keyName) {
      const displayName = factory.getDisplayName(input.providerType);
      const existingKeys = await fastify.db.providerAPIKey.findMany({
        where: { providerType: input.providerType, userId: null },
        select: { keyName: true },
      });
      let counter = 1;
      const existingNames = new Set(existingKeys.map((k) => k.keyName));
      while (existingNames.has(`${displayName} ${counter}`)) {
        counter++;
      }
      keyName = `${displayName} ${counter}`;
    }

    if (input.isDefault) {
      await fastify.db.providerAPIKey.updateMany({
        where: {
          providerType: input.providerType,
          userId: null,
        },
        data: { isDefault: false },
      });
    }

    const key = await fastify.db.providerAPIKey.create({
      data: {
        providerType: input.providerType,
        providerId: input.providerId ?? null,
        userId: null,
        encryptedKey: encryptSecret(input.apiKey),
        keyName,
        isDefault: input.isDefault,
        lastValidatedAt: new Date(),
      },
      select: {
        id: true,
        providerType: true,
        providerId: true,
        keyName: true,
        isDefault: true,
        isActive: true,
        lastValidatedAt: true,
        createdAt: true,
      },
    });

    if (input.providerId) {
      await gateway.invalidateProviderCache(input.providerId);
    }
    reply.status(201);

    return { success: true, data: key };
  });

  fastify.get('/ai/keys', {
    preHandler: requireAdmin,
    schema: {
      tags: ['AI Keys'],
      summary: 'List provider API key metadata',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const query = z
      .object({ providerId: z.string().optional(), providerType: z.string().optional() })
      .parse(request.query);
    const keys = await fastify.db.providerAPIKey.findMany({
      where: {
        providerId: query.providerId || undefined,
        providerType: query.providerType as typeof providerTypes[number] | undefined,
        userId: null,
      },
      select: {
        id: true,
        providerType: true,
        providerId: true,
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
    preHandler: requireAdmin,
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
    if (key.providerId) {
      await gateway.invalidateProviderCache(key.providerId);
    }

    return { success: true };
  });

  // ─── AI SETTINGS ─────────────────────────────────────────────────
  fastify.post('/ai/default-provider', {
    preHandler: requireAdmin,
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
        useOwnKeys: false,
      },
      create: {
        userId: input.userId,
        defaultProviderId: input.providerId,
        fallbackProviderId: input.fallbackProviderId,
        useOwnKeys: false,
      },
    });

    return { success: true, data: settings };
  });

  fastify.post('/ai/default-model', {
    preHandler: requireAdmin,
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

  // ─── TEST PROVIDER ───────────────────────────────────────────────
  fastify.post('/ai/test-provider', {
    preHandler: requireAdmin,
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
          userId: null,
          isActive: true,
        },
        data: { lastValidatedAt: new Date() },
      });
    }

    return { success: true, data: result };
  });

}
