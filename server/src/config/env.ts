import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string(),
  PORT: z.string().optional(),
  CLIENT_ORIGIN: z.string().url(),
  REDIS_URL: z.string().url(),
  // Optional: without this key, the app runs in script-and-quiz-only mode.
  MINIMAX_API_KEY: z.string().optional(),
  MINIMAX_GROUP_ID: z.string().optional(),
});

try {
  envSchema.parse(process.env);
} catch (error) {
  console.error('Invalid environment variables:', error);
  process.exit(1);
}
