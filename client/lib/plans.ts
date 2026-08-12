export type PlanId = "free" | "starter" | "standard" | "pro" | "creator";

export interface VideoTier {
  planId: PlanId;
  label: string;
  priceINR: number;
  totalSeconds: number;
  maxSecondsPerCall: number;
  maxGenerationSeconds: number;
  isFreeTrial: boolean;
}

export interface PlansResponse {
  plans: VideoTier[];
}

export const isPlanId = (value: unknown): value is PlanId =>
  value === "free" ||
  value === "starter" ||
  value === "standard" ||
  value === "pro" ||
  value === "creator";

export const formatDuration = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  if (safeSeconds < 60) return `${safeSeconds}s`;

  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
};
