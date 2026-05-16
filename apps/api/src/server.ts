import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from 'fastify-helmet';
import { config } from './config/env';
import { logger } from './config/logger';
import { getDb, closeDb } from './config/db';
import { getRedis, closeRedis } from './config/redis';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { roadmapRoutes } from './routes/roadmap';
import { aiRoutes } from './routes/ai';

export async function createServer() {
  const fastify = Fastify({
    logger: logger,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: '*',
    credentials: true,
  });

  await fastify.register(helmet);

  // Initialize connections
  const db = getDb();
  const redis = await getRedis();

  // Store in fastify instance for access in routes
  fastify.decorate('db', db);
  fastify.decorate('redis', redis);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/api' });
  await fastify.register(roadmapRoutes, { prefix: '/api' });
  await fastify.register(aiRoutes, { prefix: '/api' });

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error(error);
    reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        message: error.message,
        code: 'ERROR',
      },
    });
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await fastify.close();
    await closeDb();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return fastify;
}

async function start() {
  try {
    const fastify = await createServer();
    await fastify.listen({ port: config.API_PORT, host: '0.0.0.0' });
    logger.info(`Server running at http://localhost:${config.API_PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

start();
