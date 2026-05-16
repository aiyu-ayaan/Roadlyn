import { PrismaClient } from '@prisma/client';
import { FastifyRedisClient } from '../config/redis';

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
    redis: FastifyRedisClient;
  }

  interface FastifyRequest {
    auth?: {
      clientId?: string;
      userId?: string;
      scopes: string[];
    };
  }
}
