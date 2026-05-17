ALTER TABLE "User"
  ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxGenerations" INTEGER,
  ADD COLUMN "generationCooldownSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "unlimitedGenerations" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "noGenerationCooldown" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastGenerationAt" TIMESTAMP(3);

ALTER TABLE "Roadmap"
  ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PRIVATE';

CREATE TABLE "RoadmapEnrollment" (
  "id" TEXT NOT NULL,
  "roadmapId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RoadmapEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoadmapEnrollment_roadmapId_userId_key" ON "RoadmapEnrollment"("roadmapId", "userId");
CREATE INDEX "RoadmapEnrollment_roadmapId_idx" ON "RoadmapEnrollment"("roadmapId");
CREATE INDEX "RoadmapEnrollment_userId_idx" ON "RoadmapEnrollment"("userId");
CREATE INDEX "User_isDemo_idx" ON "User"("isDemo");
CREATE INDEX "Roadmap_visibility_idx" ON "Roadmap"("visibility");
CREATE INDEX "Roadmap_visibility_status_idx" ON "Roadmap"("visibility", "status");

ALTER TABLE "RoadmapEnrollment"
  ADD CONSTRAINT "RoadmapEnrollment_roadmapId_fkey"
  FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoadmapEnrollment"
  ADD CONSTRAINT "RoadmapEnrollment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
