/**
 * Prisma Seed Script
 * Populate database with initial data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed AI Providers
  await prisma.aiProvider.createMany({
    data: [
      {
        name: 'OpenAI',
        type: 'openai',
        isActive: true,
      },
      {
        name: 'Anthropic',
        type: 'anthropic',
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  // Seed AI Models
  const openaiProvider = await prisma.aiProvider.findUnique({
    where: { name: 'OpenAI' },
  });

  if (openaiProvider) {
    await prisma.aiModel.createMany({
      data: [
        {
          providerId: openaiProvider.id,
          name: 'gpt-4',
          displayName: 'GPT-4',
          version: '1',
          maxTokens: 8192,
          costPer1kTokens: 0.03,
          isActive: true,
        },
        {
          providerId: openaiProvider.id,
          name: 'gpt-3.5-turbo',
          displayName: 'GPT-3.5 Turbo',
          version: '1',
          maxTokens: 4096,
          costPer1kTokens: 0.001,
          isActive: true,
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
