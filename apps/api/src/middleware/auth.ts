import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../utils/errors';

export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const payload = await request.jwtVerify<{
    clientId?: string;
    userId?: string;
    scopes?: string[];
  }>();

  request.auth = {
    clientId: payload.clientId,
    userId: payload.userId,
    scopes: payload.scopes ?? [],
  };
}

export function requireScope(scope: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);

    const scopes = request.auth?.scopes ?? [];

    if (!scopes.includes(scope) && !scopes.includes('ai:admin')) {
      throw new ApiError(403, 'INSUFFICIENT_SCOPE', `Missing scope: ${scope}`);
    }
  };
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireAuth(request, reply);

  if (!request.auth?.userId) {
    throw new ApiError(403, 'ADMIN_REQUIRED', 'Admin access requires a user session');
  }

  const user = await request.server.db.user.findUnique({
    where: { id: request.auth.userId },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    throw new ApiError(403, 'ADMIN_REQUIRED', 'Admin access required');
  }
}
