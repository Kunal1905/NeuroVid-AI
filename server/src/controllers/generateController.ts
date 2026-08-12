// server/src/controllers/generateController.ts
import { Request, Response } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../services/db";
import { generations } from "../models/generate"; // ← make sure this matches your model file
import { brainDominanceSurveys } from "../models/survey";
import { generationQueue, priorityForTier } from "../queues/generation.queue";
import { redisConnection } from "../config/redis";
import {
  MAX_GENERATION_SECONDS,
  VIDEO_TIERS,
  type PlanId,
} from "../config/VideoTiers";
import {
  hashFingerprint,
  hasUsedFreeTrial,
  redeemFreeTrial,
  reserveCreditsForGeneration,
  } from "../services/wallet.service";

/* ======================== GET LATEST GENERATION ======================== */
export const getGeneration = async (req: Request, res: Response) => {
  try {
    const authUserId = (req as any).auth?.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [generateData] = await db
      .select()
      .from(generations)
      .where(eq(generations.userId, authUserId))
      .orderBy(desc(generations.createdAt))
      .limit(1);

    if (!generateData) {
      return res.status(404).json({ error: "No generation found" });
    }

    res.json(generateData);
  } catch (error) {
    console.error("Error in getGeneration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ======================== SUBMIT GENERATION ======================== */
export const submitGeneration = async (req: Request, res: Response) => {
  console.log("====== SUBMIT GENERATION HIT ======");

  try {
    console.time("submitGeneration:total");
    const authUserId = (req as any).auth?.userId;
    if (!authUserId)
      return res.status(401).json({ error: "Authentication required" });

    const queue = generationQueue;
    if (!queue || !redisConnection) {
      console.error("Queue unavailable: missing REDIS_URL or queue instance");
      return res.status(503).json({
        error: "Queue unavailable",
        details: "REDIS_URL is not set. Configure Redis to enable video generation.",
      });
    }

    let redisReady = redisConnection.status === "ready";
    if (!redisReady) {
      try {
        await Promise.race([
          redisConnection.ping(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Redis ping timeout")), 3000),
          ),
        ]);
        redisReady = true;
      } catch {
        redisReady = false;
      }
    }

    if (!redisReady) {
      console.error("Queue unavailable: Redis not reachable");
      return res.status(503).json({
        error: "Queue unavailable",
        details: "Redis is not reachable. Verify REDIS_URL and network access.",
      });
    }

    const { topic, details, category, language, duration } = req.body;

    if (!topic || !topic.trim()) {
      console.error("Missing required fields", { topic, details });
      return res.status(400).json({ error: "Missing required fields" });
    }
    const safeDetails = typeof details === "string" ? details : "";
    const requestedSeconds = Math.max(
      1,
      Math.min(Number(duration) || 8, MAX_GENERATION_SECONDS),
    );

    const fingerprint = (req.body.deviceFingerprint as string) || "";
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const fingerprintHash = hashFingerprint(fingerprint, ip);

    const alreadyUsedFreeTrial = await hasUsedFreeTrial(fingerprintHash);

    let chosenTier: PlanId;
    let chosenSeconds = requestedSeconds;
    let creditsToCharge = 0;
    let isFreeTrial = false;

    if (!alreadyUsedFreeTrial) {
      // First-ever video for this device+IP — free tier, hard-capped at 10s.
      // This is the ONLY path that bypasses the credit balance check.
      chosenTier = "free";
      chosenSeconds = Math.min(requestedSeconds, VIDEO_TIERS.free.totalSeconds);
      creditsToCharge = 0;
      isFreeTrial = true;
    } else {
      // Paid path. All tiers route to the same model (Hailuo-2.3-Fast) —
      // the only thing that differs between Starter/Standard/Pro/Creator is
      // how many seconds the purchase unlocked, not video quality. Credits
      // and seconds are 1:1 under this pricing model, so creditsToCharge
      // IS the seconds requested — no per-tier rate lookup needed.
      const requestedPlan = (req.body.planId as PlanId) || "starter";
      if (requestedPlan === "free") {
        return res.status(402).json({
          error: "Free trial already used. Purchase a credit pack to continue.",
        });
      }
      if (!VIDEO_TIERS[requestedPlan]) {
        return res.status(400).json({ error: "Invalid planId" });
      }
      chosenTier = requestedPlan;
      const tier = VIDEO_TIERS[chosenTier];
      chosenSeconds = Math.min(requestedSeconds, tier.totalSeconds);
      creditsToCharge = chosenSeconds; // 1 credit = 1 second, see models/user.ts

      const reservation = await reserveCreditsForGeneration({
        clerkUserId: authUserId,
        creditsNeeded: creditsToCharge,
        sessionId: "pending", // session not created yet; logged again after insert below
      });

      if (!reservation.ok) {
        return res.status(402).json({
          error: "Insufficient credits",
          reason: (reservation as { ok: false; reason: string }).reason,
          creditsRequired: creditsToCharge,
        });
      }
    }

    // Fetch brain dominance
    console.time("submitGeneration:surveySelect");
    const [survey] = await db
      .select()
      .from(brainDominanceSurveys)
      .where(eq(brainDominanceSurveys.userId, authUserId))
      .limit(1);
    console.timeEnd("submitGeneration:surveySelect");

    if (!survey) {
      return res
        .status(403)
        .json({ error: "Brain dominance survey not completed" });
    }

    // Create new generation with CREATED status
    console.time("submitGeneration:insert");
    const [newGeneration] = await db
      .insert(generations)
      .values({
        userId: authUserId,
        topic,
        details: safeDetails,
        category,
        language,
        duration: chosenSeconds,
        style: survey.dominantQuadrant,
        status: "CREATED",
        progress: 0,
        routedModel: "hailuo-2.3-fast", // all tiers use the same model now; tier only governs total seconds
        creditsCharged: creditsToCharge,
        isFreeTrial: isFreeTrial ? 1 : 0,
      })
      .returning();
    console.timeEnd("submitGeneration:insert");

    // after insert
    const sessionId = newGeneration.sessionId;
    console.log("✅ Generation created", { sessionId, userId: authUserId, chosenTier, chosenSeconds, creditsToCharge });

    if (isFreeTrial) {
      const redemption = await redeemFreeTrial({ fingerprintHash, ip, clerkUserId: authUserId });
      if (!redemption.ok) {
        // Someone else won the race on this exact fingerprint between our
        // check above and now — fail closed rather than give a second free video.
        await db.delete(generations).where(eq(generations.sessionId, sessionId));
        return res.status(429).json({ error: "Free trial already used", reason: redemption.reason });
      }
    }

    // respond FIRST (avoid double-send)
    res.status(201).json({
      success: true,
      sessionId,
      isFreeTrial,
      tier: chosenTier,
      creditsCharged: creditsToCharge,
      secondsGenerated: chosenSeconds,
    });
    console.timeEnd("submitGeneration:total");

    // Fire-and-forget background work to avoid blocking response
    (async () => {
      try {
        const job = await Promise.race([
          queue.add(
            "generation-job",
            {
              sessionId,
              clerkUserId: authUserId,
              secondsRequested: chosenSeconds,
              creditsCharged: creditsToCharge,
              isFreeTrial,
            },
            {
              attempts: 3,
              backoff: { type: "exponential", delay: 8000 },
              priority: priorityForTier(chosenTier),
            },
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Queue timeout after 5s")), 5000),
          ),
        ]);
        console.log("✅ Job enqueued", (job as any)?.id, { sessionId, priority: priorityForTier(chosenTier) });
      } catch (queueError) {
        console.error("Queue operation failed:", queueError, { sessionId });
      }

      try {
        console.time("submitGeneration:updateQueued");
        await db
          .update(generations)
          .set({
            status: "QUEUED",
            progress: 10,
            updatedAt: new Date(),
          })
          .where(eq(generations.sessionId, sessionId));
        console.timeEnd("submitGeneration:updateQueued");
        console.log("✅ Status updated to QUEUED", { sessionId });
      } catch (updateError) {
        console.error("Failed to update status to QUEUED:", updateError);
      }
    })();

    return;
  } catch (error) {
    console.error("Error in submitGeneration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ======================== GET FULL GENERATION BY SESSION ======================== */
export const getGenerationBySession = async (req: Request, res: Response) => {
  try {
    const authUserId = (req as any).auth?.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { sessionId } = req.params;
    const [gen] = await db
      .select()
      .from(generations)
      .where(eq(generations.sessionId, sessionId));

    if (!gen) {
      return res.status(404).json({ error: "Generation not found" });
    }

    if (gen.userId !== authUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(gen);
  } catch (error) {
    console.error("Error in getGenerationBySession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ======================== GET STATUS FOR POLLING ======================== */
export const getGenerationStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    console.log("🔎 Status check", { sessionId });

    const [gen] = await db
      .select()
      .from(generations)
      .where(eq(generations.sessionId, sessionId));

    if (!gen) {
      console.log("⚠️ Status check: generation not found", { sessionId });
      return res.status(404).json({ status: "not_found", progress: 0 });
    }

    console.log("✅ Status check result", {
      sessionId,
      status: gen.status,
      progress: gen.progress,
      updatedAt: gen.updatedAt,
    });
    res.json({
      status: gen.status,
      progress: gen.progress,
      videoUrl: gen.videoUrl,
      updatedAt: gen.updatedAt,
    });
  } catch (error) {
    console.error("Error in getGenerationStatus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ======================== GET RECENT GENERATIONS ======================== */
export const getRecentGenerations = async (req: Request, res: Response) => {
  try {
    const authUserId = (req as any).auth?.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const limit = Math.min(Number(req.query.limit || 3), 10);
    const rows = await db
      .select({
        sessionId: generations.sessionId,
        topic: generations.topic,
        duration: generations.duration,
        createdAt: generations.createdAt,
        thumbnailUrl: generations.thumbnailUrl,
        status: generations.status,
      })
      .from(generations)
      .where(eq(generations.userId, authUserId))
      .orderBy(desc(generations.createdAt))
      .limit(limit);

    const payload = rows.map((r) => ({
      id: r.sessionId,
      title: r.topic,
      duration: r.duration,
      createdAt: r.createdAt,
      thumbnail: r.thumbnailUrl,
      status: r.status,
    }));

    res.json(payload);
  } catch (error) {
    console.error("Error in getRecentGenerations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
