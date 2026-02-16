import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_API || "";

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export default async function llmService(prompt: string): Promise<string> {
  if (!genAI) {
    throw new Error("LLM unavailable: missing GOOGLE_API_KEY");
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text || !text.trim()) {
      throw new Error("LLM returned empty response");
    }
    return text.trim();
  } catch (err: any) {
    throw new Error(`LLM error: ${err?.message || "unknown error"}`);
  }
}
