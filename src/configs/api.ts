export const chainoraApiBase =
  (import.meta.env.VITE_CHAINORA_API_URL as string | undefined)?.trim() ||
  'http://localhost:8080';
