import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';
import { FastifyRedisClient } from '../config/redis';
import { RoadmapEmbeddingService } from './roadmap-embedding-service';
import {
  cosineSimilarity,
  keywordOverlapScore,
  normalizeSearchTerm,
  RoadmapSearchMetadata,
  SimilarityInput,
} from './roadmap-search-utils';
import { RoadmapMetadataService } from './roadmap-metadata-service';

export interface SimilarRoadmapMatch {
  id: string;
  title: string;
  slug: string | null;
  topic: string | null;
  similarityScore: number;
  enrollmentCount?: number;
}

export interface SimilarityCheckResult {
  metadata: RoadmapSearchMetadata;
  existingRoadmaps: SimilarRoadmapMatch[];
  shouldGenerateNewRoadmap: boolean;
  similarityThreshold: number;
}

interface CandidateRow {
  id: string;
  title: string;
  slug: string | null;
  topic: string | null;
  normalizedTitle: string | null;
  searchableKeywords: string[];
  semanticTags: string[];
  searchVector: string | null;
  embedding: number[];
  generationHash: string | null;
  titleSimilarity: number;
  keywordOverlap: number;
  ftsRank: number;
  enrollmentCount: number;
}

export class RoadmapSimilarityService {
  private readonly embeddingService: RoadmapEmbeddingService;

  constructor(
    private readonly db: PrismaClient,
    private readonly metadataService: RoadmapMetadataService,
    redis: FastifyRedisClient,
  ) {
    this.embeddingService = new RoadmapEmbeddingService(db, redis);
  }

  async checkSimilarity(
    userId: string | undefined,
    input: SimilarityInput,
    metadata?: RoadmapSearchMetadata,
  ): Promise<SimilarityCheckResult> {
    const resolvedMetadata =
      metadata ?? (await this.metadataService.generateMetadata(userId, input));
    const queryEmbedding = await this.embeddingService.embedSearchText(
      resolvedMetadata.searchVector,
    );
    const candidates = await this.findCandidates(resolvedMetadata);
    const threshold = config.ROADMAP_SIMILARITY_THRESHOLD;

    const ranked = candidates
      .map((candidate) => {
        const titleScore = Math.max(
          candidate.titleSimilarity,
          trigramScore(resolvedMetadata.normalizedTitle, candidate.normalizedTitle ?? ''),
        );
        const keywordScore = Math.max(
          candidate.keywordOverlap,
          keywordOverlapScore(resolvedMetadata.searchableKeywords, candidate.searchableKeywords),
          keywordOverlapScore(resolvedMetadata.semanticTags, candidate.semanticTags),
        );
        const semanticScore = trigramScore(
          resolvedMetadata.searchVector,
          candidate.searchVector ?? '',
        );
        const embeddingScore =
          queryEmbedding.length > 0 && candidate.embedding.length > 0
            ? cosineSimilarity(queryEmbedding, candidate.embedding)
            : 0;
        const hashBoost =
          candidate.generationHash &&
          candidate.generationHash === resolvedMetadata.generationHash
            ? 0.15
            : 0;
        const ftsBoost = Math.min(candidate.ftsRank, 1) * 0.1;

        const similarityScore = clampScore(
          titleScore * 0.3 +
            keywordScore * 0.3 +
            semanticScore * 0.15 +
            embeddingScore * 0.2 +
            hashBoost +
            ftsBoost,
        );

        return {
          id: candidate.id,
          title: candidate.title,
          slug: candidate.slug,
          topic: candidate.topic,
          similarityScore,
          enrollmentCount: candidate.enrollmentCount,
        };
      })
      .filter((match) => match.similarityScore >= threshold * 0.65)
      .sort((left, right) => right.similarityScore - left.similarityScore)
      .slice(0, 5);

    const topScore = ranked[0]?.similarityScore ?? 0;

    return {
      metadata: resolvedMetadata,
      existingRoadmaps: ranked,
      shouldGenerateNewRoadmap: topScore < threshold,
      similarityThreshold: threshold,
    };
  }

  private async findCandidates(metadata: RoadmapSearchMetadata) {
    const queryText = metadata.searchVector;
    const keywords = metadata.searchableKeywords;
    const tags = metadata.semanticTags;

    return this.db.$queryRawUnsafe<CandidateRow[]>(
      `SELECT
         r."id",
         r."title",
         r."slug",
         r."topic",
         r."normalizedTitle",
         r."searchableKeywords",
         r."semanticTags",
         r."searchVector",
         r."embedding",
         r."generationHash",
         similarity(COALESCE(r."normalizedTitle", lower(r."title")), $1) AS "titleSimilarity",
         CASE
           WHEN cardinality(r."searchableKeywords") = 0 THEN 0
           ELSE cardinality(
             ARRAY(
               SELECT unnest(r."searchableKeywords")
               INTERSECT
               SELECT unnest($2::text[])
             )
           )::float / GREATEST(cardinality(r."searchableKeywords"), cardinality($2::text[]))
         END AS "keywordOverlap",
         ts_rank(
           to_tsvector('english', COALESCE(r."searchVector", '')),
           plainto_tsquery('english', $3)
         ) AS "ftsRank",
         COALESCE(enrollment_counts."count", 0)::int AS "enrollmentCount"
       FROM "Roadmap" r
       LEFT JOIN (
         SELECT "roadmapId", COUNT(*) AS "count"
         FROM "RoadmapEnrollment"
         GROUP BY "roadmapId"
       ) enrollment_counts ON enrollment_counts."roadmapId" = r."id"
       WHERE r."visibility" = 'PUBLIC'
         AND r."status" = 'COMPLETED'
         AND r."generatedCourse" IS NOT NULL
         AND (
           similarity(COALESCE(r."normalizedTitle", lower(r."title")), $1) > 0.2
           OR r."searchableKeywords" && $2::text[]
           OR r."semanticTags" && $4::text[]
           OR r."generationHash" = $5
           OR to_tsvector('english', COALESCE(r."searchVector", '')) @@ plainto_tsquery('english', $3)
         )
       ORDER BY "titleSimilarity" DESC, "keywordOverlap" DESC, "ftsRank" DESC
       LIMIT 25`,
      metadata.normalizedTitle,
      keywords,
      queryText,
      tags,
      metadata.generationHash,
    );
  }
}

export async function persistRoadmapSearchMetadata(
  db: PrismaClient,
  roadmapId: string,
  metadata: RoadmapSearchMetadata,
  embedding: number[],
) {
  await db.$executeRawUnsafe(
    `UPDATE "Roadmap"
     SET
       "title" = $2,
       "slug" = $3,
       "normalizedTitle" = $4,
       "searchableKeywords" = $5::text[],
       "semanticTags" = $6::text[],
       "searchVector" = $7,
       "embedding" = $8::double precision[],
       "generationHash" = $9,
       "updatedAt" = NOW()
     WHERE "id" = $1`,
    roadmapId,
    metadata.title,
    metadata.slug,
    metadata.normalizedTitle,
    metadata.searchableKeywords,
    metadata.semanticTags,
    metadata.searchVector,
    embedding,
    metadata.generationHash,
  );
}

export async function backfillPublicRoadmapSearchIndex(db: PrismaClient, limit = 100) {
  const rows = await db.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      topic: string | null;
      experienceLevel: string | null;
      goal: string | null;
      weeklyHours: number | null;
    }>
  >(
    `SELECT "id", "title", "topic", "experienceLevel", "goal", "weeklyHours"
     FROM "Roadmap"
     WHERE "visibility" = 'PUBLIC'
       AND "status" = 'COMPLETED'
       AND ("searchVector" IS NULL OR cardinality("searchableKeywords") = 0)
     ORDER BY "updatedAt" DESC
     LIMIT $1`,
    limit,
  );

  return rows;
}

function trigramScore(left: string, right: string) {
  const a = normalizeSearchTerm(left);
  const b = normalizeSearchTerm(right);

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  if (a.includes(b) || b.includes(a)) {
    return 0.85;
  }

  const leftTokens = new Set(a.split(' '));
  const rightTokens = new Set(b.split(' '));
  let overlap = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function clampScore(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}
