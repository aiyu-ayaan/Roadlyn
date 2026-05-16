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
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  STRIPE_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const config = envSchema.parse(process.env);
