const ENV_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export const API_BASE =
  ENV_API_BASE || (process.env.NODE_ENV === "development" ? "http://localhost:3005" : "");

export const apiUrl = (path: string) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

if (!API_BASE && process.env.NODE_ENV === "production") {
  console.error(
    "[NeuroVid AI] Missing NEXT_PUBLIC_API_BASE_URL. Set it in your frontend environment variables.",
  );
}
