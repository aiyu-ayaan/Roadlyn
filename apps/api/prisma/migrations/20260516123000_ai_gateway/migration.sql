-- CreateEnum
CREATE TYPE "AIProviderType" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI', 'DEEPSEEK', 'GROK', 'MISTRAL', 'TOGETHERAI', 'OPENROUTER', 'OLLAMA', 'CUSTOM_OPENAI_COMPATIBLE');

-- Preserve existing provider/model data while moving to the dynamic gateway schema.
ALTER TABLE "AIProvider" RENAME COLUMN "type" TO "providerTypeText";
ALTER TABLE "AIProvider" RENAME COLUMN "isActive" TO "enabled";
ALTER TABLE "AIModel" RENAME COLUMN "name" TO "modelName";
ALTER TABLE "AIModel" RENAME COLUMN "maxTokens" TO "contextWindow";
ALTER TABLE "AIModel" RENAME COLUMN "costPer1kTokens" TO "inputPricing";
ALTER TABLE "AIModel" RENAME COLUMN "isActive" TO "enabled";

ALTER TABLE "AIProvider"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "providerType" "AIProviderType",
  ADD COLUMN "baseUrl" TEXT,
  ADD COLUMN "supportsStreaming" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supportsVision" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "supportsEmbeddings" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AIProvider"
SET
  "slug" = lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')),
  "providerType" = CASE lower("providerTypeText")
    WHEN 'openai' THEN 'OPENAI'::"AIProviderType"
    WHEN 'anthropic' THEN 'ANTHROPIC'::"AIProviderType"
    WHEN 'gemini' THEN 'GEMINI'::"AIProviderType"
    WHEN 'deepseek' THEN 'DEEPSEEK'::"AIProviderType"
    WHEN 'grok' THEN 'GROK'::"AIProviderType"
    WHEN 'mistral' THEN 'MISTRAL'::"AIProviderType"
    WHEN 'togetherai' THEN 'TOGETHERAI'::"AIProviderType"
    WHEN 'openrouter' THEN 'OPENROUTER'::"AIProviderType"
    WHEN 'ollama' THEN 'OLLAMA'::"AIProviderType"
    ELSE 'CUSTOM_OPENAI_COMPATIBLE'::"AIProviderType"
  END;

ALTER TABLE "AIProvider"
  ALTER COLUMN "slug" SET NOT NULL,
  ALTER COLUMN "providerType" SET NOT NULL,
  DROP COLUMN "providerTypeText";

ALTER TABLE "AIModel"
  ADD COLUMN "outputPricing" DECIMAL(12,8),
  ADD COLUMN "supportsTools" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "supportsVision" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "supportsReasoning" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AIModel"
  ALTER COLUMN "inputPricing" TYPE DECIMAL(12,8) USING "inputPricing"::DECIMAL(12,8),
  ALTER COLUMN "version" DROP NOT NULL;

ALTER TABLE "AIModel" DROP COLUMN "version";

-- CreateTable
CREATE TABLE "OAuthClient" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "clientSecretHash" TEXT NOT NULL,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "userId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAPIKey" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT,
  "encryptedKey" TEXT NOT NULL,
  "keyName" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastValidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderAPIKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAISettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "defaultProviderId" TEXT,
  "defaultModelId" TEXT,
  "useOwnKeys" BOOLEAN NOT NULL DEFAULT false,
  "fallbackProviderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAISettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITokenUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "providerId" TEXT NOT NULL,
  "modelId" TEXT,
  "operation" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCost" DECIMAL(12,8),
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AITokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_slug_key" ON "AIProvider"("slug");
CREATE INDEX "AIProvider_providerType_idx" ON "AIProvider"("providerType");
CREATE INDEX "AIProvider_enabled_idx" ON "AIProvider"("enabled");
CREATE INDEX "AIModel_enabled_idx" ON "AIModel"("enabled");
CREATE UNIQUE INDEX "AIModel_providerId_modelName_key" ON "AIModel"("providerId", "modelName");
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");
CREATE INDEX "OAuthClient_userId_idx" ON "OAuthClient"("userId");
CREATE INDEX "OAuthClient_clientId_idx" ON "OAuthClient"("clientId");
CREATE INDEX "ProviderAPIKey_providerId_idx" ON "ProviderAPIKey"("providerId");
CREATE INDEX "ProviderAPIKey_userId_idx" ON "ProviderAPIKey"("userId");
CREATE INDEX "ProviderAPIKey_isActive_idx" ON "ProviderAPIKey"("isActive");
CREATE UNIQUE INDEX "UserAISettings_userId_key" ON "UserAISettings"("userId");
CREATE INDEX "UserAISettings_defaultProviderId_idx" ON "UserAISettings"("defaultProviderId");
CREATE INDEX "UserAISettings_defaultModelId_idx" ON "UserAISettings"("defaultModelId");
CREATE INDEX "UserAISettings_fallbackProviderId_idx" ON "UserAISettings"("fallbackProviderId");
CREATE INDEX "AITokenUsage_userId_idx" ON "AITokenUsage"("userId");
CREATE INDEX "AITokenUsage_providerId_idx" ON "AITokenUsage"("providerId");
CREATE INDEX "AITokenUsage_modelId_idx" ON "AITokenUsage"("modelId");
CREATE INDEX "AITokenUsage_createdAt_idx" ON "AITokenUsage"("createdAt");

-- AddForeignKey
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderAPIKey" ADD CONSTRAINT "ProviderAPIKey_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderAPIKey" ADD CONSTRAINT "ProviderAPIKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAISettings" ADD CONSTRAINT "UserAISettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAISettings" ADD CONSTRAINT "UserAISettings_defaultProviderId_fkey" FOREIGN KEY ("defaultProviderId") REFERENCES "AIProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserAISettings" ADD CONSTRAINT "UserAISettings_defaultModelId_fkey" FOREIGN KEY ("defaultModelId") REFERENCES "AIModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserAISettings" ADD CONSTRAINT "UserAISettings_fallbackProviderId_fkey" FOREIGN KEY ("fallbackProviderId") REFERENCES "AIProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AITokenUsage" ADD CONSTRAINT "AITokenUsage_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
