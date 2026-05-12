import { describe, test, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api-client";
import { useOrgAwareFetch } from "@/hooks/use-org-aware-fetch";
import { createTestStore, renderHookWithStore } from "../helpers/render-with-store";
import { loginSucceeded, setCurrentOrg } from "@/store/slices/auth-slice";

const mockApiFetch = vi.mocked(apiFetch);

afterEach(() => {
  vi.clearAllMocks();
});

function makeMembers(orgId: number) {
  return [
    {
      organization: { id: orgId, name: "テスト組織" },
      role: "org_user" as const,
    },
  ];
}

describe("useOrgAwareFetch", () => {
  describe("currentOrgId がある場合", () => {
    test("x-org-id ヘッダーを付与してリクエストを送る", async () => {
      mockApiFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      const { wrapper } = renderHookWithStore(() => {}, {
        auth: {
          isAuthenticated: true,
          role: "org_user",
          username: "user",
          memberships: makeMembers(5),
          currentOrgId: 5,
        },
      });

      const { result } = renderHook(() => useOrgAwareFetch(), { wrapper });

      await act(async () => {
        await result.current("/api/v1/meetings");
      });

      const [, init] = mockApiFetch.mock.calls[0];
      const headers = new Headers((init as RequestInit)?.headers);
      expect(headers.get("x-org-id")).toBe("5");
    });

    test("既存ヘッダーに x-org-id をマージする", async () => {
      mockApiFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      const { wrapper } = renderHookWithStore(() => {}, {
        auth: {
          isAuthenticated: true,
          role: "org_user",
          username: "user",
          memberships: makeMembers(3),
          currentOrgId: 3,
        },
      });

      const { result } = renderHook(() => useOrgAwareFetch(), { wrapper });

      await act(async () => {
        await result.current("/api/v1/test", {
          headers: { "Content-Type": "application/json" },
        });
      });

      const [, init] = mockApiFetch.mock.calls[0];
      const headers = new Headers((init as RequestInit)?.headers);
      expect(headers.get("x-org-id")).toBe("3");
      expect(headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("currentOrgId がない場合", () => {
    test("x-org-id ヘッダーを付与しない", async () => {
      mockApiFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      const { wrapper } = renderHookWithStore(() => {}, {
        auth: { isAuthenticated: true, role: "org_user", username: "user", memberships: [] },
      });

      const { result } = renderHook(() => useOrgAwareFetch(), { wrapper });

      await act(async () => {
        await result.current("/api/v1/meetings");
      });

      const [, init] = mockApiFetch.mock.calls[0];
      const headers = new Headers((init as RequestInit)?.headers);
      expect(headers.get("x-org-id")).toBeNull();
    });
  });

  describe("includeOrgId: false の場合", () => {
    test("currentOrgId があっても x-org-id ヘッダーを付与しない", async () => {
      mockApiFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      const { wrapper } = renderHookWithStore(() => {}, {
        auth: {
          isAuthenticated: true,
          role: "org_user",
          username: "user",
          memberships: makeMembers(7),
          currentOrgId: 7,
        },
      });

      const { result } = renderHook(() => useOrgAwareFetch(), { wrapper });

      await act(async () => {
        await result.current("/api/v1/test", { includeOrgId: false });
      });

      const [, init] = mockApiFetch.mock.calls[0];
      const headers = new Headers((init as RequestInit)?.headers);
      expect(headers.get("x-org-id")).toBeNull();
    });
  });

  describe("認証エンドポイントは x-org-id をスキップ", () => {
    const authEndpoints = [
      "/api/v1/auth/login",
      "/api/v1/auth/logout",
      "/api/v1/auth/me",
      "/api/v1/auth/refresh",
      "/api/v1/auth/login-options",
      "/api/v1/auth/login/user",
    ];

    test.each(authEndpoints)("%s には x-org-id を付与しない", async (endpoint) => {
      mockApiFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      const { wrapper } = renderHookWithStore(() => {}, {
        auth: {
          isAuthenticated: true,
          role: "org_user",
          username: "user",
          memberships: makeMembers(1),
          currentOrgId: 1,
        },
      });

      const { result } = renderHook(() => useOrgAwareFetch(), { wrapper });

      await act(async () => {
        await result.current(endpoint, { method: "POST" });
      });

      const [, init] = mockApiFetch.mock.calls[0];
      const headers = new Headers((init as RequestInit)?.headers);
      expect(headers.get("x-org-id")).toBeNull();
    });

    test("非認証エンドポイント /api/v1/meetings には付与する", async () => {
      mockApiFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      const { wrapper } = renderHookWithStore(() => {}, {
        auth: {
          isAuthenticated: true,
          role: "org_user",
          username: "user",
          memberships: makeMembers(2),
          currentOrgId: 2,
        },
      });

      const { result } = renderHook(() => useOrgAwareFetch(), { wrapper });

      await act(async () => {
        await result.current("/api/v1/meetings");
      });

      const [, init] = mockApiFetch.mock.calls[0];
      const headers = new Headers((init as RequestInit)?.headers);
      expect(headers.get("x-org-id")).toBe("2");
    });
  });

  describe("リクエストオプションの転送", () => {
    test("method, body などを apiFetch に渡す", async () => {
      mockApiFetch.mockResolvedValue(new Response("ok", { status: 200 }));
      const { wrapper } = renderHookWithStore(() => {}, {});

      const { result } = renderHook(() => useOrgAwareFetch(), { wrapper });

      await act(async () => {
        await result.current("/api/v1/test", {
          method: "POST",
          body: JSON.stringify({ key: "value" }),
        });
      });

      const [, init] = mockApiFetch.mock.calls[0];
      expect((init as RequestInit).method).toBe("POST");
      expect((init as RequestInit).body).toBe(JSON.stringify({ key: "value" }));
    });
  });
});
