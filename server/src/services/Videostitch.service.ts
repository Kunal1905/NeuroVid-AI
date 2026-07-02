// server/src/services/videoStitch.service.ts
//
// Hailuo returns one URL per 6-second clip. This downloads each clip,
// concatenates them with ffmpeg (stream copy, no re-encode — fast and
// lossless since all clips come from the same model/resolution), and
// uploads the final mp4 to object storage. Requires ffmpeg installed on
// the worker host/container (apt install ffmpeg, or use a Docker base
// image that already has it — e.g. linuxserver or jrottenberg/ffmpeg
// as a sidecar, or just `apt-get install -y ffmpeg` in your Dockerfile).
//
// Object storage: this stub uploads to S3-compatible storage (works for
// both AWS S3 and Cloudflare R2, since R2 is S3-API-compatible). Swap in
// your actual SDK client; the interface below is intentionally minimal.

import { promises as fs } from "fs";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import crypto from "crypto";

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download clip: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

export async function stitchClips(clipUrls: string[], sessionId: string): Promise<string> {
  if (clipUrls.length === 0) {
    throw new Error("stitchClips called with no clips");
  }

  const workDir = path.join(os.tmpdir(), `stitch_${sessionId}_${crypto.randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    // 1. Download every clip
    const localPaths: string[] = [];
    for (let i = 0; i < clipUrls.length; i++) {
      const dest = path.join(workDir, `clip_${i}.mp4`);
      await downloadToFile(clipUrls[i], dest);
      localPaths.push(dest);
    }

    // 2. Single clip — no concat needed, just use it directly
    const outputPath = path.join(workDir, "final.mp4");
    if (localPaths.length === 1) {
      await fs.copyFile(localPaths[0], outputPath);
    } else {
      // ffmpeg concat demuxer — requires a manifest file listing inputs.
      // Stream copy (-c copy) avoids re-encoding, which is fast and
      // lossless as long as all clips share codec/resolution (they will,
      // since they all come from the same Hailuo model call).
      const manifestPath = path.join(workDir, "manifest.txt");
      const manifest = localPaths.map((p) => `file '${p}'`).join("\n");
      await fs.writeFile(manifestPath, manifest);

      await runFfmpeg([
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", manifestPath,
        "-c", "copy",
        outputPath,
      ]);
    }

    // 3. Upload to object storage — replace this with your actual S3/R2 client.
    const finalUrl = await uploadToObjectStorage(outputPath, `videos/${sessionId}.mp4`);
    return finalUrl;
  } finally {
    // Always clean up temp files, even on failure — these are large
    // binary files and the worker container's disk is not infinite.
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Placeholder — wire to your actual S3/R2 SDK. Example using @aws-sdk/client-s3:
//
//   import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
//   const s3 = new S3Client({ region: "auto", endpoint: process.env.R2_ENDPOINT, credentials: {...} });
//   await s3.send(new PutObjectCommand({ Bucket: "neurovid-videos", Key: key, Body: fileBuffer }));
//   return `${process.env.R2_PUBLIC_URL}/${key}`;
async function uploadToObjectStorage(localPath: string, key: string): Promise<string> {
  throw new Error(
    `uploadToObjectStorage not implemented — wire to S3/R2 SDK. Attempted upload: ${localPath} -> ${key}`
  );
}