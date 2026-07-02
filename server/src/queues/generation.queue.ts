import { Queue } from "bullmq";
import { redisForBull } from "../config/redis";
// Define PlanId type inline since videoTiers module is unavailable, matching used tier values
type PlanId = 'creator' | 'pro' | 'standard' | 'starter' | 'free';

export const generationQueue = redisForBull
  ? new Queue("generation", {
      connection: redisForBull,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 8000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    })
  : null;

// BullMQ priority: LOWER number = processed FIRST. Free-tier users get the
// highest number (lowest priority) so paying users — who waited through
// a queue once already, on the free video — don't wait behind a backlog
// of free generations during a traffic spike. Within paid tiers, higher
// spend also jumps ahead slightly, since those users are most likely to
// churn if their wait time feels arbitrary.
const PRIORITY_BY_TIER: Record<PlanId, number> = {
  creator: 1,
  pro: 2,
  standard: 3,
  starter: 4,
  free: 10,
};

export function priorityForTier(tier: PlanId): number {
  return PRIORITY_BY_TIER[tier] ?? PRIORITY_BY_TIER.free;
}