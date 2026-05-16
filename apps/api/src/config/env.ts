import { z } from 'zod';

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3001),
  API_NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string(),
  JWT_EXPIRATION: z.string().default('7d'),
  AI_KEY_ENCRYPTION_SECRET: z.string().min(32),
  OAUTH_TOKEN_ISSUER: z.string().default('roadlyn-api'),
  SENDGRID_API_KEY: z.string().optional(),
  STRIPE_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const config = envSchema.parse(process.env);
