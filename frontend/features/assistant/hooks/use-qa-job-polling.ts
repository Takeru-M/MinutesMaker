"use client";

import { useEffect, useState } from "react";
import type { MeetingQAJobStatus } from "@/lib/api-types-assistant";
import { getMeetingQAJobStatus } from "@/lib/api-client";

export interface UseQAJobPollingOptions {
  jobId: string | null;
  onComplete?: (result: object) => void;
  onError?: (error: string) => void;
  initialInterval?: number;
  maxInterval?: number;
}

export function useQAJobPolling({
  jobId,
  onComplete,
  onError,
  initialInterval = 1000,
  maxInterval = 5000,
}: UseQAJobPollingOptions) {
  const [status, setStatus] = useState<MeetingQAJobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<object | null>(null);
  const [interval, setInterval] = useState(initialInterval);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        setIsLoading(true);
        const data = await getMeetingQAJobStatus(jobId);

        setStatus(data.status as MeetingQAJobStatus);

        if (data.error) {
          setError(data.error);
          onError?.(data.error);
        }

        if (data.status === "finished" && data.result) {
          setResult(data.result);
          onComplete?.(data.result);
        } else if (data.status === "failed") {
          const errorMsg = data.error || "Job failed";
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Polling failed";
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    // Poll immediately on mount
    poll();

    // Set up polling interval
    const pollInterval = setInterval(async () => {
      await poll();

      // Increase interval up to maxInterval if status is queued/started
      setInterval((prev) => (prev < maxInterval ? Math.min(prev * 1.5, maxInterval) : maxInterval));
    }, interval);

    return () => clearInterval(pollInterval);
  }, [jobId, onComplete, onError, interval, maxInterval]);

  return {
    status,
    isLoading,
    error,
    result,
  };
}
