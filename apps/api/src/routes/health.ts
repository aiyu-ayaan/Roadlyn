/**
 * Health check route for system monitoring
 */

import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  fastify.get('/ready', async () => {
    // TODO: Add database and Redis health checks
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  });
}
