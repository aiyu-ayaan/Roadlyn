import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config/env';
import { OAuthService } from '../services/oauth-service';
import { ApiError } from '../utils/errors';

const createClientSchema = z.object({
  name: z.string().min(1),
  userId: z.string().optional(),
  scopes: z.array(z.string()).default(['ai:read', 'ai:write']),
});

const tokenSchema = z.object({
  grant_type: z.literal('client_credentials'),
  client_id: z.string(),
  client_secret: z.string(),
  scope: z.string().optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  const oauth = new OAuthService(fastify.db);

  fastify.post('/auth/oauth-clients', {
    schema: {
      tags: ['Auth'],
      summary: 'Create an OAuth2 client for API access',
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          userId: { type: 'string' },
          scopes: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const input = createClientSchema.parse(request.body);
    const client = await oauth.createClient(input);

    reply.status(201);

    return {
      success: true,
      data: client,
      warning: 'Store clientSecret securely. It is shown only once.',
    };
  });

  fastify.post('/auth/token', {
    schema: {
      tags: ['Auth'],
      summary: 'Exchange OAuth2 client credentials for a bearer token',
      body: {
        type: 'object',
        required: ['grant_type', 'client_id', 'client_secret'],
        properties: {
          grant_type: { type: 'string', enum: ['client_credentials'] },
          client_id: { type: 'string' },
          client_secret: { type: 'string' },
          scope: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const input = tokenSchema.parse(request.body);
    const client = await oauth.validateClient(input.client_id, input.client_secret);

    if (!client) {
      throw new ApiError(401, 'INVALID_CLIENT', 'Invalid client credentials');
    }

    const requestedScopes = input.scope?.split(' ').filter(Boolean);
    const scopes = requestedScopes?.length
      ? requestedScopes.filter((scope) => client.scopes.includes(scope))
      : client.scopes;

    const accessToken = fastify.jwt.sign(
      {
        clientId: client.clientId,
        userId: client.userId,
        scopes,
      },
      {
        iss: config.OAUTH_TOKEN_ISSUER,
        expiresIn: config.JWT_EXPIRATION,
      },
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: config.JWT_EXPIRATION,
      scope: scopes.join(' '),
    };
  });
}
