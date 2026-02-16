// server/src/services/aiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai';

let geminiModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
let veoModel:
  | ReturnType<VertexAI['preview']['getGenerativeModel']>
  | null = null;

function getGeminiModel() {
  if (geminiModel) return geminiModel;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  return geminiModel;
}

function getVeoModel() {
  if (veoModel) return veoModel;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID is not set');
  }
  const vertexAI = new VertexAI({
    project: projectId,
    location: 'us-central1',
  });
  veoModel = vertexAI.preview.getGenerativeModel({
    model: 'veo-2.0-generate-001',
  });
  return veoModel;
}

/**
 * Calls Gemini with your exact prompt → returns structured JSON
 */
export async function generateStructuredScript(prompt: string) {
  console.log('[Gemini] Generating structured JSON script...');

  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const json = JSON.parse(text);
    console.log('[Gemini] JSON parsed successfully');
    return json; // { title, scenes: [...] }
  } catch (e) {
    console.error('JSON parse failed, raw text:', text);
    return { title: 'Generated Video', scenes: [] };
  }
}

/**
 * Generate final video using Veo
 */
export async function generateVideoWithVeo(fullScript: string): Promise<string> {
  console.log('[Veo] Starting video generation...');

  try {
    if (!fullScript.trim()) {
      throw new Error('Full script is empty');
    }
    const model = getVeoModel();
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `Create a realistic talking-head educational video. Full script:\n\n${fullScript}` }],
        },
      ],
    });

    const videoUri = response.response.candidates?.[0]?.content?.parts?.[0]?.fileData?.fileUri;
    if (!videoUri) throw new Error('No video URI from Veo');

    console.log(`[Veo] Video ready → ${videoUri}`);
    return videoUri;
  } catch (err: any) {
    console.error('Veo failed:', err.message);
    return 'https://picsum.photos/id/1015/1280/720'; // fallback
  }
}
