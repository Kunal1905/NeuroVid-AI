export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3005";

export const apiUrl = (path: string) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
