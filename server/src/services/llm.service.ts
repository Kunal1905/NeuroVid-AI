import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetch } from "undici";

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_API || "";

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

const PRIMARY_MODEL = process.env.LLM_MODEL || "gemini-2.5-flash";
// Use a known v1beta-supported model as fallback
const FALLBACK_MODEL = process.env.LLM_FALLBACK_MODEL || "gemini-2.0-flash";
const MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES || 3);
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 30000);
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const shouldRetry = (err: any) => {
  const status = err?.status;
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("high demand") || msg.includes("timeout");
};

const isQuotaExceeded = (err: any) => {
  const msg = String(err?.message || "").toLowerCase();
  const details = err?.errorDetails || err?.details || err?.error?.details;
  if (msg.includes("quota exceeded") || msg.includes("too many requests")) {
    return true;
  }
  if (!Array.isArray(details)) return false;
  return details.some(
    (d: { ["@type"]?: string }) =>
      d?.["@type"] === "type.googleapis.com/google.rpc.QuotaFailure",
  );
};

const isGoogleApiKeyInvalid = (err: any) => {
  const msg = String(err?.message || "").toLowerCase();
  const details = err?.errorDetails || err?.details || err?.error?.details;
  if (msg.includes("api key expired") || msg.includes("api_key_invalid")) {
    return true;
  }
  if (!Array.isArray(details)) return false;
  return details.some(
    (d: { reason?: string }) => d?.reason === "API_KEY_INVALID",
  );
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

const groqChatCompletion = async (
  prompt: string,
  context: LlmContext,
): Promise<string> => {
  if (!GROQ_API_KEY) {
    throw new Error("Groq unavailable: missing GROQ_API_KEY");
  }
  const ctxLabel = `[GROQ${context.stage ? `:${context.stage}` : ""}${
    context.sessionId ? `:${context.sessionId}` : ""
  }]`;
  console.log(
    `${ctxLabel} Sending request to Groq... model=${GROQ_MODEL} promptLength=${prompt.length}`,
  );

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Return only the requested JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`${ctxLabel} Groq API Error:`, response.status, text);
    throw new Error(`Groq error: ${response.status}`);
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) {
    throw new Error("Groq returned empty response");
  }
  console.log(
    `${ctxLabel} Response received: ${String(content).length} characters (model=${GROQ_MODEL})`,
  );
  return String(content).trim();
};

export default async function llmService(
  prompt: string,
  context: LlmContext = {},
): Promise<string> {
  const ctxLabel = `[LLM${context.stage ? `:${context.stage}` : ""}${
    context.sessionId ? `:${context.sessionId}` : ""
  }]`;
  if (!genAI) {
    if (GROQ_API_KEY) {
      console.log(
        `${ctxLabel} Google key missing, using Groq fallback`,
      );
      return await groqChatCompletion(prompt, context);
    }
    throw new Error(
      "LLM unavailable: missing GOOGLE_API_KEY and missing GROQ_API_KEY",
    );
  }
  try {
    const models = [PRIMARY_MODEL, FALLBACK_MODEL].filter(Boolean);
    let sawInvalidGoogleKey = false;
    let sawQuotaExceeded = false;

    for (const modelName of models) {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(
            `${ctxLabel} Sending request to Gemini API... model=${modelName} attempt=${attempt + 1}/${MAX_RETRIES} promptLength=${prompt.length}`,
          );
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await withTimeout(
            model.generateContent(prompt),
            LLM_TIMEOUT_MS,
            `${ctxLabel} Gemini request (${modelName})`,
          );
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
          if (isGoogleApiKeyInvalid(err)) {
            sawInvalidGoogleKey = true;
            console.log(
              `${ctxLabel} Gemini API key is invalid/expired, skipping further Gemini retries`,
            );
            break;
          }
          if (isQuotaExceeded(err) && GROQ_API_KEY) {
            sawQuotaExceeded = true;
            console.log(
              `${ctxLabel} Gemini quota exceeded and Groq is configured, switching to Groq immediately`,
            );
            break;
          }
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
      if (sawInvalidGoogleKey || sawQuotaExceeded) {
        break;
      }
    }

    if (GROQ_API_KEY) {
      console.log(
        `${ctxLabel} Gemini exhausted. Falling back to Groq model=${GROQ_MODEL}`,
      );
      return await groqChatCompletion(prompt, context);
    }

    if (sawInvalidGoogleKey) {
      throw new Error(
        "Gemini API key is invalid or expired, and GROQ_API_KEY is not configured",
      );
    }
    if (sawQuotaExceeded) {
      throw new Error(
        "Gemini quota exceeded and GROQ_API_KEY is not configured",
      );
    }

    throw new Error(
      "LLM error: all retries exhausted and GROQ_API_KEY is not configured",
    );
  } catch (err: any) {
    throw new Error(`LLM error: ${err?.message || "unknown error"}`);
  }
}
