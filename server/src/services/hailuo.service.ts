// server/src/services/hailuo.service.ts
//
// MiniMax Hailuo-2.3-Fast video generation. Replaces the veo.service.ts
// stub, which returned a fake cdn.local URL and never called any real
// provider — every "completed" generation before this was fiction.
//
// MiniMax's video API is async/task-based: submit a generation task,
// poll until it succeeds, then fetch the resulting file's download URL.
// Confirm exact endpoint paths/payload shape against your live MiniMax
// dashboard docs before relying on this in production — field names below
// follow MiniMax's documented task-submit/query/retrieve pattern as of
// this writing, but verify before launch.

const MINIMAX_BASE_URL = "https://api.minimax.io/v1";

interface CreateClipInput {
  prompt: string;          // scene description derived from the script
  durationSeconds: 6;      // Hailuo-2.3-Fast native clip length
  resolution?: "768P";
}

interface MiniMaxTaskResponse {
  task_id: string;
  base_resp: { status_code: number; status_msg: string };
}

interface MiniMaxTaskStatus {
  task_id: string;
  status: "Preparing" | "Queueing" | "Processing" | "Success" | "Fail";
  file_id?: string;
  base_resp: { status_code: number; status_msg: string };
}

interface MiniMaxFileRetrieve {
  file: { download_url: string };
  base_resp: { status_code: number; status_msg: string };
}

function authHeaders() {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not set");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function submitTask(input: CreateClipInput): Promise<string> {
  const res = await fetch(`${MINIMAX_BASE_URL}/video_generation`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: "MiniMax-Hailuo-2.3",
      prompt: input.prompt,
      duration: input.durationSeconds,
      resolution: input.resolution ?? "768P",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`MiniMax submit failed: ${res.status} ${body}`), {
      status: res.status,
    });
  }

  const data: MiniMaxTaskResponse = await res.json();
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax submit error: ${data.base_resp?.status_msg}`);
  }
  return data.task_id;
}

async function pollTask(taskId: string, { timeoutMs = 120_000, intervalMs = 3000 } = {}): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${MINIMAX_BASE_URL}/query/video_generation?task_id=${taskId}`, {
      headers: authHeaders(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw Object.assign(new Error(`MiniMax poll failed: ${res.status} ${body}`), {
        status: res.status,
      });
    }

    const data: MiniMaxTaskStatus = await res.json();

    if (data.status === "Success" && data.file_id) {
      return data.file_id;
    }
    if (data.status === "Fail") {
      throw new Error(`MiniMax generation failed for task ${taskId}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`MiniMax generation timed out for task ${taskId}`);
}

async function retrieveFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${MINIMAX_BASE_URL}/files/retrieve?file_id=${fileId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`MiniMax file retrieve failed: ${res.status} ${body}`), {
      status: res.status,
    });
  }

  const data: MiniMaxFileRetrieve = await res.json();
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax file retrieve error: ${data.base_resp?.status_msg}`);
  }
  return data.file.download_url;
}

export const hailuoService = {
  // Generates ONE 6-second clip and returns a downloadable URL for it.
  // The worker calls this once per chunk from chainPlan() and stitches
  // the results with ffmpeg — Hailuo does not natively generate clips
  // longer than ~6-10s, so chaining is mandatory for anything longer.
  async createClip(prompt: string): Promise<string> {
    const taskId = await submitTask({ prompt, durationSeconds: 6, resolution: "768P" });
    const fileId = await pollTask(taskId);
    return retrieveFileUrl(fileId);
  },
};