import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

const rootDir = path.resolve(__dirname, '../../../..');
const apiDir = path.resolve(__dirname, '../..');

for (const envFile of [
  path.join(rootDir, '.env'),
  path.join(rootDir, '.env.local'),
  path.join(apiDir, '.env'),
  path.join(apiDir, '.env.local'),
]) {
  dotenv.config({ path: envFile, override: false });
}

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
