import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { requireScope } from '../middleware/auth';
import { AIGatewayService } from '../services/ai-gateway-service';
import { RoadmapEmbeddingService } from '../services/roadmap-embedding-service';
import { RoadmapMetadataService } from '../services/roadmap-metadata-service';
import {
  backfillPublicRoadmapSearchIndex,
  persistRoadmapSearchMetadata,
  RoadmapSimilarityService,
} from '../services/roadmap-similarity-service';
import {
  buildHeuristicMetadata,
  buildSearchVector,
  normalizeSearchTerm,
} from '../services/roadmap-search-utils';
import { ResearchResource, researchLearningResources } from '../services/web-research-service';
import { ApiError } from '../utils/errors';

const similarityInputSchema = z.object({
  topic: z.string().min(1),
  experienceLevel: z.string().optional(),
  goal: z.string().optional(),
  weeklyHours: z.number().int().positive().max(80).optional(),
});

const generateSchema = similarityInputSchema.extend({
  moduleCount: z.number().int().min(4).max(6).default(6),
  courseDepth: z.enum(['standard', 'full-length', 'masterclass']).default('masterclass'),
  careerGoal: z.string().optional(),
  industryContext: z.string().optional(),
  generationOptions: z
    .object({
      liveSearch: z.boolean().default(true),
      youtubeVideos: z.boolean().default(true),
      githubRepos: z.boolean().default(true),
      officialDocs: z.boolean().default(true),
      projects: z.boolean().default(true),
      quizzes: z.boolean().default(true),
      interviewPrep: z.boolean().default(true),
      summaries: z.boolean().default(true),
      certifications: z.boolean().default(true),
    })
    .default({}),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  useUserDefaults: z.boolean().default(false),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).default('PRIVATE'),
  forceRegenerate: z.boolean().default(false),
});

const checkSimilarSchema = similarityInputSchema;

const visibilityUpdateSchema = z.object({
  visibility: z.enum(['PRIVATE', 'PUBLIC']),
});

type GenerateInput = z.infer<typeof generateSchema>;
type AIGenerateResult = Awaited<ReturnType<AIGatewayService['generateText']>>;
type ResourceKind = ResearchResource['kind'];

interface PhaseResourceState {
  usedKeys: Set<string>;
  cursors: Record<ResourceKind, number>;
}

interface AgentCourseBundle {
  curriculum: unknown;
  portfolio: unknown;
  sme?: unknown;
  result: AIGenerateResult;
}

const DEFAULT_GENERATION_OPTIONS: GenerateInput['generationOptions'] = {
  liveSearch: true,
  youtubeVideos: true,
  githubRepos: true,
  officialDocs: true,
  projects: true,
  quizzes: true,
  interviewPrep: true,
  summaries: true,
  certifications: true,
};

interface RoadmapRecord {
  id: string;
  userId: string;
  title: string;
  topic: string | null;
  experienceLevel: string | null;
  goal: string | null;
  weeklyHours: number | null;
  status: string;
  progress: number;
  generatedCourse: unknown;
  researchedResources: unknown;
  providerId: string | null;
  modelId: string | null;
  visibility: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  enrollmentCount?: number;
  isEnrolled?: boolean;
  source?: 'generated' | 'enrolled';
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function roadmapRoutes(fastify: FastifyInstance) {
  const gateway = new AIGatewayService(fastify.db, fastify.redis);
  const metadataService = new RoadmapMetadataService(fastify.db, fastify.redis, gateway);
  const similarityService = new RoadmapSimilarityService(
    fastify.db,
    metadataService,
    fastify.redis,
  );
  const embeddingService = new RoadmapEmbeddingService(fastify.db, fastify.redis);

  fastify.get(
    '/roadmaps',
    {
      preHandler: requireScope('ai:read'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'List roadmaps for the authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      if (!request.auth?.userId) {
        return { success: true, data: [] };
      }

      const roadmaps = await fastify.db.$queryRawUnsafe<RoadmapRecord[]>(
        `SELECT
         r."id", r."title", r."topic", r."status", r."progress", r."visibility",
         r."errorMessage", r."completedAt", r."createdAt", r."updatedAt",
         COALESCE(enrollment_counts."count", 0)::int AS "enrollmentCount",
         'generated' AS "source",
         u."name" AS "ownerName",
         u."email" AS "ownerEmail"
       FROM "Roadmap" r
       JOIN "User" u ON u."id" = r."userId"
       LEFT JOIN (
         SELECT "roadmapId", COUNT(*) AS "count"
         FROM "RoadmapEnrollment"
         GROUP BY "roadmapId"
       ) enrollment_counts ON enrollment_counts."roadmapId" = r."id"
       WHERE r."userId" = $1
       UNION ALL
       SELECT
         r."id", r."title", r."topic", r."status", r."progress", r."visibility",
         r."errorMessage", r."completedAt", e."createdAt", r."updatedAt",
         COALESCE(enrollment_counts."count", 0)::int AS "enrollmentCount",
         'enrolled' AS "source",
         u."name" AS "ownerName",
         u."email" AS "ownerEmail"
       FROM "RoadmapEnrollment" e
       JOIN "Roadmap" r ON r."id" = e."roadmapId"
       JOIN "User" u ON u."id" = r."userId"
       LEFT JOIN (
         SELECT "roadmapId", COUNT(*) AS "count"
         FROM "RoadmapEnrollment"
         GROUP BY "roadmapId"
       ) enrollment_counts ON enrollment_counts."roadmapId" = r."id"
       WHERE e."userId" = $1 AND r."userId" <> $1
       ORDER BY "updatedAt" DESC`,
        request.auth.userId
      );

      return { success: true, data: roadmaps };
    }
  );

  fastify.get(
    '/roadmaps/:id',
    {
      preHandler: requireScope('ai:read'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'Get a generated roadmap course',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      if (!request.auth?.userId) {
        throw new ApiError(403, 'USER_SESSION_REQUIRED', 'Roadmap details require a user session');
      }

      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const [roadmap] = await fastify.db.$queryRawUnsafe<RoadmapRecord[]>(
        `SELECT
         r.*,
         u."name" AS "ownerName",
         u."email" AS "ownerEmail",
         COALESCE(enrollment_counts."count", 0)::int AS "enrollmentCount",
         EXISTS (
           SELECT 1 FROM "RoadmapEnrollment" e
           WHERE e."roadmapId" = r."id" AND e."userId" = $2
         ) AS "isEnrolled",
         CASE WHEN r."userId" = $2 THEN 'generated' ELSE 'enrolled' END AS "source"
       FROM "Roadmap" r
       JOIN "User" u ON u."id" = r."userId"
       LEFT JOIN (
         SELECT "roadmapId", COUNT(*) AS "count"
         FROM "RoadmapEnrollment"
         GROUP BY "roadmapId"
       ) enrollment_counts ON enrollment_counts."roadmapId" = r."id"
       WHERE r."id" = $1
         AND (
           r."userId" = $2
           OR r."visibility" = 'PUBLIC'
           OR EXISTS (
             SELECT 1 FROM "RoadmapEnrollment" e
             WHERE e."roadmapId" = r."id" AND e."userId" = $2
           )
         )
       LIMIT 1`,
        params.id,
        request.auth.userId
      );

      if (!roadmap) {
        throw new ApiError(404, 'ROADMAP_NOT_FOUND', 'Roadmap not found');
      }

      if (
        roadmap.status === 'FAILED' &&
        !roadmap.generatedCourse &&
        Array.isArray(roadmap.researchedResources)
      ) {
        const fallbackCourse = buildFallbackCourse(
          {
            topic: roadmap.topic ?? roadmap.title,
            experienceLevel: roadmap.experienceLevel ?? undefined,
            goal: roadmap.goal ?? undefined,
            weeklyHours: roadmap.weeklyHours ?? undefined,
            moduleCount: 6,
            courseDepth: 'masterclass',
            generationOptions: DEFAULT_GENERATION_OPTIONS,
            useUserDefaults: true,
            visibility: roadmap.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
            forceRegenerate: false,
          },
          roadmap.researchedResources as ResearchResource[]
        );

        await updateRoadmapJob(fastify, roadmap.id, {
          title: fallbackCourse.title,
          status: 'COMPLETED',
          progress: 100,
          generatedCourse: fallbackCourse,
          errorMessage: roadmap.errorMessage
            ? `AI provider failed earlier, so Roadlyn recovered this course from scraped research: ${roadmap.errorMessage}`
            : 'AI provider failed earlier, so Roadlyn recovered this course from scraped research.',
          completedAt: new Date(),
        });

        return {
          success: true,
          data: {
            ...roadmap,
            title: fallbackCourse.title,
            status: 'COMPLETED',
            progress: 100,
            generatedCourse: fallbackCourse,
            errorMessage: roadmap.errorMessage
              ? `AI provider failed earlier, so Roadlyn recovered this course from scraped research: ${roadmap.errorMessage}`
              : 'AI provider failed earlier, so Roadlyn recovered this course from scraped research.',
            completedAt: new Date(),
          },
        };
      }

      return { success: true, data: roadmap };
    }
  );

  fastify.delete(
    '/roadmaps/:id',
    {
      preHandler: requireScope('ai:write'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'Delete a generated roadmap',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      if (!request.auth?.userId) {
        throw new ApiError(
          403,
          'USER_SESSION_REQUIRED',
          'Deleting a roadmap requires a user session'
        );
      }

      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const deleted = await fastify.db.roadmap.deleteMany({
        where: {
          id: params.id,
          userId: request.auth.userId,
        },
      });

      if (deleted.count === 0) {
        throw new ApiError(404, 'ROADMAP_NOT_FOUND', 'Roadmap not found');
      }

      return { success: true, data: { id: params.id } };
    }
  );

  fastify.patch(
    '/roadmaps/:id/visibility',
    {
      preHandler: requireScope('ai:write'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'Update roadmap visibility (owner only)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      if (!request.auth?.userId) {
        throw new ApiError(
          403,
          'USER_SESSION_REQUIRED',
          'Updating roadmap visibility requires a user session'
        );
      }

      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const input = visibilityUpdateSchema.parse(request.body);

      const [roadmap] = await fastify.db.$queryRawUnsafe<
        Array<{
          id: string;
          userId: string;
          title: string;
          topic: string | null;
          experienceLevel: string | null;
          goal: string | null;
          weeklyHours: number | null;
          slug: string | null;
          status: string;
        }>
      >(
        `SELECT "id", "userId", "title", "topic", "experienceLevel", "goal", "weeklyHours", "slug", "status"
         FROM "Roadmap"
         WHERE "id" = $1
         LIMIT 1`,
        params.id
      );

      if (!roadmap || roadmap.userId !== request.auth.userId) {
        throw new ApiError(404, 'ROADMAP_NOT_FOUND', 'Roadmap not found');
      }

      if (roadmap.status !== 'COMPLETED') {
        throw new ApiError(
          400,
          'ROADMAP_NOT_READY',
          'Only completed roadmaps can be published or made private'
        );
      }

      if (input.visibility === 'PUBLIC' && !roadmap.slug) {
        const metadata = buildHeuristicMetadata({
          topic: roadmap.topic ?? roadmap.title,
          experienceLevel: roadmap.experienceLevel ?? undefined,
          goal: roadmap.goal ?? undefined,
          weeklyHours: roadmap.weeklyHours ?? undefined,
        });
        const searchVector = buildSearchVector({
          title: roadmap.title,
          topic: roadmap.topic ?? roadmap.title,
          keywords: metadata.searchableKeywords,
          tags: metadata.semanticTags,
          phrases: metadata.searchPhrases,
        });
        const embedding = await embeddingService.embedSearchText(searchVector);

        await fastify.db.$executeRawUnsafe(
          `UPDATE "Roadmap"
           SET "visibility" = 'PUBLIC',
               "slug" = $2,
               "normalizedTitle" = $3,
               "searchableKeywords" = $4::text[],
               "semanticTags" = $5::text[],
               "searchVector" = $6,
               "embedding" = $7::double precision[],
               "generationHash" = $8,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          roadmap.id,
          metadata.slug,
          metadata.normalizedTitle,
          metadata.searchableKeywords,
          metadata.semanticTags,
          searchVector,
          embedding,
          metadata.generationHash
        );
      } else {
        await fastify.db.roadmap.update({
          where: { id: roadmap.id },
          data: {
            visibility: input.visibility,
            slug: input.visibility === 'PUBLIC' ? roadmap.slug : null,
          },
        });
      }

      const [updated] = await fastify.db.$queryRawUnsafe<RoadmapRecord[]>(
        `SELECT
         r."id", r."title", r."topic", r."status", r."progress", r."visibility",
         r."errorMessage", r."completedAt", r."createdAt", r."updatedAt",
         COALESCE(enrollment_counts."count", 0)::int AS "enrollmentCount",
         'generated' AS "source",
         u."name" AS "ownerName",
         u."email" AS "ownerEmail"
       FROM "Roadmap" r
       JOIN "User" u ON u."id" = r."userId"
       LEFT JOIN (
         SELECT "roadmapId", COUNT(*) AS "count"
         FROM "RoadmapEnrollment"
         GROUP BY "roadmapId"
       ) enrollment_counts ON enrollment_counts."roadmapId" = r."id"
       WHERE r."id" = $1`,
        roadmap.id
      );

      return { success: true, data: updated };
    }
  );

  fastify.get(
    '/roadmaps/discover/public',
    {
      preHandler: requireScope('ai:read'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'List public roadmaps available for discovery',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      if (!request.auth?.userId) {
        return { success: true, data: [] };
      }

      const query = z.object({ q: z.string().optional() }).parse(request.query);
      const search = query.q?.trim();
      const roadmaps = await fastify.db.$queryRawUnsafe<RoadmapRecord[]>(
        `SELECT
         r."id", r."title", r."topic", r."status", r."progress", r."visibility",
         r."errorMessage", r."completedAt", r."createdAt", r."updatedAt",
         u."name" AS "ownerName",
         u."email" AS "ownerEmail",
         COALESCE(enrollment_counts."count", 0)::int AS "enrollmentCount",
         EXISTS (
           SELECT 1 FROM "RoadmapEnrollment" e
           WHERE e."roadmapId" = r."id" AND e."userId" = $1
         ) AS "isEnrolled",
         CASE WHEN r."userId" = $1 THEN 'generated' ELSE 'enrolled' END AS "source"
       FROM "Roadmap" r
       JOIN "User" u ON u."id" = r."userId"
       LEFT JOIN (
         SELECT "roadmapId", COUNT(*) AS "count"
         FROM "RoadmapEnrollment"
         GROUP BY "roadmapId"
       ) enrollment_counts ON enrollment_counts."roadmapId" = r."id"
       WHERE r."visibility" = 'PUBLIC'
         AND r."status" = 'COMPLETED'
         AND ($2::text IS NULL OR r."title" ILIKE '%' || $2 || '%' OR r."topic" ILIKE '%' || $2 || '%')
       ORDER BY COALESCE(enrollment_counts."count", 0) DESC, r."updatedAt" DESC
       LIMIT 60`,
        request.auth.userId,
        search ?? null
      );

      return { success: true, data: roadmaps };
    }
  );

  fastify.post(
    '/roadmaps/:id/enroll',
    {
      preHandler: requireScope('ai:read'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'Add a public roadmap to the authenticated user roadmap shelf',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      if (!request.auth?.userId) {
        throw new ApiError(
          403,
          'USER_SESSION_REQUIRED',
          'Adding a roadmap requires a user session'
        );
      }

      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const [roadmap] = await fastify.db.$queryRawUnsafe<
        Array<{ id: string; userId: string; visibility: string }>
      >(
        `SELECT "id", "userId", "visibility"
       FROM "Roadmap"
       WHERE "id" = $1 AND "status" = 'COMPLETED'
       LIMIT 1`,
        params.id
      );

      if (!roadmap || roadmap.visibility !== 'PUBLIC') {
        throw new ApiError(404, 'PUBLIC_ROADMAP_NOT_FOUND', 'Public roadmap not found');
      }

      if (roadmap.userId === request.auth.userId) {
        return {
          success: true,
          data: { roadmapId: params.id, alreadyOwned: true },
        };
      }

      await fastify.db.$executeRawUnsafe(
        `INSERT INTO "RoadmapEnrollment" ("id", "roadmapId", "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT ("roadmapId", "userId") DO UPDATE SET "updatedAt" = NOW()`,
        randomUUID(),
        params.id,
        request.auth.userId
      );

      return { success: true, data: { roadmapId: params.id } };
    }
  );

  fastify.delete(
    '/roadmaps/:id/enroll',
    {
      preHandler: requireScope('ai:read'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'Remove a public roadmap from the authenticated user roadmap shelf',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      if (!request.auth?.userId) {
        throw new ApiError(
          403,
          'USER_SESSION_REQUIRED',
          'Removing a roadmap requires a user session'
        );
      }

      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      await fastify.db.$executeRawUnsafe(
        `DELETE FROM "RoadmapEnrollment" WHERE "roadmapId" = $1 AND "userId" = $2`,
        params.id,
        request.auth.userId
      );

      return { success: true, data: { roadmapId: params.id } };
    }
  );

  fastify.get(
    '/roadmaps/resource-preview',
    {
      preHandler: requireScope('ai:read'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'Fetch a static in-app preview for a researched resource',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const query = z.object({ url: z.string().url() }).parse(request.query);
      const preview = await fetchResourcePreview(query.url);

      return { success: true, data: preview };
    }
  );

  fastify.post(
    '/roadmaps/check-similar',
    {
      preHandler: requireScope('ai:read'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'Check for similar public roadmaps before expensive generation',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const input = checkSimilarSchema.parse(request.body);
      const result = await similarityService.checkSimilarity(request.auth?.userId, input);

      return {
        success: true,
        data: {
          metadata: result.metadata,
          existingRoadmaps: result.existingRoadmaps,
          shouldGenerateNewRoadmap: result.shouldGenerateNewRoadmap,
          similarityThreshold: result.similarityThreshold,
        },
      };
    }
  );

  fastify.post(
    '/roadmaps/backfill-search-index',
    {
      preHandler: requireScope('ai:write'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'Backfill search metadata for public roadmaps missing indexes',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const body = z.object({ limit: z.number().int().min(1).max(500).default(50) }).parse(
        request.body ?? {}
      );
      const rows = await backfillPublicRoadmapSearchIndex(fastify.db, body.limit);
      let updated = 0;

      for (const row of rows) {
        const metadata = buildHeuristicMetadata({
          topic: row.topic ?? row.title,
          experienceLevel: row.experienceLevel ?? undefined,
          goal: row.goal ?? undefined,
          weeklyHours: row.weeklyHours ?? undefined,
        });
        const embedding = await embeddingService.embedSearchText(metadata.searchVector);
        await persistRoadmapSearchMetadata(fastify.db, row.id, metadata, embedding);
        updated += 1;
      }

      return {
        success: true,
        data: {
          scanned: rows.length,
          updated,
        },
      };
    }
  );

  fastify.post(
    '/roadmaps/generate',
    {
      preHandler: requireScope('ai:write'),
      schema: {
        tags: ['Roadmaps'],
        summary: 'Generate a roadmap from live web research through the dynamic AI gateway',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      if (!request.auth?.userId) {
        throw new ApiError(
          403,
          'USER_SESSION_REQUIRED',
          'Background roadmap generation requires a user session'
        );
      }

      const input = generateSchema.parse(request.body);

      const similarity = await similarityService.checkSimilarity(
        request.auth.userId,
        input
      );

      if (!input.forceRegenerate && !similarity.shouldGenerateNewRoadmap) {
        return {
          success: true,
          data: {
            existingRoadmaps: similarity.existingRoadmaps,
            shouldGenerateNewRoadmap: false,
            metadata: similarity.metadata,
            similarityThreshold: similarity.similarityThreshold,
          },
        };
      }

      await assertCanGenerateRoadmap(fastify, request.auth.userId);

      const metadata = similarity.metadata;
      const embedding = await embeddingService.embedSearchText(metadata.searchVector);
      const roadmapId = randomUUID();
      const [roadmap] = await fastify.db.$queryRawUnsafe<RoadmapRecord[]>(
        `INSERT INTO "Roadmap"
        ("id", "userId", "title", "topic", "experienceLevel", "goal", "weeklyHours", "status", "progress", "providerId", "modelId", "visibility", "slug", "normalizedTitle", "searchableKeywords", "semanticTags", "searchVector", "embedding", "generationHash", "createdAt", "updatedAt")
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, 'QUEUED', 5, $8, $9, $10, $11, $12, $13::text[], $14::text[], $15, $16::double precision[], $17, NOW(), NOW())
       RETURNING "id", "title", "topic", "status", "progress", "visibility", "createdAt", "updatedAt"`,
        roadmapId,
        request.auth.userId,
        metadata.title,
        input.topic,
        input.experienceLevel ?? null,
        input.goal ?? null,
        input.weeklyHours ?? null,
        input.providerId ?? null,
        input.modelId ?? null,
        input.visibility,
        input.visibility === 'PUBLIC' ? metadata.slug : null,
        metadata.normalizedTitle,
        metadata.searchableKeywords,
        metadata.semanticTags,
        metadata.searchVector,
        embedding,
        metadata.generationHash
      );

      void runRoadmapGenerationJob({
        fastify,
        gateway,
        embeddingService,
        roadmapId: roadmap.id,
        userId: request.auth.userId,
        input,
        metadata,
      });

      return {
        success: true,
        data: {
          roadmapId: roadmap.id,
          roadmap,
          status: roadmap.status,
          shouldGenerateNewRoadmap: true,
          metadata,
        },
      };
    }
  );
}

async function runRoadmapGenerationJob(input: {
  fastify: FastifyInstance;
  gateway: AIGatewayService;
  embeddingService: RoadmapEmbeddingService;
  roadmapId: string;
  userId: string;
  input: GenerateInput;
  metadata: Awaited<ReturnType<RoadmapMetadataService['generateMetadata']>>;
}) {
  const { fastify, gateway, embeddingService, roadmapId, userId, metadata } = input;

  try {
    await updateRoadmapJob(fastify, roadmapId, {
      status: 'RUNNING',
      progress: 15,
    });

    const researchedResources = await researchLearningResources({
      topic: input.input.topic,
      experienceLevel: input.input.experienceLevel,
      goal: input.input.goal,
    });

    await updateRoadmapJob(fastify, roadmapId, {
      researchedResources,
      progress: 45,
    });

    let aiError: unknown;
    const agentBundle = await generateCourseWithAgents({
      gateway,
      userId,
      input: input.input,
      researchedResources,
    }).catch((error: unknown) => {
      aiError = error;
      return null;
    });
    const course = agentBundle
      ? normalizeGeneratedCourse(
          composeCourseFromAgentBundle(agentBundle),
          input.input,
          researchedResources
        )
      : buildFallbackCourse(input.input, researchedResources);

    const completedTitle =
      typeof course.title === 'string' && course.title.trim() ? course.title : metadata.title;
    const completedMetadata = {
      ...metadata,
      title: completedTitle,
      normalizedTitle: normalizeSearchTerm(completedTitle),
      searchVector: buildSearchVector({
        title: completedTitle,
        topic: input.input.topic,
        keywords: metadata.searchableKeywords,
        tags: metadata.semanticTags,
        phrases: metadata.searchPhrases,
      }),
    };
    const embedding = await embeddingService.embedSearchText(completedMetadata.searchVector);

    await updateRoadmapJob(fastify, roadmapId, {
      title: completedMetadata.title,
      status: 'COMPLETED',
      progress: 100,
      generatedCourse: course,
      researchedResources,
      providerId: agentBundle?.result.providerId,
      modelId: agentBundle?.result.modelId,
      errorMessage: aiError
        ? `AI provider was temporarily unavailable, so Roadlyn generated this course from scraped research: ${getErrorMessage(aiError)}`
        : undefined,
      completedAt: new Date(),
    });

    await persistRoadmapSearchMetadata(
      fastify.db,
      roadmapId,
      completedMetadata,
      embedding
    );
  } catch (error) {
    await updateRoadmapJob(fastify, roadmapId, {
      status: 'FAILED',
      progress: 100,
      errorMessage: error instanceof Error ? error.message : 'Roadmap generation failed',
    });

    fastify.log.error(error);
  }
}

async function assertCanGenerateRoadmap(fastify: FastifyInstance, userId: string) {
  const [policy] = await fastify.db.$queryRawUnsafe<
    Array<{
      isDemo: boolean;
      maxGenerations: number | null;
      generationCooldownSeconds: number;
      unlimitedGenerations: boolean;
      noGenerationCooldown: boolean;
      lastGenerationAt: Date | null;
      generatedCount: number;
    }>
  >(
    `SELECT
       u."isDemo",
       u."maxGenerations",
       u."generationCooldownSeconds",
       u."unlimitedGenerations",
       u."noGenerationCooldown",
       u."lastGenerationAt",
       COUNT(r."id")::int AS "generatedCount"
     FROM "User" u
     LEFT JOIN "Roadmap" r ON r."userId" = u."id"
     WHERE u."id" = $1
     GROUP BY u."id"`,
    userId
  );

  if (!policy) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (policy.isDemo) {
    throw new ApiError(403, 'DEMO_AI_DISABLED', 'AI generation is disabled in demo sessions');
  }

  if (
    !policy.unlimitedGenerations &&
    policy.maxGenerations !== null &&
    policy.generatedCount >= policy.maxGenerations
  ) {
    throw new ApiError(
      429,
      'GENERATION_LIMIT_REACHED',
      'You have reached your roadmap generation limit'
    );
  }

  if (
    !policy.noGenerationCooldown &&
    policy.generationCooldownSeconds > 0 &&
    policy.lastGenerationAt
  ) {
    const cooldownEndsAt =
      policy.lastGenerationAt.getTime() + policy.generationCooldownSeconds * 1000;
    const remainingMs = cooldownEndsAt - Date.now();

    if (remainingMs > 0) {
      throw new ApiError(
        429,
        'GENERATION_COOLDOWN_ACTIVE',
        `Please wait ${Math.ceil(remainingMs / 1000)} seconds before generating another roadmap`
      );
    }
  }

  await fastify.db.$executeRawUnsafe(
    `UPDATE "User" SET "lastGenerationAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1`,
    userId
  );
}

async function generateCourseWithAgents(input: {
  gateway: AIGatewayService;
  userId: string;
  input: GenerateInput;
  researchedResources: ResearchResource[];
}): Promise<AgentCourseBundle> {
  // Stage 1: Curriculum Architect
  const curriculum = await generateAgentWithRetries({
    ...input,
    operation: 'roadmap.agent.curriculum',
    prompt: buildCurriculumAgentPrompt(input.input, input.researchedResources),
  });
  const curriculumJson = extractJson(curriculum.text);

  // Stage 2: Portfolio & Lab Engineer (Chained context!)
  const portfolio = await generateAgentWithRetries({
    ...input,
    operation: 'roadmap.agent.portfolio',
    prompt: buildPortfolioAgentPrompt(input.input, input.researchedResources, curriculumJson),
  });
  const portfolioJson = extractJson(portfolio.text);

  // Stage 3: SME Detailed Content Writer (Chained context!)
  const sme = await generateAgentWithRetries({
    ...input,
    operation: 'roadmap.agent.sme',
    prompt: buildSMEWriterPrompt(input.input, input.researchedResources, curriculumJson),
  });
  const smeJson = extractJson(sme.text);

  // Stage 4: QA/Review Agent (Validate and integrate final bundle)
  const qa = await generateAgentWithRetries({
    ...input,
    operation: 'roadmap.agent.qa',
    prompt: buildQAReviewPrompt(input.input, curriculumJson, portfolioJson, smeJson),
  });
  const qaJson = extractJson(qa.text);

  return {
    curriculum: qaJson?.curriculum ?? curriculumJson,
    portfolio: qaJson?.portfolio ?? portfolioJson,
    sme: qaJson?.sme ?? smeJson,
    result: curriculum,
  };
}

async function generateAgentWithRetries(input: {
  gateway: AIGatewayService;
  userId: string;
  input: GenerateInput;
  operation: string;
  prompt: string;
}) {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await input.gateway.generateText({
        userId: input.userId,
        providerId: input.input.providerId,
        modelId: input.input.modelId,
        useUserDefaults: input.input.useUserDefaults,
        operation: input.operation,
        system: buildCourseSystemPrompt(),
        prompt: input.prompt,
      });
    } catch (error) {
      lastError = error;

      if (!isRetryableAIError(error) || attempt === maxAttempts) {
        throw error;
      }

      await delay(1500 * attempt);
    }
  }

  throw lastError;
}

function isRetryableAIError(error: unknown) {
  const text = getErrorMessage(error).toLowerCase();
  return (
    text.includes('429') ||
    text.includes('rate limit') ||
    text.includes('rate-limited') ||
    text.includes('temporarily') ||
    text.includes('retry')
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown AI provider error';
  }
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchResourcePreview(url: string) {
  const parsed = parsePreviewUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RoadlynResourcePreview/0.1)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('text/html')) {
      return {
        url: parsed.toString(),
        title: parsed.hostname,
        html: buildPreviewFallbackHtml(
          parsed.toString(),
          'This resource cannot be rendered as a static page preview.'
        ),
      };
    }

    const html = await response.text();
    return {
      url: parsed.toString(),
      title: readHtmlTitle(html) ?? parsed.hostname,
      html: sanitizePreviewHtml(html, parsed),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parsePreviewUrl(url: string) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || isBlockedPreviewHost(parsed.hostname)) {
    throw new ApiError(
      400,
      'RESOURCE_PREVIEW_URL_BLOCKED',
      'This resource URL cannot be previewed'
    );
  }

  return parsed;
}

function isBlockedPreviewHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '127.0.0.1' ||
    host.endsWith('.local') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function sanitizePreviewHtml(html: string, baseUrl: URL) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, '');
  const withBase = withoutScripts.replace(
    /<head([^>]*)>/i,
    `<head$1><base href="${escapeHtml(baseUrl.origin)}">`
  );

  if (withBase !== withoutScripts) {
    return withBase;
  }

  return `<!doctype html><html><head><base href="${escapeHtml(baseUrl.origin)}"></head><body>${withoutScripts}</body></html>`;
}

function readHtmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(stripTags(match[1])).trim() : null;
}

function buildPreviewFallbackHtml(url: string, message: string) {
  return [
    '<!doctype html><html><head><style>',
    'body{font-family:system-ui,sans-serif;background:#0b0f17;color:#d8dee9;margin:0;display:grid;min-height:100vh;place-items:center}',
    'main{max-width:680px;padding:32px;line-height:1.6} code{color:#8ab4ff;word-break:break-all}',
    '</style></head><body><main>',
    `<h1>Static preview unavailable</h1><p>${escapeHtml(message)}</p><p><code>${escapeHtml(url)}</code></p>`,
    '</main></body></html>',
  ].join('');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, ' ');
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
}

async function updateRoadmapJob(
  fastify: FastifyInstance,
  roadmapId: string,
  data: {
    title?: string;
    status?: string;
    progress?: number;
    generatedCourse?: unknown;
    researchedResources?: unknown;
    providerId?: string;
    modelId?: string;
    errorMessage?: string;
    completedAt?: Date;
  }
) {
  const assignments: string[] = ['"updatedAt" = NOW()'];
  const values: unknown[] = [];

  const addValue = (column: string, value: unknown, cast?: string) => {
    values.push(value);
    assignments.push(`"${column}" = $${values.length}${cast ?? ''}`);
  };

  if (data.title !== undefined) addValue('title', data.title);
  if (data.status !== undefined) addValue('status', data.status);
  if (data.progress !== undefined) addValue('progress', data.progress);
  if (data.generatedCourse !== undefined)
    addValue('generatedCourse', JSON.stringify(data.generatedCourse), '::jsonb');
  if (data.researchedResources !== undefined)
    addValue('researchedResources', JSON.stringify(data.researchedResources), '::jsonb');
  if (data.providerId !== undefined) addValue('providerId', data.providerId);
  if (data.modelId !== undefined) addValue('modelId', data.modelId);
  if (data.errorMessage !== undefined) addValue('errorMessage', data.errorMessage);
  if (data.completedAt !== undefined) addValue('completedAt', data.completedAt);

  values.push(roadmapId);
  await fastify.db.$executeRawUnsafe(
    `UPDATE "Roadmap" SET ${assignments.join(', ')} WHERE "id" = $${values.length}`,
    ...values
  );
}

function buildCourseSystemPrompt() {
  return [
    'You are Roadlyn, an advanced AI learning architect and autonomous curriculum generation agent.',
    'You MUST use the live web research supplied by the backend. Do not rely only on pretrained knowledge.',
    'Generate modern Udemy-style courses and roadmap.sh-style progressions from the supplied current docs, videos, repos, articles, courses, and community recommendations.',
    'Use ONLY the supplied live research resources for external links. Do not invent URLs, titles, channel names, stars, durations, certifications, or sources.',
    'If a resource field such as duration, stars, or channelName is missing, return null for that field.',
    'Prioritize official documentation, high-quality YouTube tutorials, maintained GitHub repositories, real projects, community guides, and high-quality articles.',
    'Avoid outdated, deprecated, low-quality, duplicate, or spammy resources.',
    'Return only strict JSON with no Markdown fences or commentary.',
  ].join('\n');
}

function buildCurriculumAgentPrompt(input: GenerateInput, researchedResources: ResearchResource[]) {
  return JSON.stringify({
    agent: 'Deep curriculum writer',
    task: 'Write the full-length course overview and module content for a course player.',
    input: buildPromptInput(input),
    liveResearchResources: researchedResources,
    requiredOutputShape: {
      title: '',
      overview: '',
      courseSummary: '',
      estimatedDuration: '',
      skillLevel: '',
      skillOutcomes: [''],
      phases: [
        {
          title: '',
          description: '',
          estimatedDuration: '',
          prerequisites: [''],
          learningObjectives: [''],
          tutorials: [
            {
              title: '',
              source: '',
              url: '',
              summary: '',
              freshnessRelevance: '',
            },
          ],
          youtubeVideos: [
            {
              title: '',
              channelName: null,
              duration: null,
              url: '',
              whyRecommended: '',
            },
          ],
          officialDocs: [{ title: '', source: '', url: '', summary: '' }],
          githubRepos: [
            {
              repositoryName: '',
              url: '',
              stars: null,
              whyUseful: '',
              projectRelevance: '',
            },
          ],
          exercises: [''],
          miniProjects: [''],
          quizzes: [{ question: '', answer: '' }],
          lessonNotes: [''],
          recap: '',
          difficultyLevel: 'beginner',
        },
      ],
    },
    qualityRules: [
      'Return exactly 4 to 6 phases/modules, matching the outline.',
      'Every module must be detailed: 8-12 lessonNotes, 6-10 learningObjectives, 8-12 exercises, 3-5 miniProjects, and 8-10 quizzes.',
      'Each lessonNotes item must teach a concrete concept in 2-4 sentences, not a heading.',
      'Each exercise must be actionable and specific enough for a learner to complete.',
      'Use ONLY URLs from liveResearchResources. Do not invent links or create search paths or search result pages.',
      'Every module should include at least one youtubeVideos item when YouTube resources exist in liveResearchResources.',
      'Prefer YouTube URLs that can be embedded, official docs, GitHub repos with practical code, and useful articles.',
      'Synthesize and write custom, highly professional, educational summaries for each selected resource specifically explaining why the resource is relevant to this phase and what the learner will gain (e.g. whyRecommended for YouTube, summary for officialDocs/tutorials, and whyUseful/projectRelevance for GitHub). Do not just copy and paste the raw summary; customize it to fit the educational context of the module.',
      'Ensure that resource summaries are thorough (2-3 sentences), highly clear, professional, and explain actionable concepts or APIs found in the resource.',
      'Do not copy Phase 1 resources into Phase 2 or later modules. Resource URLs must be unique across the whole course unless there are not enough live resources.',
      'Avoid repeating the same lesson notes across modules. Each module must teach a distinct part of the topic.',
      'Return strict JSON only.',
    ],
    enabledGenerationTasks: input.generationOptions,
  });
}

function buildPortfolioAgentPrompt(input: GenerateInput, researchedResources: ResearchResource[], curriculumJson: unknown) {
  return JSON.stringify({
    agent: 'Portfolio, assessment, and interview coach',
    task: 'Create the projects, milestones, certifications, interview prep, and recommended tools for the course, aligning them perfectly with the supplied curriculum outline.',
    input: buildPromptInput(input),
    suppliedCurriculumOutline: curriculumJson,
    liveResearchResources: researchedResources,
    requiredOutputShape: {
      projects: [
        {
          title: '',
          level: 'beginner',
          description: '',
          deliverables: [''],
          realWorldScenario: '',
        },
      ],
      resources: researchedResources,
      interviewPrep: [
        {
          topic: '',
          concepts: [''],
          practicalQuestions: [''],
          portfolioSuggestion: '',
        },
      ],
      certifications: [{ title: '', provider: '', url: null, relevance: '' }],
      recommendedTools: [''],
      milestones: [{ week: '', outcome: '', checkpoint: '' }],
    },
    qualityRules: [
      'Create 4-6 substantial projects that map directly to the 4-6 phases of the supplied curriculum outline, including one capstone.',
      'Each project must include 5-8 deliverables and a realistic professional scenario.',
      'Create milestones for the whole full-length course, not just a short crash course.',
      'Create interview prep with 5-8 concepts and 8-12 practical questions per topic.',
      'Use ONLY URLs from liveResearchResources for certifications when a URL is provided.',
      'Select and suggest recommended tools that are modern, widely accepted, and explicitly found in the liveResearchResources or official docs.',
      'Milestones should feel logical, and checkpoints must outline concrete, measurable deliverables corresponding directly to the portfolio projects.',
      'Return strict JSON only.',
    ],
  });
}

function buildSMEWriterPrompt(input: GenerateInput, researchedResources: ResearchResource[], curriculumJson: unknown) {
  const curriculum = asRecord(curriculumJson);
  const phases = Array.isArray(curriculum?.phases) ? curriculum.phases : [];
  const phaseOutlines = phases.map((p, i) => {
    const pRecord = asRecord(p);
    return {
      phaseNumber: i + 1,
      title: typeof pRecord?.title === 'string' ? pRecord.title : `Module ${i + 1}`,
      description: typeof pRecord?.description === 'string' ? pRecord.description : '',
    };
  });

  return JSON.stringify({
    agent: 'Subject Matter Expert Content Writer',
    task: 'Generate textbook-grade Study Guides, comprehensive Hands-on Labs with boilerplates, Cheatsheets, and Flashcard sets for each module of the course.',
    input: {
      topic: input.topic,
      experienceLevel: input.experienceLevel || 'beginner',
      careerGoal: input.careerGoal || 'Become practical and job-ready',
      industryContext: input.industryContext || 'General Technology',
    },
    liveResearchResources: researchedResources,
    phaseOutlines,
    requiredOutputShape: {
      phases: phaseOutlines.map((p) => ({
        phaseNumber: p.phaseNumber,
        title: p.title,
        studyGuide: 'Textbook-grade markdown guide explaining the core concepts of this module in detail (at least 400-600 words), using professional developer terminology and explaining syntax/APIs.',
        handsOnLab: 'Step-by-step practical laboratory exercise in markdown. Must include: 1. Setup Instructions, 2. Complete Code Boilerplate Template, 3. Step-by-Step Task Checklist, and 4. Troubleshooting tips. Make the tasks extremely detailed.',
        cheatSheet: 'Quick reference markdown cheat sheet listing important commands, configuration options, key design constraints, and quick tips for this module.',
        flashcards: [
          {
            front: 'Concept question or code snippet prompt (e.g., "What is the Big-O complexity of X?")',
            back: 'Concise explanation or correct code snippet (e.g., "O(1) because...")',
          },
        ],
      })),
    },
    qualityRules: [
      'Every studyGuide, handsOnLab, and cheatSheet must contain actual complete markdown formatting (headings, code blocks, bold text, bullet points).',
      'Never write placeholders; placeholders like "todo" or "write code here" are UNACCEPTABLE.',
      'Hands-on labs must include actual, complete code boilerplate templates that are fully functional.',
      'Create exactly 5-8 highly effective flashcards per module.',
      'Incorporate the careerGoal and industryContext parameters directly to make the study guide and labs highly industry-specific.',
      'Return strict JSON only.',
    ],
  });
}

function buildQAReviewPrompt(
  input: GenerateInput,
  curriculumJson: unknown,
  portfolioJson: unknown,
  smeJson: unknown
) {
  return JSON.stringify({
    agent: 'Quality Assurance Review Agent',
    task: 'Verify, format, and synthesize the combined outputs of the previous stages into a unified, high-quality course payload.',
    originalInput: input,
    curriculum: curriculumJson,
    portfolio: portfolioJson,
    sme: smeJson,
    qualityRules: [
      'Validate the structural integrity of the final curriculum, projects, and study guides.',
      'Ensure there are no broken markdown tags or partial JSON objects.',
      'Ensure all resource links map correctly across components.',
      'Output a single unified course structure combining curriculum, portfolio, and SME study guides perfectly.',
      'Return strict JSON only in the following schema: { curriculum: {...}, portfolio: {...}, sme: {...} }.',
    ],
  });
}

function buildPromptInput(input: GenerateInput) {
  return {
    topic: input.topic,
    experienceLevel: input.experienceLevel ?? 'beginner',
    goal: input.goal ?? 'Become practical and job-ready',
    weeklyHours: input.weeklyHours ?? 8,
    targetModuleCount: input.moduleCount,
    courseDepth: input.courseDepth,
    courseDepthInstruction:
      'Write full-length detailed modules with original instructional content, examples, tasks, quizzes, and recaps.',
  };
}

function composeCourseFromAgentBundle(bundle: AgentCourseBundle) {
  const curriculum = asRecord(bundle.curriculum);
  const portfolio = asRecord(bundle.portfolio);
  const sme = asRecord(bundle.sme);

  const rawPhases = curriculum && 'phases' in curriculum && Array.isArray(curriculum.phases) ? curriculum.phases : null;
  let phases = rawPhases;

  if (Array.isArray(rawPhases) && sme && 'phases' in sme && Array.isArray(sme.phases)) {
    phases = rawPhases.map((phase, idx) => {
      const pRecord = asRecord(phase);
      const sRecord = asRecord((sme.phases as unknown[])[idx]);
      if (pRecord && sRecord) {
        return {
          ...pRecord,
          studyGuide: 'studyGuide' in sRecord ? sRecord.studyGuide : undefined,
          handsOnLab: 'handsOnLab' in sRecord ? sRecord.handsOnLab : undefined,
          cheatSheet: 'cheatSheet' in sRecord ? sRecord.cheatSheet : undefined,
          flashcards: 'flashcards' in sRecord ? sRecord.flashcards : undefined,
        };
      }
      return phase;
    });
  }

  return {
    title: curriculum?.title,
    overview: curriculum?.overview,
    courseSummary: curriculum?.courseSummary,
    estimatedDuration: curriculum?.estimatedDuration,
    skillLevel: curriculum?.skillLevel,
    skillOutcomes: curriculum?.skillOutcomes,
    phases,
    projects: portfolio?.projects,
    resources: portfolio?.resources,
    interviewPrep: portfolio?.interviewPrep,
    certifications: portfolio?.certifications,
    recommendedTools: portfolio?.recommendedTools,
    milestones: portfolio?.milestones,
  };
}

function normalizeGeneratedCourse(
  candidate: unknown,
  input: GenerateInput,
  resources: ResearchResource[]
) {
  const fallback = buildFallbackCourse(input, resources);
  const record = asRecord(candidate);

  if (!record) {
    return fallback;
  }

  const resourceState = createPhaseResourceState();
  const phases = recordArray(record.phases)
    .map((phase, index) => normalizePhase(phase, index, input.topic, resources, resourceState))
    .filter(Boolean)
    .slice(0, input.moduleCount);

  if (phases.length < 4) {
    return fallback;
  }

  return {
    title: readString(record.title, fallback.title),
    overview: readString(record.overview, fallback.overview),
    courseSummary: readString(record.courseSummary, fallback.courseSummary),
    estimatedDuration: readString(record.estimatedDuration, fallback.estimatedDuration),
    skillLevel: readString(record.skillLevel, fallback.skillLevel),
    skillOutcomes: stringArray(record.skillOutcomes, fallback.skillOutcomes).slice(0, 12),
    phases,
    projects: recordArray(record.projects).length ? record.projects : fallback.projects,
    resources,
    interviewPrep: recordArray(record.interviewPrep).length
      ? record.interviewPrep
      : fallback.interviewPrep,
    certifications: recordArray(record.certifications).length
      ? record.certifications
      : fallback.certifications,
    recommendedTools: stringArray(record.recommendedTools, fallback.recommendedTools).slice(0, 16),
    milestones: recordArray(record.milestones).length ? record.milestones : fallback.milestones,
    generationMetadata: {
      strategy: 'multi-agent',
      agentPasses: ['curriculum', 'portfolio', 'sme', 'qa'],
      moduleCount: phases.length,
      courseDepth: input.courseDepth,
    },
  };
}

function normalizePhase(
  phase: Record<string, unknown>,
  index: number,
  topic: string,
  resources: ResearchResource[],
  resourceState: PhaseResourceState
) {
  const phaseFallbackResources = selectFallbackPhaseResources(resources, resourceState, false);
  const fallback = buildFallbackPhase(
    `Module ${index + 1}: ${topic} Mastery`,
    `A detailed module for building practical ${topic} capability.`,
    index < 1 ? 'beginner' : index < 4 ? 'intermediate' : 'advanced',
    phaseFallbackResources.officialDocs,
    phaseFallbackResources.youtubeVideos,
    phaseFallbackResources.githubRepos,
    phaseFallbackResources.tutorials
  );
  const officialDocs = recordArray(phase.officialDocs).length
    ? phase.officialDocs
    : fallback.officialDocs;
  const youtubeVideos = recordArray(phase.youtubeVideos).length
    ? phase.youtubeVideos
    : fallback.youtubeVideos;
  const githubRepos = recordArray(phase.githubRepos).length
    ? phase.githubRepos
    : fallback.githubRepos;
  const tutorials = recordArray(phase.tutorials).length ? phase.tutorials : fallback.tutorials;

  return {
    title: readString(phase.title, fallback.title),
    description: readString(phase.description, fallback.description),
    estimatedDuration: readString(phase.estimatedDuration, fallback.estimatedDuration),
    prerequisites: stringArray(phase.prerequisites, fallback.prerequisites).slice(0, 12),
    learningObjectives: stringArray(phase.learningObjectives, fallback.learningObjectives).slice(
      0,
      12
    ),
    tutorials: ensureTutorials(tutorials, resources, resourceState, 6),
    youtubeVideos: ensureYouTubeVideos(youtubeVideos, resources, resourceState, 4),
    officialDocs: ensureOfficialDocs(officialDocs, resources, resourceState, 4),
    githubRepos: ensureGithubRepos(githubRepos, resources, resourceState, 4),
    exercises: stringArray(phase.exercises, fallback.exercises).slice(0, 16),
    miniProjects: stringArray(phase.miniProjects, fallback.miniProjects).slice(0, 8),
    quizzes: recordArray(phase.quizzes).length ? phase.quizzes : fallback.quizzes,
    lessonNotes: stringArray(phase.lessonNotes, fallback.lessonNotes).slice(0, 16),
    recap: readString(phase.recap, fallback.recap),
    difficultyLevel: readString(phase.difficultyLevel, fallback.difficultyLevel),
    studyGuide: typeof phase.studyGuide === 'string' && phase.studyGuide.trim() ? phase.studyGuide : fallback.studyGuide,
    handsOnLab: typeof phase.handsOnLab === 'string' && phase.handsOnLab.trim() ? phase.handsOnLab : fallback.handsOnLab,
    cheatSheet: typeof phase.cheatSheet === 'string' && phase.cheatSheet.trim() ? phase.cheatSheet : fallback.cheatSheet,
    flashcards: Array.isArray(phase.flashcards) && phase.flashcards.length ? phase.flashcards : fallback.flashcards,
  };
}

function ensureYouTubeVideos(
  videos: unknown,
  resources: ResearchResource[],
  state: PhaseResourceState,
  limit: number
) {
  const existing = uniqueExistingRecords(recordArray(videos), state, limit);
  const injected = takeUnusedResources(resources, ['youtube'], state, limit - existing.length).map(
    (resource) => ({
      title: resource.title,
      channelName: resource.channelName,
      duration: resource.duration,
      url: resource.url,
      whyRecommended: resource.summary ?? resource.freshnessRelevance,
    })
  );

  return [...existing, ...injected].slice(0, limit);
}

function ensureOfficialDocs(
  docs: unknown,
  resources: ResearchResource[],
  state: PhaseResourceState,
  limit: number
) {
  const existing = uniqueExistingRecords(recordArray(docs), state, limit);
  const injected = takeUnusedResources(
    resources,
    ['officialDocs'],
    state,
    limit - existing.length
  ).map((resource) => ({
    title: resource.title,
    source: resource.source,
    url: resource.url,
    summary: resource.summary ?? resource.freshnessRelevance,
  }));

  return [...existing, ...injected].slice(0, limit);
}

function ensureGithubRepos(
  repos: unknown,
  resources: ResearchResource[],
  state: PhaseResourceState,
  limit: number
) {
  const existing = uniqueExistingRecords(recordArray(repos), state, limit);
  const injected = takeUnusedResources(resources, ['github'], state, limit - existing.length).map(
    (resource) => ({
      repositoryName: resource.title,
      url: resource.url,
      stars: resource.stars,
      whyUseful: resource.summary ?? 'Repository selected from live research.',
      projectRelevance: resource.freshnessRelevance,
    })
  );

  return [...existing, ...injected].slice(0, limit);
}

function ensureTutorials(
  tutorials: unknown,
  resources: ResearchResource[],
  state: PhaseResourceState,
  limit: number
) {
  const existing = uniqueExistingRecords(recordArray(tutorials), state, limit);
  const injected = takeUnusedResources(
    resources,
    ['article', 'course', 'community'],
    state,
    limit - existing.length
  ).map((resource) => ({
    title: resource.title,
    source: resource.source,
    url: resource.url,
    summary: resource.summary ?? resource.freshnessRelevance,
    freshnessRelevance: resource.freshnessRelevance,
  }));

  return [...existing, ...injected].slice(0, limit);
}

function createPhaseResourceState(): PhaseResourceState {
  return {
    usedKeys: new Set<string>(),
    cursors: {
      officialDocs: 0,
      youtube: 0,
      github: 0,
      article: 0,
      course: 0,
      community: 0,
    },
  };
}

function selectFallbackPhaseResources(
  resources: ResearchResource[],
  state: PhaseResourceState,
  commitSelection = true
) {
  const selectionState = commitSelection ? state : clonePhaseResourceState(state);

  return {
    officialDocs: takeUnusedResources(resources, ['officialDocs'], selectionState, 4),
    youtubeVideos: takeUnusedResources(resources, ['youtube'], selectionState, 4),
    githubRepos: takeUnusedResources(resources, ['github'], selectionState, 4),
    tutorials: takeUnusedResources(
      resources,
      ['article', 'course', 'community'],
      selectionState,
      6
    ),
  };
}

function clonePhaseResourceState(state: PhaseResourceState): PhaseResourceState {
  return {
    usedKeys: new Set(state.usedKeys),
    cursors: { ...state.cursors },
  };
}

function takeUnusedResources(
  resources: ResearchResource[],
  kinds: ResourceKind[],
  state: PhaseResourceState,
  limit: number
) {
  if (limit <= 0) {
    return [];
  }

  const selected: ResearchResource[] = [];

  for (const kind of kinds) {
    const matchingResources = resources.filter((resource) => resource.kind === kind);
    let cursor = state.cursors[kind];

    while (cursor < matchingResources.length && selected.length < limit) {
      const resource = matchingResources[cursor];
      const key = resourceKey(resource.url, resource.title);
      cursor += 1;

      if (!key || state.usedKeys.has(key)) {
        continue;
      }

      state.usedKeys.add(key);
      selected.push(resource);
    }

    state.cursors[kind] = cursor;

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function uniqueExistingRecords(
  records: Record<string, unknown>[],
  state: PhaseResourceState,
  limit: number
) {
  const selected: Record<string, unknown>[] = [];

  for (const record of records) {
    if (selected.length >= limit) {
      break;
    }

    const title = readString(record.title, readString(record.repositoryName, ''));
    const key = resourceKey(readString(record.url, ''), title);

    if (!key || state.usedKeys.has(key)) {
      continue;
    }

    state.usedKeys.add(key);
    selected.push(record);
  }

  return selected;
}

function resourceKey(url: string, title: string) {
  const normalizedUrl = normalizeResourceUrl(url);

  if (normalizedUrl) {
    return normalizedUrl;
  }

  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeResourceUrl(url: string) {
  if (!url.trim()) {
    return '';
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const videoId =
      host.endsWith('youtube.com') && parsed.pathname === '/watch'
        ? parsed.searchParams.get('v')
        : null;
    parsed.hash = '';

    if (videoId) {
      parsed.search = `?v=${videoId}`;
    } else {
      parsed.search = '';
    }

    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)))
    : [];
}

function stringArray(value: unknown, fallback: string[]) {
  const items = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  return items.length ? items : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function buildFallbackCourse(input: GenerateInput, resources: ResearchResource[]) {
  const topic = input.topic;
  const resourceState = createPhaseResourceState();
  const moduleTemplates = [
    [
      'Foundations And Mental Models',
      `Build the vocabulary, tooling, setup, and mental models needed to study ${topic} seriously.`,
      'beginner',
    ],
    [
      'Core Skills And Guided Implementation',
      `Turn the fundamentals into working ${topic} features through guided implementation and repetition.`,
      'intermediate',
    ],
    [
      'Applied Patterns And Real Projects',
      `Practice common professional patterns, debugging workflows, testing habits, and integration decisions for ${topic}.`,
      'intermediate',
    ],
    [
      'Production Workflow And Quality',
      `Move from demos to maintainable ${topic} work with performance, security, reliability, documentation, and review habits.`,
      'intermediate',
    ],
    [
      'Portfolio Capstone Studio',
      `Design, build, test, document, and present a substantial ${topic} capstone project.`,
      'advanced',
    ],
    [
      'Interview, System Design, And Career Readiness',
      `Convert the portfolio into interview stories, architecture explanations, tradeoff analysis, and job-ready evidence.`,
      'advanced',
    ],
  ] as const;

  return {
    title: `${topic} Full-Length Masterclass Roadmap`,
    overview: `A detailed ${input.moduleCount}-module ${topic} course generated from live web research, designed as a full-length learning program with deep notes, guided practice, portfolio projects, quizzes, milestones, and interview preparation.`,
    courseSummary: `Study ${topic} through a full course-player flow: learn the concepts, open vetted videos and links inside Roadlyn, complete structured exercises, ship portfolio work, and finish with interview-ready proof of skill.`,
    estimatedDuration: `${Math.max(16, Math.ceil((input.weeklyHours ?? 8) * 3))} weeks`,
    skillLevel: input.experienceLevel ?? 'beginner',
    skillOutcomes: [
      `Understand ${topic} fundamentals`,
      `Explain important ${topic} tradeoffs with concrete examples`,
      'Use official documentation and maintained repositories effectively',
      'Build multiple portfolio-ready projects',
      'Debug, test, document, and present production-style work',
      'Prepare for practical interviews and project walkthroughs',
    ],
    phases: moduleTemplates
      .slice(0, input.moduleCount)
      .map(([title, description, difficultyLevel]) => {
        const phaseResources = selectFallbackPhaseResources(resources, resourceState);

        return buildFallbackPhase(
          title,
          description,
          difficultyLevel,
          phaseResources.officialDocs,
          phaseResources.youtubeVideos,
          phaseResources.githubRepos,
          phaseResources.tutorials
        );
      }),
    projects: [
      {
        title: `${topic} starter project`,
        level: 'beginner',
        description: 'Build a focused starter project that demonstrates the core workflow.',
        deliverables: [
          'Working implementation',
          'README with setup steps',
          'Feature walkthrough',
          'Validation checklist',
          'Short reflection on tradeoffs',
        ],
        realWorldScenario:
          'A junior developer proving they can turn documentation into a working feature.',
      },
      {
        title: `${topic} applied project`,
        level: 'intermediate',
        description:
          'Create a more complete workflow using maintained libraries and current best practices from the research sources.',
        deliverables: [
          'Feature-complete app or workflow',
          'Tests or validation checklist',
          'Deployment or demo notes',
          'Architecture notes',
          'Known limitations',
        ],
        realWorldScenario:
          'A team needs a reliable internal tool or prototype built with modern practices.',
      },
      {
        title: `${topic} capstone`,
        level: 'advanced',
        description:
          'Ship a polished capstone with documentation, architecture notes, and a portfolio case study.',
        deliverables: [
          'Production-style repository',
          'Architecture write-up',
          'Demo video outline',
          'Interview talking points',
          'Performance or quality review',
          'Future roadmap',
        ],
        realWorldScenario: 'A job-ready portfolio piece that shows end-to-end ownership.',
      },
    ],
    resources,
    interviewPrep: [
      {
        topic: `${topic} practical fluency`,
        concepts: [
          'Fundamentals',
          'Tooling choices',
          'Debugging',
          'Architecture tradeoffs',
          'Deployment readiness',
        ],
        practicalQuestions: [
          `How would you design a small ${topic} project from scratch?`,
          'Which official docs or repositories would you trust first, and why?',
          'How would you evaluate whether an implementation is production-ready?',
          'How would you explain your capstone architecture to a senior engineer?',
          'What tradeoff did you make during implementation, and what would you change next?',
        ],
        portfolioSuggestion:
          'Publish the capstone with a concise README, architecture notes, screenshots, and a short demo.',
      },
    ],
    certifications: [],
    recommendedTools: [...new Set(resources.map((resource) => resource.source))].slice(0, 8),
    milestones: [
      {
        week: 'Week 1-2',
        outcome: 'Fundamentals mapped',
        checkpoint: 'Explain the core concepts and install the required tools.',
      },
      {
        week: 'Week 3-6',
        outcome: 'Guided implementation complete',
        checkpoint: 'Finish exercises tied to current tutorials and docs.',
      },
      {
        week: 'Week 7-12',
        outcome: 'Applied projects shipped',
        checkpoint: 'Publish working projects with documentation and validation notes.',
      },
      {
        week: 'Week 13-18',
        outcome: 'Capstone built and reviewed',
        checkpoint: 'Complete architecture notes, tests, demo, and tradeoff review.',
      },
      {
        week: 'Final weeks',
        outcome: 'Interview-ready portfolio',
        checkpoint: 'Practice practical questions and polish the case study.',
      },
    ],
  };
}

function buildFallbackPhase(
  title: string,
  description: string,
  difficultyLevel: string,
  officialDocs: ResearchResource[],
  youtubeVideos: ResearchResource[],
  githubRepos: ResearchResource[],
  tutorials: ResearchResource[]
) {
  return {
    title,
    description,
    estimatedDuration: '3-6 weeks',
    prerequisites: title.includes('Foundations')
      ? [
          'Basic computer literacy',
          'A development environment or learning workspace',
          'Willingness to document practice work',
        ]
      : [
          'Complete the previous module',
          'Review earlier notes and blockers',
          'Update your project journal',
        ],
    learningObjectives: [
      'Study current resources and separate durable concepts from tool-specific details',
      'Practice the core workflow repeatedly until it feels predictable',
      'Create evidence of learning through commits, notes, examples, and demos',
      'Explain the module concepts in plain language and with technical vocabulary',
      'Identify common mistakes, debugging signals, and quality checks',
      'Connect this module to the final portfolio project',
    ],
    tutorials: tutorials.map((resource) => ({
      title: resource.title,
      source: resource.source,
      url: resource.url,
      summary: resource.summary ?? 'Live search result selected for current learning relevance.',
      freshnessRelevance: resource.freshnessRelevance,
    })),
    youtubeVideos: youtubeVideos.map((resource) => ({
      title: resource.title,
      channelName: resource.channelName,
      duration: resource.duration,
      url: resource.url,
      whyRecommended:
        'Selected from live search results for tutorial or project-based learning relevance.',
    })),
    officialDocs: officialDocs.map((resource) => ({
      title: resource.title,
      source: resource.source,
      url: resource.url,
      summary: resource.summary ?? 'Official or documentation-style resource from live search.',
    })),
    githubRepos: githubRepos.map((resource) => ({
      repositoryName: resource.title,
      url: resource.url,
      stars: resource.stars,
      whyUseful: 'Repository or example project found during live search.',
      projectRelevance: 'Use it to inspect real implementation patterns and project structure.',
    })),
    exercises: [
      'Summarize the key concepts in your own words with one concrete example each',
      'Reproduce one tutorial from the selected resources without copy-pasting blindly',
      'Document blockers, fixes, commands, links, and decisions in a learning journal',
      'Create a small reference implementation that isolates one hard concept',
      'Write a checklist for reviewing your own work before moving forward',
      'Compare two approaches from the resources and explain when each is useful',
      'Add a README section that explains what you built and why',
      'Record a short demo script for the work completed in this module',
    ],
    miniProjects: [
      'Build a small working demo using the phase resources',
      'Extend the demo with one realistic edge case and document the tradeoff',
      'Refactor the demo for clarity and add validation steps',
    ],
    quizzes: [
      {
        question: 'Which resources should you trust first when details conflict?',
        answer:
          'Official documentation and actively maintained repositories, then current high-quality tutorials.',
      },
      {
        question: 'How do you know you are ready to move to the next module?',
        answer:
          'You can explain the main ideas, complete the exercises without step-by-step help, and show a working artifact.',
      },
      {
        question: 'What should you write down while learning?',
        answer:
          'Commands, definitions, errors, fixes, decisions, tradeoffs, and examples you can reuse later.',
      },
      {
        question: 'Why do mini-projects matter more than passive reading?',
        answer:
          'They turn concepts into evidence and reveal practical gaps that reading alone hides.',
      },
    ],
    lessonNotes: [
      `Read one trusted source, watch one guided lesson, then explain the ${title.toLowerCase()} concept in your own words.`,
      'Keep a running notebook with commands, definitions, decisions, and problems you solved.',
      'Start each study session by choosing one output you can finish, such as a note, demo, test, diagram, or README section.',
      'When a resource shows an example, pause and rebuild it from memory before checking your answer.',
      'Treat every blocker as course material: name the symptom, search the official source, test one fix, and document the result.',
      'After every major concept, connect it to a real product scenario so the knowledge has somewhere to live.',
      'End the module by revising your project and removing anything you no longer understand.',
      'Prepare one interview-style explanation that describes what you built, why it matters, and what tradeoff you accepted.',
    ],
    recap: `By the end of ${title.toLowerCase()}, you should be able to explain the key ideas, use the linked resources without hand-holding, and produce a small proof of work.`,
    difficultyLevel,
    studyGuide: `# Study Guide: ${title}\n\n## Overview\n${description}\n\n### Core Theoretical Foundations\nTo master this module, focus on standard conceptual paradigms and design patterns. Implement solid modular abstractions, keep functions side-effect free, and follow proper structural naming standards.\n\n### Architectural Layout\nWhen deploying, construct clear boundary models, define appropriate validation layers, and implement logging checkpoints to capture exceptions early.`,
    handsOnLab: `# Hands-on Lab: ${title} Workspace\n\n## Setup Instructions\n1. Ensure you have Node.js or the query environment installed.\n2. Open your shell or code workspace.\n\n## Complete Code Boilerplate Template\n\`\`\`javascript\n// Boilerplate template for ${title}\nfunction runWorkspace() {\n  console.log("Roadlyn Unified SaaS Lab Active!");\n  // TODO: Implement custom core feature\n}\nrunWorkspace();\n\`\`\`\n\n## Step-by-Step Task Checklist\n- [ ] Initialize the workspace template.\n- [ ] Complete the TODO implementation.\n- [ ] Verify core assertions work cleanly.`,
    cheatSheet: `# Cheat Sheet: ${title}\n\n- **Verify Environment**: Check standard environment configurations.\n- **Bootstrap Script**: Run dev scripts using normal commands.\n- **Key Constraint**: Keep state changes fully documented.`,
    flashcards: [
      { front: `What is the core target of ${title}?`, back: `To build capabilities around: ${description}` },
      { front: 'How can we test our progress?', back: 'By completing exercises and validating the code boilerplate.' }
    ],
  };
}
