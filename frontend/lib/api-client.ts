import { env } from "@/lib/env";
import type { CurrentUserResponse } from "@/lib/api-types";

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = env.backendBaseUrl.trim();

  if (!baseUrl) {
    return normalizedPath;
  }

  const baseWithProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(baseUrl) ? baseUrl : `http://${baseUrl}`;
  const normalizedBase = baseWithProtocol.replace(/\/+$/, "");

  try {
    return new URL(normalizedPath, `${normalizedBase}/`).toString();
  } catch {
    return `${normalizedBase}${normalizedPath}`;
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(buildApiUrl(path), {
      credentials: "include",
      ...init,
    });
  } catch {
    return new Response(JSON.stringify({ detail: "API request failed" }), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  const response = await apiFetch("/api/v1/auth/me");

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<CurrentUserResponse>;
}

export async function logout(): Promise<void> {
  await apiFetch("/api/v1/auth/logout", {
    method: "POST",
  });
}
