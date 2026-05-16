import { createClient } from 'redis';
import { logger } from './logger';

let redis: ReturnType<typeof createClient> | null = null;

export async function getRedis() {
  if (redis) {
    return redis;
  }

  redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redis.on('error', (err) => logger.error('Redis Client Error', err));

  await redis.connect();
  logger.info('Redis connected');

  return redis;
}

export async function closeRedis() {
  if (redis) {
    await redis.disconnect();
    redis = null;
  }
}
