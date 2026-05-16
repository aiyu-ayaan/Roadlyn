/*
  Warnings:

  - Added the required column `providerType` to the `ProviderAPIKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProviderAPIKey" ADD COLUMN     "providerType" "AIProviderType" NOT NULL,
ALTER COLUMN "providerId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ProviderAPIKey_providerType_idx" ON "ProviderAPIKey"("providerType");
