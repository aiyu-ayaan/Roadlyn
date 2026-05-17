import { PrismaClient } from '@prisma/client';
import { FastifyRedisClient } from '../config/redis';
import { config } from '../config/env';
import { AIGatewayService } from './ai-gateway-service';
import {
  buildHeuristicMetadata,
  parseMetadataJson,
  RoadmapSearchMetadata,
  SimilarityInput,
} from './roadmap-search-utils';

interface CheapModelRef {
  providerId: string;
  modelId: string;
}

export class RoadmapMetadataService {
  constructor(
    private readonly db: PrismaClient,
    private readonly redis: FastifyRedisClient,
    private readonly gateway: AIGatewayService,
  ) {}

  async generateMetadata(
    userId: string | undefined,
    input: SimilarityInput,
  ): Promise<RoadmapSearchMetadata> {
    const cacheKey = `roadmap:metadata:${JSON.stringify({
      topic: input.topic,
      experienceLevel: input.experienceLevel ?? '',
      goal: input.goal ?? '',
      weeklyHours: input.weeklyHours ?? '',
    })}`;

    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as RoadmapSearchMetadata;
    }

    const cheapModel = await this.resolveCheapModel();

    if (!cheapModel) {
      const fallback = buildHeuristicMetadata(input);
      await this.redis.set(cacheKey, JSON.stringify(fallback), {
        EX: config.ROADMAP_METADATA_CACHE_TTL_SECONDS,
      });
      return fallback;
    }

    try {
      const result = await this.gateway.generateText({
        userId,
        providerId: cheapModel.providerId,
        modelId: cheapModel.modelId,
        useUserDefaults: false,
        operation: 'roadmap.metadata',
        system: [
          'You generate compact SEO metadata for learning roadmaps.',
          'Use a fast factual style. Do not use chain-of-thought or reasoning tags.',
          'Return strict JSON only.',
        ].join('\n'),
        prompt: JSON.stringify({
          task: 'Generate searchable roadmap metadata',
          topic: input.topic,
          experienceLevel: input.experienceLevel,
          goal: input.goal,
          weeklyHours: input.weeklyHours,
          requiredOutput: {
            title: 'Unique SEO-friendly course title',
            slug: 'url-safe-slug',
            searchableKeywords: ['normalized keyword'],
            semanticTags: ['topic tag'],
            searchPhrases: ['semantic search phrase'],
          },
          example: {
            inputTopic: 'react',
            title: 'Modern React Frontend Engineering Roadmap 2026',
            slug: 'modern-react-frontend-engineering-roadmap-2026',
            searchableKeywords: ['react', 'frontend', 'hooks', 'typescript'],
            semanticTags: ['react', 'web-development', 'frontend'],
            searchPhrases: [
              'learn react from scratch',
              'react developer roadmap',
              'modern react course path',
            ],
          },
        }),
      });

      const metadata = parseMetadataJson(extractJsonPayload(result.text), input);
      await this.redis.set(cacheKey, JSON.stringify(metadata), {
        EX: config.ROADMAP_METADATA_CACHE_TTL_SECONDS,
      });
      return metadata;
    } catch {
      const fallback = buildHeuristicMetadata(input);
      await this.redis.set(cacheKey, JSON.stringify(fallback), {
        EX: config.ROADMAP_METADATA_CACHE_TTL_SECONDS,
      });
      return fallback;
    }
  }

  private async resolveCheapModel(): Promise<CheapModelRef | null> {
    const model = await this.db.aIModel.findFirst({
      where: {
        enabled: true,
        supportsReasoning: false,
        provider: {
          enabled: true,
        },
      },
      orderBy: [{ inputPricing: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        providerId: true,
      },
    });

    if (!model) {
      return null;
    }

    return {
      providerId: model.providerId,
      modelId: model.id,
    };
  }
}

function extractJsonPayload(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}
