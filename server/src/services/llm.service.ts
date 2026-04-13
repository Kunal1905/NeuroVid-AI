import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_API || "";

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

const PRIMARY_MODEL = process.env.LLM_MODEL || "gemini-2.5-flash";
// Use a known v1beta-supported model as fallback
const FALLBACK_MODEL = process.env.LLM_FALLBACK_MODEL || "gemini-2.0-flash";
const MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES || 3);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (err: any) => {
  const status = err?.status;
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("high demand") || msg.includes("timeout");
};

const extractRetryDelayMs = (err: any): number | null => {
  const details = err?.errorDetails || err?.details || err?.error?.details;
  if (!Array.isArray(details)) return null;
  for (const d of details) {
    if (d?.["@type"]?.includes("RetryInfo") && typeof d?.retryDelay === "string") {
      const m = d.retryDelay.match(/^(\d+)(s|ms)$/);
      if (m) {
        const value = Number(m[1]);
        return m[2] === "s" ? value * 1000 : value;
      }
    }
  }
  return null;
};

type LlmContext = {
  sessionId?: string;
  stage?: string;
};

export default async function llmService(
  prompt: string,
  context: LlmContext = {},
): Promise<string> {
  if (!genAI) {
    throw new Error("LLM unavailable: missing GOOGLE_API_KEY");
  }
  try {
    const models = [PRIMARY_MODEL, FALLBACK_MODEL].filter(Boolean);
    const ctxLabel = `[LLM${context.stage ? `:${context.stage}` : ""}${
      context.sessionId ? `:${context.sessionId}` : ""
    }]`;

    for (const modelName of models) {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(
            `${ctxLabel} Sending request to Gemini API... model=${modelName} attempt=${attempt + 1}/${MAX_RETRIES} promptLength=${prompt.length}`,
          );
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          if (!text || !text.trim()) {
            throw new Error("LLM returned empty response");
          }
          console.log(
            `${ctxLabel} Response received: ${text.length} characters (model=${modelName})`,
          );
          return text.trim();
        } catch (err: any) {
          console.error(`${ctxLabel} Gemini API Error:`, {
            message: err?.message,
            status: err?.status,
            code: err?.code,
            details: err?.errorDetails || "No details",
            model: modelName,
            attempt: attempt + 1,
          });
          if (!shouldRetry(err) || attempt === MAX_RETRIES - 1) {
            break;
          }
          const retryDelayMs = extractRetryDelayMs(err);
          const backoffMs =
            retryDelayMs ??
            (Math.min(8000, 1000 * 2 ** attempt) +
              Math.floor(Math.random() * 250));
          console.log(
            `${ctxLabel} Backing off for ${backoffMs}ms${retryDelayMs ? " (server suggested)" : ""}`,
          );
          await sleep(backoffMs);
        }
      }
    }

    throw new Error("LLM error: all retries exhausted");
  } catch (err: any) {
    throw new Error(`LLM error: ${err?.message || "unknown error"}`);
  }
}
