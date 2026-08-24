const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim();

export const API_ORIGIN = (
  configuredOrigin || "http://localhost:5000"
).replace(/\/+$/, "");

export const API_BASE = `${API_ORIGIN}/api`;
