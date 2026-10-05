// server/src/services/hailuo.service.ts
//
// MiniMax H3 video generation. Replaces the veo.service.ts
// stub, which returned a fake cdn.local URL and never called any real
// provider — every "completed" generation before this was fiction.
//
// MiniMax's video API is async/task-based: submit a generation task,
// poll until it succeeds, then return the task's download URL.

const MINIMAX_BASE_URL = "https://api.minimax.io";

export class VideoProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoProviderConfigurationError";
  }
}

const isConfigured = () => Boolean(process.env.MINIMAX_API_KEY?.trim());

interface CreateClipInput {
  prompt: string;          // scene description derived from the script
  durationSeconds: 6;      // MiniMax H3 accepts 4-15 second clips
  resolution?: "768P";
}

interface MiniMaxTaskResponse {
  task_id: string;
}

interface MiniMaxTaskStatus {
  task?: {
    status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
    content?: { url?: string };
    error?: unknown;
  };
}

function authHeaders() {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new VideoProviderConfigurationError("MINIMAX_API_KEY is not set");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function submitTask(input: CreateClipInput): Promise<string> {
  const res = await fetch(`${MINIMAX_BASE_URL}/v2/video_generation`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: "MiniMax-H3",
      content: [{ type: "text", text: input.prompt }],
      duration: input.durationSeconds,
      resolution: input.resolution ?? "768P",
      ratio: "16:9",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`MiniMax submit failed: ${res.status} ${body}`), {
      status: res.status,
    });
  }

  const data: MiniMaxTaskResponse = await res.json();
  if (!data.task_id) {
    throw new Error("MiniMax submit response did not include a task ID");
  }
  return data.task_id;
}

async function pollTask(taskId: string, { timeoutMs = 300_000, intervalMs = 10_000 } = {}): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${MINIMAX_BASE_URL}/v2/query/video_generation/${taskId}`, {
      headers: authHeaders(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw Object.assign(new Error(`MiniMax poll failed: ${res.status} ${body}`), {
        status: res.status,
      });
    }

    const data: MiniMaxTaskStatus = await res.json();

    const task = data.task;
    if (task?.status === "succeeded" && task.content?.url) {
      return task.content.url;
    }
    if (task?.status === "failed" || task?.status === "cancelled") {
      throw new Error(
        `MiniMax generation ${task.status} for task ${taskId}: ${JSON.stringify(task.error)}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`MiniMax generation timed out for task ${taskId}`);
}

export const hailuoService = {
  isConfigured,

  // Generates ONE 6-second clip and returns its downloadable URL.
  // The worker calls this once per chunk from chainPlan() and stitches
  // the results with ffmpeg — MiniMax H3 does not natively generate clips
  // longer than ~6-10s, so chaining is mandatory for anything longer.
  async createClip(prompt: string): Promise<string> {
    const taskId = await submitTask({ prompt, durationSeconds: 6, resolution: "768P" });
    return pollTask(taskId);
  },
};
