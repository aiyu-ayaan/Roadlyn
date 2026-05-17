import { PrismaClient } from '@prisma/client';
import { FastifyRedisClient } from '../config/redis';
import { decryptSecret } from '../utils/crypto';

export class RoadmapEmbeddingService {
  constructor(
    private readonly db: PrismaClient,
    private readonly redis: FastifyRedisClient,
  ) {}

  async embedSearchText(text: string): Promise<number[]> {
    const cacheKey = `roadmap:embedding:${hashText(text)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as number[];
    }

    const provider = await this.db.aIProvider.findFirst({
      where: {
        enabled: true,
        supportsEmbeddings: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    if (!provider) {
      return [];
    }

    const apiKey = await this.db.providerAPIKey.findFirst({
      where: {
        providerId: provider.id,
        userId: null,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    if (!apiKey && provider.providerType !== 'OLLAMA') {
      return [];
    }

    const embedding = await this.requestEmbedding(
      provider.providerType,
      provider.baseUrl,
      apiKey ? decryptSecret(apiKey.encryptedKey) : undefined,
      text,
    );

    if (embedding.length > 0) {
      await this.redis.set(cacheKey, JSON.stringify(embedding), { EX: 86400 });
    }

    return embedding;
  }

  private async requestEmbedding(
    providerType: string,
    baseUrl: string | null,
    apiKey: string | undefined,
    text: string,
  ) {
    if (providerType === 'OPENAI' || providerType === 'CUSTOM_OPENAI_COMPATIBLE') {
      const url = `${(baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/embeddings`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.slice(0, 8000),
        }),
      });

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };

      return payload.data?.[0]?.embedding ?? [];
    }

    return [];
  }
}

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return String(hash);
}
