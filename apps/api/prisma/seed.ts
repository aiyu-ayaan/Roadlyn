/**
 * Prisma Seed Script
 * Populates provider metadata only. Provider API keys must be added through
 * the dashboard/API and are never read from .env files.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.aiProvider.upsert({
    where: { slug: 'openai' },
    update: {},
    create: {
      name: 'OpenAI',
      slug: 'openai',
      providerType: 'OPENAI',
      supportsStreaming: true,
      supportsVision: true,
      supportsEmbeddings: true,
      enabled: true,
      isDefault: true,
    },
  });

  await prisma.aiProvider.upsert({
    where: { slug: 'anthropic' },
    update: {},
    create: {
      name: 'Anthropic',
      slug: 'anthropic',
      providerType: 'ANTHROPIC',
      supportsStreaming: true,
      supportsVision: true,
      enabled: true,
    },
  });

  await prisma.aiProvider.upsert({
    where: { slug: 'ollama-local' },
    update: {},
    create: {
      name: 'Ollama Local',
      slug: 'ollama-local',
      providerType: 'OLLAMA',
      baseUrl: 'http://localhost:11434/v1',
      supportsStreaming: true,
      enabled: true,
    },
  });

  const openaiProvider = await prisma.aiProvider.findUnique({
    where: { slug: 'openai' },
  });

  if (openaiProvider) {
    await prisma.aiModel.createMany({
      data: [
        {
          providerId: openaiProvider.id,
          modelName: 'gpt-4o',
          displayName: 'GPT-4o',
          contextWindow: 128000,
          inputPricing: 0.0000025,
          outputPricing: 0.00001,
          supportsTools: true,
          supportsVision: true,
          enabled: true,
        },
        {
          providerId: openaiProvider.id,
          modelName: 'gpt-4o-mini',
          displayName: 'GPT-4o mini',
          contextWindow: 128000,
          inputPricing: 0.00000015,
          outputPricing: 0.0000006,
          supportsTools: true,
          supportsVision: true,
          enabled: true,
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
