export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  backendBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
};
