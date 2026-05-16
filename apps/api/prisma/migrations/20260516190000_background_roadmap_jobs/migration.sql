ALTER TABLE "Roadmap"
  ADD COLUMN "topic" TEXT,
  ADD COLUMN "experienceLevel" TEXT,
  ADD COLUMN "goal" TEXT,
  ADD COLUMN "weeklyHours" INTEGER,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "generatedCourse" JSONB,
  ADD COLUMN "researchedResources" JSONB,
  ADD COLUMN "providerId" TEXT,
  ADD COLUMN "modelId" TEXT,
  ADD COLUMN "errorMessage" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE INDEX "Roadmap_status_idx" ON "Roadmap"("status");
