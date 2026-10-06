import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../services/db";
import { brainDominanceSurveys } from "../models/survey";
import llmService from "../services/llm.service";

const styleMap: Record<string, string> = {
  left: "Start with a direct definition, then explain the mechanism as a numbered sequence. Use precise terminology, cause-and-effect reasoning, and one compact worked example. Do not lead with a story or metaphor.",
  right: "Start with a concrete scenario or vivid metaphor, then use it to build intuition before naming the formal concept. Emphasize patterns, contrast, and a memorable takeaway. Do not lead with a definition or numbered procedure.",
  balanced: "Start with a relatable hook, then give a direct definition, a short explanation of the mechanism, and one concrete example.",
  none: "Use a clear, balanced style with short paragraphs.",
};

export const chatCompletion = async (req: Request, res: Response) => {
  try {
    const authUserId = (req as any).auth?.userId;
    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { messages } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages payload" });
    }

    const [survey] = await db
      .select()
      .from(brainDominanceSurveys)
      .where(eq(brainDominanceSurveys.userId, authUserId))
      .limit(1);

    const dominant = survey?.dominantQuadrant ?? "none";
    const style = styleMap[dominant] || styleMap.none;

    const systemPrompt = `
You are NeuroVid AI, a learning assistant.
Adapt your response style based on the user's brain dominance.
Dominance: ${dominant}
Style guidance: ${style}
Always:
- Explain clearly and concisely.
- Ask one quick follow-up question.
- Use Markdown when helpful.
- Follow the style guidance as a different response structure, not as cosmetic word changes.
`.trim();

    const chatHistory = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const prompt = `${systemPrompt}\n\n${chatHistory}\nASSISTANT:`;
    const reply = await llmService(prompt);

    return res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
