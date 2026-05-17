-- Course generation optimization: search metadata, FTS, trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Roadmap"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "normalizedTitle" TEXT,
  ADD COLUMN "searchableKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "semanticTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "searchVector" TEXT,
  ADD COLUMN "embedding" DOUBLE PRECISION[] NOT NULL DEFAULT ARRAY[]::DOUBLE PRECISION[],
  ADD COLUMN "generationHash" TEXT;

CREATE INDEX "Roadmap_generationHash_idx" ON "Roadmap"("generationHash");
CREATE INDEX "Roadmap_normalizedTitle_idx" ON "Roadmap"("normalizedTitle");
CREATE INDEX "Roadmap_searchableKeywords_idx" ON "Roadmap" USING GIN ("searchableKeywords");
CREATE INDEX "Roadmap_semanticTags_idx" ON "Roadmap" USING GIN ("semanticTags");

-- Unique slug for public discoverable roadmaps
CREATE UNIQUE INDEX "Roadmap_public_slug_key"
  ON "Roadmap"("slug")
  WHERE "visibility" = 'PUBLIC' AND "slug" IS NOT NULL;

-- Trigram indexes for fuzzy title matching
CREATE INDEX "Roadmap_title_trgm_idx"
  ON "Roadmap" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "Roadmap_normalizedTitle_trgm_idx"
  ON "Roadmap" USING GIN ("normalizedTitle" gin_trgm_ops);

-- Full-text search on consolidated search vector text
CREATE INDEX "Roadmap_searchVector_fts_idx"
  ON "Roadmap" USING GIN (to_tsvector('english', COALESCE("searchVector", '')));

-- Backfill search vector for existing completed public roadmaps
UPDATE "Roadmap"
SET
  "normalizedTitle" = lower(trim("title")),
  "searchableKeywords" = CASE
    WHEN "topic" IS NOT NULL AND trim("topic") <> '' THEN ARRAY[lower(trim("topic"))]
    ELSE ARRAY[]::TEXT[]
  END,
  "searchVector" = trim(
    concat_ws(
      ' ',
      lower(trim("title")),
      lower(COALESCE(trim("topic"), ''))
    )
  )
WHERE "visibility" = 'PUBLIC'
  AND "status" = 'COMPLETED'
  AND "searchVector" IS NULL;
