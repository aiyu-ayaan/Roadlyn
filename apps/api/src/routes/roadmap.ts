/**
 * Roadmap routes placeholder
 * TODO: Implement roadmap logic
 */

import { FastifyInstance } from 'fastify';

export async function roadmapRoutes(fastify: FastifyInstance) {
  fastify.get('/roadmaps', async () => {
    return {
      success: true,
      message: 'Get roadmaps endpoint placeholder',
      data: [],
    };
  });

  fastify.post('/roadmaps', async () => {
    return {
      success: true,
      message: 'Create roadmap endpoint placeholder',
    };
  });

  fastify.get('/roadmaps/:id', async () => {
    return {
      success: true,
      message: 'Get roadmap endpoint placeholder',
    };
  });

  fastify.put('/roadmaps/:id', async () => {
    return {
      success: true,
      message: 'Update roadmap endpoint placeholder',
    };
  });

  fastify.delete('/roadmaps/:id', async () => {
    return {
      success: true,
      message: 'Delete roadmap endpoint placeholder',
    };
  });
}
