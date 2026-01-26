import { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../services/db";
import { generations } from "../models/generate";
import { brainDominanceSurveys } from "../models";

// get current user's video sessionId
export const getGeneration = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).auth?.userId;
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const [generateData] = await db
      .select()
      .from(generations)
      .where(eq(generations.userId, authUser))
      .orderBy(desc(generations.createdAt));

    if (!generateData) {
      return res.status(404).json({ error: "Generation data is not found" });
    }
    console.log("✅ GET /getGeneration hit");
    res.json(generateData);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const submitGeneration = async (req: Request, res: Response) => {
  console.log("====== SUBMIT GENERATION HIT ======");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  try {
    const authUserId = (req as any).auth?.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    //fetch brain dominance
    const [survey] = await db
      .select()
      .from(brainDominanceSurveys)
      .where(eq(brainDominanceSurveys.userId, authUserId))
      .limit(1);

    if (!survey) {
      return res.status(403).json({
        error: "Brain dominance survey not completed",
      });
    }
    const aiStyleMap: Record<string, string> = {
      left: "structured, logical, step-by-step explanation",
      right: "story-driven, visual, emotional narration",
      balanced: "mixed logical and visual explanation",
    };

    const aiStyle =
      aiStyleMap[survey.dominantQuadrant] ??
      "clear, beginner-friendly explanation";

    //fetch details from the form
    const {
      topic,
      details,
      category,
      language,
      duration,
      style,
      status,
      progress,
    } = req.body;

if (!topic || !details) {
  console.log("FAILED AT: missing required fields");
  return res.status(400).json({ error: "Missing required fields" });
}


    console.log("✅ POST /submitGeneration hit");
    console.log("Body:", req.body);

    const prompt = `
Create an educational video script.

Topic: ${topic}
Details: ${details}
Duration: ${duration} minutes
Language: ${language}

Teaching style:
${aiStyle}

The explanation must strictly follow this style.
`;

    const existing = await db
      .select()
      .from(generations)
      .where(eq(generations.userId, authUserId));

    if (existing.length > 0) {
      await db
        .update(generations)
        .set({
          topic,
          details,
          category,
          language,
          duration,
          style: survey.dominantQuadrant,
          status,
          progress,
          updatedAt: new Date(),
        })
        .where(eq(generations.userId, authUserId));
      return res.json({ message: "Generation updated successfully" });
    } else {
      const [newGeneration] = await db.insert(generations).values({
        userId: authUserId,
        topic,
        details,
        category,
        language,
        duration,
        style: survey.dominantQuadrant,
        status: "CREATED",
        progress: 0,
      }).returning();
      return res
        .status(201)
        .json({ message: "Generation Data submitted successfully", sessionId: newGeneration.sessionId });
    }
  } catch (error) {
    console.error("Error in submitGeneration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};