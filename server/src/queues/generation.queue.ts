import { Queue } from "bullmq";
import { redisForBull } from "../config/redis";

export const generationQueue = new Queue("generation", {
  connection: redisForBull,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 8000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
