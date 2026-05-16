-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "AIProvider" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Promote the oldest existing account when upgrading a database that already has users.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "id" = (
  SELECT "id"
  FROM "User"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1
  FROM "User"
  WHERE "role" = 'ADMIN'
);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "AIProvider_isDefault_idx" ON "AIProvider"("isDefault");
