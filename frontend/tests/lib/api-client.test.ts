import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

let mockBackendBaseUrl = "";

vi.mock("@/lib/env", () => ({
  get env() {
    return { backendBaseUrl: mockBackendBaseUrl };
  },
}));

import { apiFetch, getCurrentUser, enqueueMeetingQAJob, getMeetingQAJobStatus } from "@/lib/api-client";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockBackendBaseUrl = "";
  });

  describe("URL 構築 - backendBaseUrl が空", () => {
    beforeEach(() => {
      mockBackendBaseUrl = "";
    });

    test("相対パスをそのまま使う", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
      await apiFetch("/api/v1/health");
      expect(fetch).toHaveBeenCalledWith("/api/v1/health", expect.any(Object));
    });

    test("スラッシュなしのパスにも / を付与する", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
      await apiFetch("api/v1/health");
      expect(fetch).toHaveBeenCalledWith("/api/v1/health", expect.any(Object));
    });
  });

  describe("URL 構築 - backendBaseUrl が設定済み", () => {
    beforeEach(() => {
      mockBackendBaseUrl = "http://backend:8000";
    });

    test("baseUrl + path を結合する", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
      await apiFetch("/api/v1/meetings");
      expect(fetch).toHaveBeenCalledWith(
        "http://backend:8000/api/v1/meetings",
        expect.any(Object),
      );
    });

    test("baseUrl の末尾スラッシュを除去して結合する", async () => {
      mockBackendBaseUrl = "http://backend:8000/";
      vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
      await apiFetch("/api/v1/test");
      expect(fetch).toHaveBeenCalledWith(
        "http://backend:8000/api/v1/test",
        expect.any(Object),
      );
    });

    test("プロトコルなし URL には http:// を付与する", async () => {
      mockBackendBaseUrl = "backend:8000";
      vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
      await apiFetch("/api/v1/test");
      expect(fetch).toHaveBeenCalledWith(
        "http://backend:8000/api/v1/test",
        expect.any(Object),
      );
    });
  });

  describe("絶対 URL はそのまま渡される", () => {
    test("http:// から始まる URL はそのまま使う", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
      await apiFetch("http://other-server.com/endpoint");
      expect(fetch).toHaveBeenCalledWith(
        "http://other-server.com/endpoint",
        expect.any(Object),
      );
    });

    test("https:// から始まる URL はそのまま使う", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
      await apiFetch("https://api.example.com/data");
      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.any(Object),
      );
    });
  });

  describe("credentials と headers", () => {
    test("credentials: include を含む", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
      await apiFetch("/api/v1/test");
      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect((init as RequestInit).credentials).toBe("include");
    });

    test("追加の headers がマージされる", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
      await apiFetch("/api/v1/test", {
        headers: { "Content-Type": "application/json" },
      });
      const [, init] = vi.mocked(fetch).mock.calls[0];
      const headers = new Headers((init as RequestInit).headers);
      expect(headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("fetch がスローした場合", () => {
    test("503 レスポンスを返す", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Connection refused"));
      const res = await apiFetch("/api/v1/test");
      expect(res.status).toBe(503);
    });

    test("503 のボディに detail が含まれる", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("down"));
      const res = await apiFetch("/api/v1/test");
      const body = await res.json();
      expect(body).toHaveProperty("detail");
    });
  });
});

describe("getCurrentUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("200 レスポンスでユーザーデータを返す", async () => {
    const userData = { id: 1, username: "taro", memberships: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(userData), { status: 200 })),
    );
    const result = await getCurrentUser();
    expect(result).toMatchObject({ id: 1, username: "taro" });
  });

  test("401 レスポンスで null を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });
});

describe("enqueueMeetingQAJob", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("POST /api/v1/meetings/:id/qa/async にリクエストを送る", async () => {
    const mockData = { job_id: "abc", status: "queued", job_type: "qa" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(mockData), { status: 200 })),
    );
    const result = await enqueueMeetingQAJob(42, { question: "test?" });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("/api/v1/meetings/42/qa/async");
    expect(result.job_id).toBe("abc");
  });

  test("レスポンスが ok でない場合はスロー", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500, statusText: "Internal Server Error" })),
    );
    await expect(enqueueMeetingQAJob(1, { question: "?" })).rejects.toThrow();
  });
});

describe("getMeetingQAJobStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("GET /api/v1/meetings/qa/jobs/:jobId にリクエストを送る", async () => {
    const mockData = { job_id: "xyz", status: "finished", job_type: "qa", qa_result: {} };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(mockData), { status: 200 })),
    );
    const result = await getMeetingQAJobStatus("xyz");
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("/api/v1/meetings/qa/jobs/xyz");
    expect(result.status).toBe("finished");
  });

  test("レスポンスが ok でない場合はスロー", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404, statusText: "Not Found" })),
    );
    await expect(getMeetingQAJobStatus("no-such-job")).rejects.toThrow();
  });
});
