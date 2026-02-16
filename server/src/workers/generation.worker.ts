import { Worker, Job } from "bullmq";
import { redisForBull } from "../config/redis";
import { db } from "../services/db";
import { generations } from "../models/generate";
import { eq } from "drizzle-orm";
import llmService from "../services/llm.service";
import { veoService } from "../services/veo.service";

interface GenerationJobData {
  sessionId: string;
}

interface GenerationRecord {
  sessionId: string;
  userId: string;
  topic: string;
  details: string;
  category?: string;
  language: string;
  duration: number;
  style: string;
  status: string;
  progress: number;
  script?: any;
  scenes?: any;
  quiz?: any;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

class GenerationWorker {
  public worker: Worker;

  constructor() {
    this.worker = new Worker(
      "generation",
      async (job: Job<GenerationJobData>) => {
        await this.processJob(job);
      },
      {
        connection: redisForBull,
        concurrency: 2,
        limiter: {
          max: 5,
          duration: 60000, // 5 jobs per minute
        },
      },
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.worker.on("active", (job) => {
      console.log(`🔥 Job ${job.id} started`, job.data);
    });

    this.worker.on("completed", (job) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err);
    });

    this.worker.on("progress", (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });
  }

  private async processJob(job: Job<GenerationJobData>): Promise<void> {
    const { sessionId } = job.data;

    console.log(
      `🚀 Starting generation job ${job.id} for session: ${sessionId}`,
    );

    try {
      console.time(`job:${job.id}:total`);
      if (!db) {
        throw new Error("Database disabled: set DATABASE_URL");
      }
      // Fetch generation data from database
      console.time(`job:${job.id}:getGeneration`);
      const generation = await this.getGeneration(sessionId);
      console.timeEnd(`job:${job.id}:getGeneration`);
      if (!generation) {
        throw new Error(`Generation not found for session: ${sessionId}`);
      }

      console.log(
        `📋 Processing generation: ${generation.topic} (${generation.duration}min)`,
      );

      // Stage 1: Generate Script
      console.time(`job:${job.id}:generateScript`);
      await this.updateStatus(sessionId, "GENERATING_SCRIPT", 20);
      const script = await this.generateScript(generation);
      console.timeEnd(`job:${job.id}:generateScript`);
      console.log(`📝 Script generated for session: ${sessionId}`);

      // Stage 2: Generate Quiz
      console.time(`job:${job.id}:generateQuiz`);
      await this.updateStatus(sessionId, "GENERATING_QUIZ", 40);
      const quiz = await this.generateQuiz(generation, script);
      console.timeEnd(`job:${job.id}:generateQuiz`);
      console.log(`❓ Quiz generated for session: ${sessionId}`);

      // Stage 3: Generate Video
      console.time(`job:${job.id}:generateVideo`);
      await this.updateStatus(sessionId, "GENERATING_VIDEO", 60);
      const videoUrl = await this.generateVideo(script);
      console.timeEnd(`job:${job.id}:generateVideo`);
      console.log(`🎬 Video generated for session: ${sessionId}`);

      // Stage 4: Complete Generation
      console.time(`job:${job.id}:saveResults`);
      await this.updateStatus(sessionId, "COMPLETED", 100);
      await this.saveResults(sessionId, script, quiz, videoUrl);
      console.timeEnd(`job:${job.id}:saveResults`);

      console.log(`🎉 Generation completed for session: ${sessionId}`);
      console.timeEnd(`job:${job.id}:total`);
    } catch (error) {
      console.error(`💥 Error processing job ${job.id}:`, error);
      await this.handleError(sessionId, error as Error);
      throw error; // Re-throw to trigger job retry
    }
  }

  private async getGeneration(
    sessionId: string,
  ): Promise<GenerationRecord | null> {
    try {
      const [row] = await db
        .select()
        .from(generations)
        .where(eq(generations.sessionId, sessionId))
        .limit(1);

      return (row as GenerationRecord) ?? null;
    } catch (error) {
      console.error("Error fetching generation:", error);
      throw new Error(
        `Failed to fetch generation: ${(error as Error).message}`,
      );
    }
  }

  private async updateStatus(
    sessionId: string,
    status: string,
    progress: number,
  ): Promise<void> {
    try {
      console.log(
        `➡️ Updating status ${status} (${progress}%) for session: ${sessionId}`,
      );
      await db
        .update(generations)
        .set({
          status: status as any,
          progress,
          updatedAt: new Date(),
        })
        .where(eq(generations.sessionId, sessionId));

      console.log(
        `📊 Status updated: ${status} (${progress}%) for session: ${sessionId}`,
      );
    } catch (error) {
      console.error("Error updating status:", error);
      throw new Error(`Failed to update status: ${(error as Error).message}`);
    }
  }

  private async generateScript(generation: GenerationRecord): Promise<any> {
    const aiStyleMap: Record<string, string> = {
      left: "structured, logical, step-by-step explanation",
      right: "story-driven, visual, emotional narration",
      balanced: "mixed logical and visual explanation",
    };

    function safeParseJson(text: string) {
      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error(`Non-JSON LLM response: ${text.slice(0, 200)}`);
      }
    }

    const aiStyle =
      aiStyleMap[generation.style] ?? "clear, beginner-friendly explanation";

    const prompt = `
Create an educational script as concise bullet points.

Return STRICT JSON in this format:

{
  "title": "",
  "bullets": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ]
}

Topic: ${generation.topic}
Details: ${generation.details}
Duration: ${generation.duration} minutes
Language: ${generation.language}
Teaching Style: ${aiStyle}

Rules:
- Use bullet points that explain each step clearly
- Keep each bullet short (1–2 sentences)
- Use simple language
- Do not return anything except JSON
`;

    try {
      const scriptText = await llmService(prompt);
      console.log(`🧪 Script raw length: ${scriptText?.length ?? 0}`);
      const script = safeParseJson(scriptText);

      // Validate script structure
      if (
        !script.title ||
        !Array.isArray(script.bullets) ||
        script.bullets.length === 0
      ) {
        throw new Error("Invalid script structure generated");
      }

      return script;
    } catch (error) {
      console.error("Error generating script:", error);
      throw new Error(`Script generation failed: ${(error as Error).message}`);
    }
  }

  private async generateQuiz(
    generation: GenerationRecord,
    script: any,
  ): Promise<any> {
    const quizPrompt = `
Based on this educational video script, create a quiz to test understanding:

Script Title: ${script.title}
Script Content: ${JSON.stringify(script.bullets, null, 2)}

Create a quiz with 5 multiple choice questions. Return STRICT JSON in this format:

{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Rules:
- Questions should test key concepts from the script
- Include explanations for each answer
- Make questions appropriate for the topic difficulty
- Do not return anything except JSON
`;

    try {
      function safeParseJson(text: string) {
      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error(`Non-JSON LLM response: ${text.slice(0, 200)}`);
      }
    }
      const quizText = await llmService(quizPrompt);
      console.log(`🧪 Quiz raw length: ${quizText?.length ?? 0}`);
      const quiz = safeParseJson(quizText);

      // Validate quiz structure
      if (
        !quiz.questions ||
        !Array.isArray(quiz.questions) ||
        quiz.questions.length === 0
      ) {
        throw new Error("Invalid quiz structure generated");
      }

      return quiz;
    } catch (error) {
      console.error("Error generating quiz:", error);
      throw new Error(`Quiz generation failed: ${(error as Error).message}`);
    }
  }

  private async generateVideo(script: any): Promise<string> {
    try {
      // Build full narration script for Veo
      const fullScript =
        script.bullets?.join("\n\n") ||
        script.title ||
        "";

      if (!fullScript.trim()) {
        throw new Error("Empty script content for video generation");
      }

      console.log(`🎥 Veo request length: ${fullScript.length}`);
      const videoUrl = await veoService.createVideo({ script: fullScript });

      if (!videoUrl) {
        throw new Error("Video generation returned empty URL");
      }

      return videoUrl;
    } catch (error) {
      console.error("Error generating video:", error);
      throw new Error(`Video generation failed: ${(error as Error).message}`);
    }
  }

  private async saveResults(
    sessionId: string,
    script: any,
    quiz: any,
    videoUrl: string,
  ): Promise<void> {
    try {
      await db
        .update(generations)
        .set({
          script,
          quiz,
          videoUrl,
          updatedAt: new Date(),
        })
        .where(eq(generations.sessionId, sessionId));

      console.log(`💾 Results saved for session: ${sessionId}`);
    } catch (error) {
      console.error("Error saving results:", error);
      throw new Error(`Failed to save results: ${(error as Error).message}`);
    }
  }

  private async handleError(sessionId: string, error: Error): Promise<void> {
    try {
      await db
        .update(generations)
        .set({
          status: "FAILED",
          progress: 0,
          updatedAt: new Date(),
        })
        .where(eq(generations.sessionId, sessionId));

      console.error(
        `💥 Generation failed for session: ${sessionId}`,
        error.message,
      );
    } catch (updateError) {
      console.error("Error updating failed status:", updateError);
    }
  }
}

// Export singleton instance
export const generationWorker = new GenerationWorker();
export default generationWorker;
