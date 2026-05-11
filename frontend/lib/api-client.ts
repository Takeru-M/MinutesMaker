import { env } from "@/lib/env";
import type { CurrentUserResponse } from "@/lib/api-types";

export const API_QUERY_LIMIT = 500;

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

/**
 * Enqueue a meeting QA job (async)
 */
export async function enqueueMeetingQAJob(
  meetingId: number,
  payload: {
    question: string;
  },
) {
  const response = await apiFetch(`/api/v1/meetings/${meetingId}/qa/async`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to enqueue QA job: ${response.statusText}`);
  }

  return response.json() as Promise<{ job_id: string; status: string; job_type: string }>;
}

/**
 * Get QA job status
 */
export async function getMeetingQAJobStatus(jobId: string) {
  const response = await apiFetch(`/api/v1/meetings/qa/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`);
  }

  return response.json() as Promise<{
    job_id: string;
    status: string;
    progress?: number;
    result?: object | null;
    error?: string | null;
  }>;
}

/**
 * Enqueue a meeting ingest job (async)
 */
export async function enqueueMeetingIngestJob(meetingId: number) {
  const response = await apiFetch(`/api/v1/meetings/${meetingId}/qa/ingest/async`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to enqueue ingest job: ${response.statusText}`);
  }

  return response.json() as Promise<{ job_id: string; status: string; job_type: string }>;
}
