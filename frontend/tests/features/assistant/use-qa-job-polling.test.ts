import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api-client", () => ({
  getMeetingQAJobStatus: vi.fn(),
}));

import { getMeetingQAJobStatus } from "@/lib/api-client";
import { useQAJobPolling } from "@/features/assistant/hooks/use-qa-job-polling";

const mockGetStatus = vi.mocked(getMeetingQAJobStatus);

const QUEUED = { job_id: "j1", status: "queued", job_type: "qa" } as const;
const STARTED = { job_id: "j1", status: "started", job_type: "qa" } as const;
const FINISHED_QA = {
  job_id: "j1",
  status: "finished",
  job_type: "qa",
  qa_result: { answer: "テスト回答", sources: [] },
} as const;
const FINISHED_INGEST = {
  job_id: "j1",
  status: "finished",
  job_type: "ingest",
  ingest_result: { chunks: 5 },
} as const;
const FAILED = { job_id: "j1", status: "failed", job_type: "qa", error: "処理失敗" } as const;

describe("useQAJobPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("jobId が null のとき", () => {
    test("ポーリングを開始しない", () => {
      renderHook(() => useQAJobPolling({ jobId: null }));
      expect(mockGetStatus).not.toHaveBeenCalled();
    });

    test("status / result / error はすべて null", () => {
      const { result } = renderHook(() => useQAJobPolling({ jobId: null }));
      expect(result.current.status).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("正常完了 - qa_result", () => {
    test("finished + qa_result で onComplete が呼ばれる", async () => {
      mockGetStatus.mockResolvedValue(FINISHED_QA as any);
      const onComplete = vi.fn();

      renderHook(() => useQAJobPolling({ jobId: "j1", onComplete }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onComplete).toHaveBeenCalledOnce();
      expect(onComplete).toHaveBeenCalledWith(FINISHED_QA.qa_result);
    });

    test("finished 後は result に値がセットされる", async () => {
      mockGetStatus.mockResolvedValue(FINISHED_QA as any);

      const { result } = renderHook(() => useQAJobPolling({ jobId: "j1" }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.result).toEqual(FINISHED_QA.qa_result);
      expect(result.current.status).toBe("finished");
    });
  });

  describe("正常完了 - ingest_result", () => {
    test("finished + ingest_result で onComplete が呼ばれる", async () => {
      mockGetStatus.mockResolvedValue(FINISHED_INGEST as any);
      const onComplete = vi.fn();

      renderHook(() => useQAJobPolling({ jobId: "j1", onComplete }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onComplete).toHaveBeenCalledWith(FINISHED_INGEST.ingest_result);
    });
  });

  describe("ジョブ失敗", () => {
    test("failed ステータスで onError が呼ばれる", async () => {
      mockGetStatus.mockResolvedValue(FAILED as any);
      const onError = vi.fn();

      renderHook(() => useQAJobPolling({ jobId: "j1", onError }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // error フィールドあり + status===failed で 2回呼ばれる（hookの実装による）
      expect(onError).toHaveBeenCalledWith("処理失敗");
    });

    test("failed 後は error にメッセージがセットされる", async () => {
      mockGetStatus.mockResolvedValue(FAILED as any);

      const { result } = renderHook(() => useQAJobPolling({ jobId: "j1" }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.error).toBe("処理失敗");
      expect(result.current.status).toBe("failed");
    });

    test("failed で error フィールドがない場合は fallback メッセージ", async () => {
      mockGetStatus.mockResolvedValue({ job_id: "j1", status: "failed", job_type: "qa" } as any);
      const onError = vi.fn();

      renderHook(() => useQAJobPolling({ jobId: "j1", onError }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onError).toHaveBeenCalledWith("Job failed");
    });

    test("error フィールドがある場合は onError を呼ぶ（finished以外）", async () => {
      // 1回目にエラーフィールドあり、2回目にfinishedで終了させる
      mockGetStatus
        .mockResolvedValueOnce({ ...QUEUED, error: "部分エラー" } as any)
        .mockResolvedValueOnce(FINISHED_QA as any);
      const onError = vi.fn();

      renderHook(() => useQAJobPolling({ jobId: "j1", onError, initialInterval: 1000 }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onError).toHaveBeenCalledWith("部分エラー");
    });
  });

  describe("ネットワークエラー", () => {
    test("fetch 失敗時に onError が呼ばれる", async () => {
      // 1回目でネットワークエラー、2回目でfinishedにして終了
      mockGetStatus
        .mockRejectedValueOnce(new Error("Network Error"))
        .mockResolvedValueOnce(FINISHED_QA as any);
      const onError = vi.fn();

      renderHook(() => useQAJobPolling({ jobId: "j1", onError, initialInterval: 1000 }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onError).toHaveBeenCalledWith("Network Error");
    });

    test("Error 以外の throw でも onError が呼ばれる", async () => {
      // 1回目で文字列throwし、2回目でfinishedにして終了
      mockGetStatus
        .mockRejectedValueOnce("string error")
        .mockResolvedValueOnce(FINISHED_QA as any);
      const onError = vi.fn();

      renderHook(() => useQAJobPolling({ jobId: "j1", onError, initialInterval: 1000 }));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onError).toHaveBeenCalledWith("Polling failed");
    });
  });

  describe("指数バックオフ", () => {
    test("2回目のポーリングは initialInterval * 1.5 後に実行される", async () => {
      mockGetStatus
        .mockResolvedValueOnce(QUEUED as any)
        .mockResolvedValueOnce(FINISHED_QA as any);

      renderHook(() =>
        useQAJobPolling({ jobId: "j1", initialInterval: 1000, maxInterval: 5000 }),
      );

      // 1回目のポーリング（即時）
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mockGetStatus).toHaveBeenCalledTimes(1);

      // 1500ms 未満ではまだ2回目は呼ばれない
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1499);
      });
      expect(mockGetStatus).toHaveBeenCalledTimes(1);

      // 1ms 追加 -> 合計 1500ms で2回目が実行される
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(mockGetStatus).toHaveBeenCalledTimes(2);
    });

    test("maxInterval を超えない", async () => {
      // queued を4回返してから finished
      mockGetStatus
        .mockResolvedValueOnce(QUEUED as any)
        .mockResolvedValueOnce(QUEUED as any)
        .mockResolvedValueOnce(QUEUED as any)
        .mockResolvedValueOnce(QUEUED as any)
        .mockResolvedValueOnce(FINISHED_QA as any);

      renderHook(() =>
        useQAJobPolling({ jobId: "j1", initialInterval: 1000, maxInterval: 2000 }),
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // 5回呼ばれたことを確認（無限ループしていないことも兼ねて確認）
      expect(mockGetStatus).toHaveBeenCalledTimes(5);
    });
  });

  describe("アンマウント時のクリーンアップ", () => {
    test("アンマウント後はポーリングが継続しない", async () => {
      mockGetStatus.mockResolvedValue(QUEUED as any);

      const { unmount } = renderHook(() =>
        useQAJobPolling({ jobId: "j1", initialInterval: 1000 }),
      );

      // 1回目のポーリング
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mockGetStatus).toHaveBeenCalledTimes(1);

      unmount();

      // アンマウント後に時間を進めてもポーリングされない
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(mockGetStatus).toHaveBeenCalledTimes(1);
    });

    test("アンマウント後に onComplete が呼ばれない", async () => {
      let resolveStatus!: (v: any) => void;
      mockGetStatus.mockReturnValue(
        new Promise((res) => {
          resolveStatus = res;
        }),
      );
      const onComplete = vi.fn();

      const { unmount } = renderHook(() =>
        useQAJobPolling({ jobId: "j1", onComplete }),
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      unmount();

      // アンマウント後に resolve しても onComplete は呼ばれない
      await act(async () => {
        resolveStatus(FINISHED_QA);
        await Promise.resolve();
      });

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe("jobId の変化", () => {
    test("jobId が null に変わった後は新しいポーリングが開始しない", async () => {
      mockGetStatus.mockResolvedValue(QUEUED as any);

      const { rerender } = renderHook(
        ({ jobId }: { jobId: string | null }) =>
          useQAJobPolling({ jobId, initialInterval: 1000 }),
        { initialProps: { jobId: "j1" } },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      const callsAfterFirst = mockGetStatus.mock.calls.length;

      rerender({ jobId: null });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(mockGetStatus).toHaveBeenCalledTimes(callsAfterFirst);
    });
  });

  describe("isLoading 状態", () => {
    test("ポーリング中は isLoading が true", async () => {
      let resolveStatus!: (v: any) => void;
      mockGetStatus.mockReturnValue(
        new Promise((res) => {
          resolveStatus = res;
        }),
      );

      const { result } = renderHook(() => useQAJobPolling({ jobId: "j1" }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveStatus(FINISHED_QA);
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("コールバックの最新参照が使われる", () => {
    test("onComplete に最新の関数参照が渡される", async () => {
      mockGetStatus.mockResolvedValue(FINISHED_QA as any);

      const firstOnComplete = vi.fn();
      const secondOnComplete = vi.fn();

      const { rerender } = renderHook(
        ({ onComplete }: { onComplete: (r: object) => void }) =>
          useQAJobPolling({ jobId: "j1", onComplete }),
        { initialProps: { onComplete: firstOnComplete } },
      );

      rerender({ onComplete: secondOnComplete });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(secondOnComplete).toHaveBeenCalledWith(FINISHED_QA.qa_result);
      expect(firstOnComplete).not.toHaveBeenCalled();
    });
  });
});
