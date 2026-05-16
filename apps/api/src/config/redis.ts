import { createClient } from 'redis';
import { logger } from './logger';

export type FastifyRedisClient = {
  connect(): Promise<unknown>;
  disconnect(): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number },
  ): Promise<string | null>;
  del(keys: string | string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
};

let redis: FastifyRedisClient | null = null;

export async function getRedis(): Promise<FastifyRedisClient> {
  if (redis) {
    return redis;
  }

  redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  }) as FastifyRedisClient;

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
