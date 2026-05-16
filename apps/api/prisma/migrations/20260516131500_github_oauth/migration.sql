ALTER TABLE "User" ADD COLUMN "githubId" TEXT;

CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
CREATE INDEX "User_githubId_idx" ON "User"("githubId");
