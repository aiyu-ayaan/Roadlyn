import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config/env';
import { requireAuth } from '../middleware/auth';
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

const githubStartSchema = z.object({
  next: z.string().optional(),
});

const githubCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

type GithubUser = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export async function authRoutes(fastify: FastifyInstance) {
  const oauth = new OAuthService(fastify.db);

  fastify.get('/auth/me', {
    preHandler: requireAuth,
    schema: {
      tags: ['Auth'],
      summary: 'Return the authenticated user',
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    if (!request.auth?.userId) {
      return {
        success: true,
        data: {
          id: request.auth?.clientId ?? 'api-client',
          email: 'api-client@roadlyn.local',
          name: 'API Client',
        },
      };
    }

    const user = await fastify.db.user.findUnique({
      where: { id: request.auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'Authenticated user was not found');
    }

    return { success: true, data: user };
  });

  fastify.get('/auth/github', {
    schema: {
      tags: ['Auth'],
      summary: 'Start GitHub OAuth user login',
      querystring: {
        type: 'object',
        properties: {
          next: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!config.GITHUB_OAUTH_CLIENT_ID || !config.GITHUB_OAUTH_CLIENT_SECRET) {
      throw new ApiError(
        503,
        'GITHUB_OAUTH_NOT_CONFIGURED',
        'Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET before using GitHub login',
      );
    }

    const query = githubStartSchema.parse(request.query);
    const state = fastify.jwt.sign(
      {
        purpose: 'github-oauth',
        next: normalizeNextPath(query.next),
      },
      { expiresIn: '10m' },
    );
    const githubUrl = new URL('https://github.com/login/oauth/authorize');
    githubUrl.searchParams.set('client_id', config.GITHUB_OAUTH_CLIENT_ID);
    githubUrl.searchParams.set('redirect_uri', config.GITHUB_OAUTH_CALLBACK_URL);
    githubUrl.searchParams.set('scope', 'read:user user:email');
    githubUrl.searchParams.set('state', state);

    return reply.redirect(githubUrl.toString());
  });

  fastify.get('/auth/github/callback', {
    schema: {
      tags: ['Auth'],
      summary: 'Handle GitHub OAuth callback',
      querystring: {
        type: 'object',
        required: ['code', 'state'],
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!config.GITHUB_OAUTH_CLIENT_ID || !config.GITHUB_OAUTH_CLIENT_SECRET) {
      throw new ApiError(503, 'GITHUB_OAUTH_NOT_CONFIGURED', 'GitHub OAuth is not configured');
    }

    const query = githubCallbackSchema.parse(request.query);
    const state = fastify.jwt.verify<{ purpose: string; next?: string }>(query.state);

    if (state.purpose !== 'github-oauth') {
      throw new ApiError(400, 'INVALID_OAUTH_STATE', 'Invalid OAuth state');
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.GITHUB_OAUTH_CLIENT_ID,
        client_secret: config.GITHUB_OAUTH_CLIENT_SECRET,
        code: query.code,
        redirect_uri: config.GITHUB_OAUTH_CALLBACK_URL,
      }),
    });
    const tokenPayload = await tokenResponse.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new ApiError(
        401,
        'GITHUB_TOKEN_EXCHANGE_FAILED',
        tokenPayload.error_description ?? tokenPayload.error ?? 'Could not exchange GitHub OAuth code',
      );
    }

    const githubUser = await fetchGithub<GithubUser>(
      'https://api.github.com/user',
      tokenPayload.access_token,
    );
    const email =
      githubUser.email ??
      (await fetchGithub<GithubEmail[]>(
        'https://api.github.com/user/emails',
        tokenPayload.access_token,
      )).find((item) => item.primary && item.verified)?.email ??
      `${githubUser.login}@users.noreply.github.com`;

    const existingByGithub = await fastify.db.user.findUnique({
      where: { githubId: String(githubUser.id) },
    });
    const existingByEmail = existingByGithub
      ? null
      : await fastify.db.user.findUnique({ where: { email } });
    const user = existingByGithub
      ? await fastify.db.user.update({
          where: { id: existingByGithub.id },
          data: {
            email,
            name: githubUser.name ?? githubUser.login,
            avatar: githubUser.avatar_url,
          },
        })
      : existingByEmail
        ? await fastify.db.user.update({
            where: { id: existingByEmail.id },
            data: {
              githubId: String(githubUser.id),
              name: existingByEmail.name ?? githubUser.name ?? githubUser.login,
              avatar: existingByEmail.avatar ?? githubUser.avatar_url,
            },
          })
        : await fastify.db.$transaction(async (tx) => {
            const userCount = await tx.user.count();

            return tx.user.create({
              data: {
                email,
                githubId: String(githubUser.id),
                name: githubUser.name ?? githubUser.login,
                avatar: githubUser.avatar_url,
                role: userCount === 0 ? 'ADMIN' : 'USER',
              },
            });
          });

    const scopes = user.role === 'ADMIN'
      ? ['ai:read', 'ai:write', 'ai:admin']
      : ['ai:read', 'ai:write'];
    const accessToken = fastify.jwt.sign(
      {
        userId: user.id,
        scopes,
      },
      {
        iss: config.OAUTH_TOKEN_ISSUER,
        expiresIn: config.JWT_EXPIRATION,
      },
    );
    const callbackUrl = new URL('/auth/callback', config.WEB_APP_URL);
    callbackUrl.searchParams.set('access_token', accessToken);
    callbackUrl.searchParams.set('scope', scopes.join(' '));
    callbackUrl.searchParams.set('next', normalizeNextPath(state.next));

    return reply.redirect(callbackUrl.toString());
  });

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

function normalizeNextPath(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard';
  }

  return next;
}

async function fetchGithub<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'Roadlyn',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, 'GITHUB_API_ERROR', 'GitHub profile lookup failed');
  }

  return response.json() as Promise<T>;
}
