"use client";

import { useEffect, useState, useRef } from "react";
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

  // Keep latest callbacks in refs to avoid dependency array issues
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;

      try {
        setIsLoading(true);
        const data = await getMeetingQAJobStatus(jobId);

        if (!isMounted) return;

        setStatus(data.status as MeetingQAJobStatus);

        if (data.error) {
          setError(data.error);
          onErrorRef.current?.(data.error);
        }

        if (data.status === "finished" && data.result) {
          setResult(data.result);
          onCompleteRef.current?.(data.result);
        } else if (data.status === "failed") {
          const errorMsg = data.error || "Job failed";
          setError(errorMsg);
          onErrorRef.current?.(errorMsg);
        }
      } catch (err) {
        if (!isMounted) return;
        const errorMsg = err instanceof Error ? err.message : "Polling failed";
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
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

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [jobId, interval, maxInterval]);

  return {
    status,
    isLoading,
    error,
    result,
  };
}
