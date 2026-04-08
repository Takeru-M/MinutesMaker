import { env } from "@/lib/env";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${env.backendBaseUrl}${path}`, {
    credentials: "include",
    ...init,
  });
}

export async function logout(): Promise<void> {
  await apiFetch("/api/v1/auth/logout", {
    method: "POST",
  });
}
