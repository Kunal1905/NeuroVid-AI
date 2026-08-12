// ============================================================
// server/src/config/videoTiers.ts
//
// THE ONLY FILE YOU TOUCH WHEN PRICING CHANGES.
//
// Every cost calculation in the codebase — controller credit
// checks, payment catalog, margin reconciliation reports —
// derives from this file. Never hardcode a price, seconds
// value, or model name anywhere else.
//
// Vendor : MiniMax Hailuo-2.3-Fast, PAYG API
// Rate   : $0.28 per 6-second clip at 768P (text/image-to-video)
// Source : MiniMax platform dashboard, confirmed July 2026
// Action : Re-verify against dashboard before each quarterly review.
//          If the rate changes, update WHOLESALE_USD_PER_6S_CLIP only —
//          every downstream number recalculates automatically.
// ============================================================

// ── Plan identifier type ────────────────────────────────────
export type PlanId = "free" | "starter" | "standard" | "pro" | "creator";

// Product-level cap for one submitted generation. Longer wallet balances can
// be spent across multiple generations; each generation is chained into the
// vendor-sized calls defined by maxSecondsPerCall below.
export const MAX_GENERATION_SECONDS = 120;

// ── Tier shape ──────────────────────────────────────────────
export interface VideoTier {
  planId: PlanId;
  label: string;           // shown in UI and payment catalog
  priceINR: number;        // final price charged to user (GST-inclusive when GST_ENABLED=true)
  totalSeconds: number;    // total video seconds this purchase unlocks (1 credit = 1 second)
  maxSecondsPerCall: number; // Hailuo hard cap per single API call — worker chains beyond this
  isFreeTrial: boolean;    // true = gated by fingerprint, not credit balance
}

// ── Wholesale cost constants ─────────────────────────────────
// All margin calculations derive from these two numbers.
export const WHOLESALE_USD_PER_6S_CLIP = 0.28;
export const WHOLESALE_USD_PER_SEC     = WHOLESALE_USD_PER_6S_CLIP / 6; // ≈ $0.04667/s

// Buffered FX rate. Today's spot is ~₹94/$, but using ₹100 as a
// forward buffer protects margin if INR weakens. Review quarterly.
// If INR strengthens materially, you can pass the gain back as more
// seconds per tier rather than cutting prices — better for retention.
export const USD_TO_INR = 100;

// Derived — ₹4.667/s wholesale. Referenced in margin calculations below.
export const WHOLESALE_INR_PER_SEC = WHOLESALE_USD_PER_SEC * USD_TO_INR;

// ── Helper: compute wholesale cost in INR for N seconds ─────
export function wholesaleCostINR(seconds: number): number {
  return Math.round(WHOLESALE_INR_PER_SEC * seconds * 100) / 100;
}

// ── Helper: compute margin for a tier ───────────────────────
export function marginINR(tier: VideoTier): number {
  return Math.round((tier.priceINR - wholesaleCostINR(tier.totalSeconds)) * 100) / 100;
}

export function marginPct(tier: VideoTier): number {
  if (tier.priceINR === 0) return 0;
  return Math.round((marginINR(tier) / tier.priceINR) * 100 * 10) / 10;
}

// ── Tier definitions ─────────────────────────────────────────
//
// MARGIN SUMMARY (at USD_TO_INR = 100):
//   free     ₹0      10s    cost ₹47     → -₹47  (bounded acquisition cost, ~₹47/user max)
//   starter  ₹179    30s    cost ₹140    → +₹39  (+22%)
//   standard ₹549    90s    cost ₹420    → +₹129 (+23%)
//   pro      ₹1099   180s   cost ₹840    → +₹259 (+24%)
//   creator  ₹1899   320s   cost ₹1493   → +₹406 (+21%)
//
// All paid tiers are profitable. Free tier loss is bounded to
// ~₹47/unique human by the fingerprint gate in wallet.service.ts.
export const VIDEO_TIERS: Record<PlanId, VideoTier> = {
  free: {
    planId:            "free",
    label:             "Free",
    priceINR:          0,
    totalSeconds:      10,   // enough for a real hook, not just a teaser
    maxSecondsPerCall: 6,
    isFreeTrial:       true,
  },
  starter: {
    planId:            "starter",
    label:             "Starter",
    priceINR:          179,
    totalSeconds:      30,   // 5 × 6s clips → a complete short explanation
    maxSecondsPerCall: 6,
    isFreeTrial:       false,
  },
  standard: {
    planId:            "standard",
    label:             "Standard",
    priceINR:          549,
    totalSeconds:      90,   // 15 × 6s clips → a full topic walkthrough
    maxSecondsPerCall: 6,
    isFreeTrial:       false,
  },
  pro: {
    planId:            "pro",
    label:             "Pro",
    priceINR:          1099,
    totalSeconds:      180,  // 30 × 6s clips → 3-minute deep dive
    maxSecondsPerCall: 6,
    isFreeTrial:       false,
  },
  creator: {
    planId:            "creator",
    label:             "Creator",
    priceINR:          1899,
    totalSeconds:      320,  // 53 × 6s clips → multi-topic series
    maxSecondsPerCall: 6,
    isFreeTrial:       false,
  },
};

// ── chainPlan ────────────────────────────────────────────────
// Splits the user's total requested seconds into an array of
// per-call durations, each ≤ maxSecondsPerCall (Hailuo's hard limit).
//
// Example — Standard tier, user requests 90s:
//   chainPlan(VIDEO_TIERS.standard, 90) → [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6]
//   (fifteen 6s calls, stitched by ffmpeg in the worker)
//
// Never call Hailuo with more than maxSecondsPerCall in a single
// request — the API either errors or silently truncates.
export function chainPlan(tier: VideoTier, requestedSeconds: number): number[] {
  const calls: number[] = [];
  // Clamp to the tier's total allowance — prevents overspend if the
  // client somehow sends a duration larger than the purchased tier.
  let remaining = Math.min(requestedSeconds, tier.totalSeconds);
  while (remaining > 0) {
    const chunk = Math.min(tier.maxSecondsPerCall, remaining);
    calls.push(chunk);
    remaining -= chunk;
  }
  return calls;
}

// ── GST ──────────────────────────────────────────────────────
// GST registration is mandatory once annual turnover exceeds ₹20L
// (confirm exact threshold and service category with a CA — rules
// vary by state and service type). Keep GST_ENABLED=false until
// you're registered. When you flip it:
//   1. Set GST_ENABLED=true in production env
//   2. priceINR values above are treated as the FINAL GST-inclusive
//      price shown at checkout — NOT a base price GST is added on top of.
//      This avoids checkout sticker-shock and simplifies display logic.
//   3. gstBreakdown() gives you the split for invoice line items.
export const GST_ENABLED = process.env.GST_ENABLED === "true";
export const GST_RATE    = 0.18;

export interface GSTBreakdown {
  basePrice:  number; // price before GST (for invoice)
  gstAmount:  number; // GST portion
  finalPrice: number; // total charged to user (= priceINR above)
}

export function gstBreakdown(finalPriceINR: number): GSTBreakdown {
  if (!GST_ENABLED) {
    return { basePrice: finalPriceINR, gstAmount: 0, finalPrice: finalPriceINR };
  }
  const basePrice = Math.round(finalPriceINR / (1 + GST_RATE));
  const gstAmount = finalPriceINR - basePrice;
  return { basePrice, gstAmount, finalPrice: finalPriceINR };
}

// ── Margin reconciliation helper ─────────────────────────────
// Import and call this in a weekly cron or admin endpoint to verify
// your actual margin hasn't drifted from expectation (e.g. if
// USD_TO_INR or Hailuo rates change without you noticing).
export function printMarginSummary(): void {
  console.log("\n=== NeuroVid Tier Margin Summary ===");
  console.log(`Wholesale: $${WHOLESALE_USD_PER_6S_CLIP}/6s clip = ₹${WHOLESALE_INR_PER_SEC.toFixed(2)}/s at ₹${USD_TO_INR}/$\n`);
  (Object.values(VIDEO_TIERS) as VideoTier[]).forEach((tier) => {
    const cost = wholesaleCostINR(tier.totalSeconds);
    const margin = marginINR(tier);
    const pct = marginPct(tier);
    console.log(
      `${tier.planId.padEnd(10)} ₹${tier.priceINR.toString().padEnd(6)} ${tier.totalSeconds}s  ` +
      `cost ₹${cost.toFixed(0).padEnd(6)} margin ₹${margin.toFixed(0).padEnd(6)} (${pct}%)`
    );
  });
  console.log("====================================\n");
}
