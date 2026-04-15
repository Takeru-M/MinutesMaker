"use client";

import { useAppSelector } from "@/store/hooks";
import { selectCurrentOrgId } from "@/store/selectors/auth";
import { apiFetch } from "@/lib/api-client";

type FetchInit = RequestInit & {
  /**
   * Whether to include the current org ID in the request
   * If false, no org ID is added
   * If true, org ID is added as x-org-id header
   * Default: true
   */
  includeOrgId?: boolean;
};

/**
 * Hook for fetching API with automatic org ID inclusion
 *
 * By default, adds current org ID as x-org-id header if available.
 * Pass includeOrgId: false to bypass this.
 *
 * Usage:
 * ```
 * const fetch = useOrgAwareFetch();
 * await fetch('/api/v1/endpoint'); // Automatically includes x-org-id
 * await fetch('/api/v1/endpoint', { includeOrgId: false }); // Skip org ID
 * ```
 */
export function useOrgAwareFetch() {
  const currentOrgId = useAppSelector(selectCurrentOrgId);

  const fetch = async (path: string, init?: FetchInit): Promise<Response> => {
    const { includeOrgId = true, ...rest } = init || {};

    const headers = new Headers(rest.headers || {});

    // Add org ID header if:
    // 1. includeOrgId is not false
    // 2. currentOrgId is available
    // 3. It's not an auth endpoint (login, logout, me, refresh)
    const isAuthEndpoint = /^\/api\/v1\/auth\/(login|logout|me|refresh|login-options)($|\/)/.test(path);

    if (includeOrgId && currentOrgId && !isAuthEndpoint) {
      headers.set("x-org-id", String(currentOrgId));
    }

    return apiFetch(path, {
      ...rest,
      headers,
    });
  };

  return fetch;
}

/**
 * Utility to add org ID header to any fetch init object
 * Useful for cases where hook cannot be used
 */
export function addOrgIdHeader(init: RequestInit | undefined, orgId: number | null): RequestInit {
  if (!orgId) {
    return init || {};
  }

  const headers = new Headers(init?.headers || {});
  headers.set("x-org-id", String(orgId));

  return {
    ...init,
    headers,
  };
}
