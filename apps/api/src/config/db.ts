import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

let db: PrismaClient | null = null;

export function getDb() {
  if (db) {
    return db;
  }

  db = new PrismaClient({
    log: ['warn', 'error'],
  });

  logger.info('Prisma connected');

  return db;
}

export async function closeDb() {
  if (db) {
    await db.$disconnect();
    db = null;
  }
}
