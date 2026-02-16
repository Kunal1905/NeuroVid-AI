// server/src/controllers/generateController.ts
import { Request, Response } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../services/db";
import { generations } from "../models/generate"; // ← make sure this matches your model file
import { brainDominanceSurveys } from "../models/survey";
import { generationQueue } from "../queues/generation.queue";

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

    // Free trial limit: 3 videos per user
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(generations)
      .where(eq(generations.userId, authUserId));
    const used = Number(count || 0);
    const limit = 3;
    if (used >= limit) {
      return res.status(429).json({
        error: "Free trial limit reached",
        limit,
        used,
        remaining: 0,
      });
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

    const { topic, details, category, language, duration } = req.body;

    if (!topic || !details) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create new generation with CREATED status
    console.time("submitGeneration:insert");
    const [newGeneration] = await db
      .insert(generations)
      .values({
        userId: authUserId,
        topic,
        details,
        category,
        language,
        duration,
        style: survey.dominantQuadrant,
        status: "CREATED",
        progress: 0,
      })
      .returning();
    console.timeEnd("submitGeneration:insert");

    // after insert
    const sessionId = newGeneration.sessionId;
    console.log("✅ Generation created", { sessionId, userId: authUserId });

    // respond FIRST (avoid double-send)
    res.status(201).json({
      success: true,
      sessionId,
      limit,
      used: used + 1,
      remaining: Math.max(0, limit - (used + 1)),
    });
    console.timeEnd("submitGeneration:total");

    // Fire-and-forget background work to avoid blocking response
    (async () => {
      try {
        const job = await Promise.race([
          generationQueue.add(
            "generation-job",
            { sessionId },
            { attempts: 3, backoff: { type: "exponential", delay: 8000 } },
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Queue timeout after 5s")), 5000),
          ),
        ]);
        console.log("✅ Job enqueued", (job as any)?.id, { sessionId });
      } catch (queueError) {
        console.error("Queue operation failed:", queueError);
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

    const [gen] = await db
      .select()
      .from(generations)
      .where(eq(generations.sessionId, sessionId));

    if (!gen) {
      return res.status(404).json({ status: "not_found", progress: 0 });
    }

    res.json({
      status: gen.status,
      progress: gen.progress,
      videoUrl: gen.videoUrl,
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
