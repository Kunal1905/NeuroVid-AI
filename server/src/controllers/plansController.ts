import { Request, Response } from "express";
import {
  MAX_GENERATION_SECONDS,
  VIDEO_TIERS,
  type VideoTier,
} from "../config/VideoTiers";

export const getPlans = (_req: Request, res: Response) => {
  const plans = (Object.values(VIDEO_TIERS) as VideoTier[]).map((tier) => ({
    ...tier,
    maxGenerationSeconds: Math.min(
      tier.totalSeconds,
      MAX_GENERATION_SECONDS,
    ),
  }));

  return res.json({ plans });
};
