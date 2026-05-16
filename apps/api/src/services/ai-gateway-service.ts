import { PrismaClient } from '@prisma/client';
import { generateText, streamText } from 'ai';
import { FastifyRedisClient } from '../config/redis';
import { AIProviderFactory } from '../providers/ai-provider-factory';
import { decryptSecret } from '../utils/crypto';
import { ApiError } from '../utils/errors';

interface ResolveInput {
  userId?: string;
  providerId?: string;
  modelId?: string;
  useUserDefaults?: boolean;
}

interface GenerateInput extends ResolveInput {
  prompt: string;
  system?: string;
  operation: string;
}

interface CacheProvider {
  id: string;
  providerType:
    | 'OPENAI'
    | 'ANTHROPIC'
    | 'GEMINI'
    | 'DEEPSEEK'
    | 'GROK'
    | 'MISTRAL'
    | 'TOGETHERAI'
    | 'OPENROUTER'
    | 'OLLAMA'
    | 'CUSTOM_OPENAI_COMPATIBLE';
  baseUrl: string | null;
  model: {
    id: string;
    modelName: string;
    inputPricing: string | null;
    outputPricing: string | null;
  };
  encryptedKey: string | null;
}

export class AIGatewayService {
  private readonly factory = new AIProviderFactory();

  constructor(
    private readonly db: PrismaClient,
    private readonly redis: FastifyRedisClient,
  ) {}

  async generateText(input: GenerateInput): Promise<{
    text: string;
    providerId: string;
    modelId: string;
    usage: unknown;
  }> {
    const resolved = await this.resolveProvider(input);

    try {
      const runtime = await this.factory.create({
        providerType: resolved.providerType,
        baseUrl: resolved.baseUrl,
        apiKey: resolved.encryptedKey
          ? decryptSecret(resolved.encryptedKey)
          : undefined,
        modelName: resolved.model.modelName,
      });

      const result = await generateText({
        model: runtime.model as never,
        system: input.system,
        prompt: input.prompt,
      });

      await this.trackUsage({
        userId: input.userId,
        providerId: resolved.id,
        modelId: resolved.model.id,
        operation: input.operation,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        success: true,
      });

      return {
        text: result.text,
        providerId: resolved.id,
        modelId: resolved.model.id,
        usage: result.usage,
      };
    } catch (error) {
      await this.trackUsage({
        userId: input.userId,
        providerId: resolved.id,
        modelId: resolved.model.id,
        operation: input.operation,
        success: false,
        errorCode: error instanceof Error ? error.name : 'AI_ERROR',
      });

      const fallback = await this.resolveFallback(input, resolved.id);

      if (!fallback) {
        throw error;
      }

      return this.generateText({
        ...input,
        providerId: fallback.id,
        modelId: fallback.model.id,
        useUserDefaults: false,
      });
    }
  }

  async streamText(input: GenerateInput) {
    const resolved = await this.resolveProvider(input);
    const runtime = await this.factory.create({
      providerType: resolved.providerType,
      baseUrl: resolved.baseUrl,
      apiKey: resolved.encryptedKey ? decryptSecret(resolved.encryptedKey) : undefined,
      modelName: resolved.model.modelName,
    });

    return streamText({
      model: runtime.model as never,
      system: input.system,
      prompt: input.prompt,
    });
  }

  async testProvider(input: ResolveInput) {
    const resolved = await this.resolveProvider(input);
    const runtime = await this.factory.create({
      providerType: resolved.providerType,
      baseUrl: resolved.baseUrl,
      apiKey: resolved.encryptedKey ? decryptSecret(resolved.encryptedKey) : undefined,
      modelName: resolved.model.modelName,
    });

    if (runtime.chatCompletionsUrl) {
      const response = await fetch(runtime.chatCompletionsUrl, {
        method: 'POST',
        headers: runtime.headers,
        body: JSON.stringify({
          model: resolved.model.modelName,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 4,
        }),
      });

      return {
        ok: response.ok,
        status: response.status,
        providerId: resolved.id,
        modelId: resolved.model.id,
      };
    }

    const result = await generateText({
      model: runtime.model as never,
      prompt: 'Reply with pong.',
    });

    return {
      ok: Boolean(result.text),
      status: 200,
      providerId: resolved.id,
      modelId: resolved.model.id,
    };
  }

  async invalidateProviderCache(providerId?: string) {
    if (providerId) {
      await this.redis.del(`ai:provider:${providerId}`);
      return;
    }

    const keys = await this.redis.keys('ai:provider:*');

    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  private async resolveProvider(input: ResolveInput): Promise<CacheProvider> {
    const explicitProviderId = input.providerId;
    const explicitModelId = input.modelId;

    if (explicitProviderId && explicitModelId) {
      return this.getProviderConfig(
        explicitProviderId,
        explicitModelId,
      );
    }

    if (input.useUserDefaults && input.userId) {
      const settings = await this.db.userAISettings.findUnique({
        where: { userId: input.userId },
      });

      if (settings?.defaultProviderId && settings.defaultModelId) {
        return this.getProviderConfig(
          settings.defaultProviderId,
          settings.defaultModelId,
        );
      }
    }

    const model = await this.db.aIModel.findFirst({
      where: {
        enabled: true,
        provider: {
          id: explicitProviderId,
          enabled: true,
        },
      },
      orderBy: [
        { provider: { isDefault: 'desc' } },
        { createdAt: 'asc' },
      ],
      include: { provider: true },
    });

    if (!model) {
      throw new ApiError(404, 'AI_MODEL_NOT_FOUND', 'No enabled AI model found');
    }

    return this.getProviderConfig(model.providerId, model.id);
  }

  private async getProviderConfig(
    providerId: string,
    modelId: string,
  ): Promise<CacheProvider> {
    const cacheKey = `ai:provider:${providerId}:${modelId}:global`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as CacheProvider;
    }

    const provider = await this.db.aIProvider.findFirst({
      where: { id: providerId, enabled: true },
      include: {
        models: {
          where: { id: modelId, enabled: true },
          take: 1,
        },
      },
    });

    if (!provider || provider.models.length === 0) {
      throw new ApiError(
        404,
        'AI_PROVIDER_NOT_FOUND',
        'AI provider or model is disabled or missing',
      );
    }

    const apiKey = await this.findApiKey(providerId);

    if (!apiKey && provider.providerType !== 'OLLAMA') {
      throw new ApiError(
        404,
        'AI_PROVIDER_KEY_NOT_FOUND',
        'No active API key found for this provider',
      );
    }

    const model = provider.models[0];
    const payload: CacheProvider = {
      id: provider.id,
      providerType: provider.providerType,
      baseUrl: provider.baseUrl,
      model: {
        id: model.id,
        modelName: model.modelName,
        inputPricing: model.inputPricing?.toString() ?? null,
        outputPricing: model.outputPricing?.toString() ?? null,
      },
      encryptedKey: apiKey?.encryptedKey ?? null,
    };

    await this.redis.set(cacheKey, JSON.stringify(payload), {
      EX: 300,
    });

    return payload;
  }

  private async findApiKey(providerId: string) {
    // First try to find a key directly linked to this provider
    const directKey = await this.db.providerAPIKey.findFirst({
      where: {
        providerId,
        userId: null,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    if (directKey) return directKey;

    // Fallback: find a key matching the provider's type
    const provider = await this.db.aIProvider.findUnique({
      where: { id: providerId },
      select: { providerType: true },
    });

    if (!provider) return null;

    return this.db.providerAPIKey.findFirst({
      where: {
        providerType: provider.providerType,
        userId: null,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async resolveFallback(input: ResolveInput, failedProviderId: string) {
    if (!input.userId) {
      return null;
    }

    const settings = await this.db.userAISettings.findUnique({
      where: { userId: input.userId },
      include: {
        fallbackProvider: {
          include: {
            models: {
              where: { enabled: true },
              take: 1,
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    const fallbackProvider = settings?.fallbackProvider;
    const fallbackModel = fallbackProvider?.models[0];

    if (
      !fallbackProvider ||
      fallbackProvider.id === failedProviderId ||
      !fallbackModel
    ) {
      return null;
    }

    return {
      id: fallbackProvider.id,
      model: {
        id: fallbackModel.id,
      },
    };
  }

  private async trackUsage(input: {
    userId?: string;
    providerId: string;
    modelId?: string;
    operation: string;
    promptTokens?: number;
    completionTokens?: number;
    success: boolean;
    errorCode?: string;
  }) {
    const promptTokens = input.promptTokens ?? 0;
    const completionTokens = input.completionTokens ?? 0;

    await this.db.aITokenUsage.create({
      data: {
        userId: input.userId,
        providerId: input.providerId,
        modelId: input.modelId,
        operation: input.operation,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        success: input.success,
        errorCode: input.errorCode,
      },
    });
  }
}
