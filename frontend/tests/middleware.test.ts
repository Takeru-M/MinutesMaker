import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    nextUrl: { pathname: string; search: string };
    cookies: { get: (name: string) => { value: string } | undefined };

    constructor(url: string, init?: { cookies?: Record<string, string> }) {
      const parsed = new URL(url);
      this.url = url;
      this.nextUrl = { pathname: parsed.pathname, search: parsed.search };
      const cookieMap = init?.cookies ?? {};
      this.cookies = {
        get: (name: string) =>
          cookieMap[name] !== undefined ? { value: cookieMap[name] } : undefined,
      };
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      next: vi.fn(() => ({ type: "next" as const })),
      redirect: vi.fn((url: URL) => ({ type: "redirect" as const, redirectUrl: url.toString() })),
    },
  };
});

import { NextRequest, NextResponse } from "next/server";
import { middleware } from "@/middleware";

function makeRequest(pathname: string, options?: { cookies?: Record<string, string>; search?: string }) {
  const url = `http://localhost${pathname}${options?.search ?? ""}`;
  return new NextRequest(url, { cookies: options?.cookies });
}

const mockedNextResponse = vi.mocked(NextResponse, true);

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedNextResponse.next.mockReturnValue({ type: "next" } as any);
    mockedNextResponse.redirect.mockImplementation(
      (url: URL) => ({ type: "redirect", redirectUrl: url.toString() }) as any,
    );
  });

  describe("static assets - skip auth check", () => {
    test.each([
      ["/_next/static/chunk.js", "/_next prefix"],
      ["/_next/image?url=foo", "/_next image"],
      ["/favicon.ico", "favicon"],
      ["/logo.png", ".png extension"],
      ["/styles/main.css", ".css extension"],
      ["/scripts/app.js", ".js extension"],
      ["/images/hero.jpg", ".jpg extension"],
      ["/icons/icon.svg", ".svg extension"],
    ])("passes through %s (%s)", (pathname) => {
      middleware(makeRequest(pathname) as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
      expect(mockedNextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe("PUBLIC_PATHS - prefix match", () => {
    test("passes through /login", () => {
      middleware(makeRequest("/login") as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
    });

    test("passes through /login/sso (prefix match)", () => {
      middleware(makeRequest("/login/sso") as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
    });

    test("passes through /api/health", () => {
      middleware(makeRequest("/api/health") as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
    });

    test("passes through /api/health/check (prefix match)", () => {
      middleware(makeRequest("/api/health/check") as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
    });

    test("passes through /api/pdf-proxy", () => {
      middleware(makeRequest("/api/pdf-proxy") as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
    });

    test("passes through /api/pdf-proxy/file.pdf (prefix match)", () => {
      middleware(makeRequest("/api/pdf-proxy/file.pdf") as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
    });
  });

  describe("PUBLIC_EXACT_PATHS - exact match only", () => {
    test("passes through /meeting-schedule (exact)", () => {
      middleware(makeRequest("/meeting-schedule") as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
    });

    test("passes through /admin (exact)", () => {
      middleware(makeRequest("/admin") as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
    });

    test("redirects /meeting-schedule/123 (not exact - no cookie)", () => {
      middleware(makeRequest("/meeting-schedule/123") as any);
      expect(mockedNextResponse.redirect).toHaveBeenCalledOnce();
    });

    test("redirects /admin/users (not exact - no cookie)", () => {
      middleware(makeRequest("/admin/users") as any);
      expect(mockedNextResponse.redirect).toHaveBeenCalledOnce();
    });
  });

  describe("authentication gate", () => {
    test("redirects to /login when no access_token cookie on protected path", () => {
      middleware(makeRequest("/minutes") as any);
      expect(mockedNextResponse.redirect).toHaveBeenCalledOnce();
    });

    test("passes through when access_token cookie is present", () => {
      middleware(makeRequest("/minutes", { cookies: { access_token: "tok" } }) as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
      expect(mockedNextResponse.redirect).not.toHaveBeenCalled();
    });

    test("redirect URL is /login", () => {
      middleware(makeRequest("/agenda") as any);
      const [[redirectUrl]] = (mockedNextResponse.redirect as any).mock.calls;
      expect(redirectUrl.pathname).toBe("/login");
    });

    test("redirect includes original path as redirect query param", () => {
      middleware(makeRequest("/agenda/new") as any);
      const [[redirectUrl]] = (mockedNextResponse.redirect as any).mock.calls;
      expect(redirectUrl.searchParams.get("redirect")).toBe("/agenda/new");
    });

    test("redirect preserves search params in redirect query param", () => {
      middleware(makeRequest("/search", { search: "?q=test" }) as any);
      const [[redirectUrl]] = (mockedNextResponse.redirect as any).mock.calls;
      expect(redirectUrl.searchParams.get("redirect")).toBe("/search?q=test");
    });

    test("redirects root / without cookie", () => {
      middleware(makeRequest("/") as any);
      expect(mockedNextResponse.redirect).toHaveBeenCalledOnce();
    });

    test("passes through /orgs/1/meetings with access_token", () => {
      middleware(makeRequest("/orgs/1/meetings", { cookies: { access_token: "t" } }) as any);
      expect(mockedNextResponse.next).toHaveBeenCalledOnce();
    });
  });
});
