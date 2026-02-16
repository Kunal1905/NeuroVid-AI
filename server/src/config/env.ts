import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string(),
  PORT: z.string().optional(),
  CLIENT_ORIGIN: z.string().url(),
  REDIS_URL: z.string().url(),
});

try {
  envSchema.parse(process.env);
} catch (error) {
  console.error('Invalid environment variables:', error);
  process.exit(1);
}