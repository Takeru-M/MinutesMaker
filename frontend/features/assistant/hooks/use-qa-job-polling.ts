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
    let currentDelay = initialInterval;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (!isMounted) return;

      try {
        setIsLoading(true);
        console.debug(`[STEP 4] Polling job status - job_id=${jobId}, delay=${currentDelay}ms`);
        const data = await getMeetingQAJobStatus(jobId);

        if (!isMounted) return;

        setStatus(data.status as MeetingQAJobStatus);
        console.debug(`[STEP 4] Job status received - job_id=${jobId}, status=${data.status}`);

        if (data.error) {
          console.error(`[STEP 4] Job error - job_id=${jobId}, error=${data.error}`);
          setError(data.error);
          onErrorRef.current?.(data.error);
        }

        const jobResult = (data as { qa_result?: object; ingest_result?: object }).qa_result
          ?? (data as { ingest_result?: object }).ingest_result;
        if (data.status === "finished" && jobResult) {
          console.debug(`[STEP 4] Job finished - job_id=${jobId}, calling onComplete callback`);
          setResult(jobResult);
          onCompleteRef.current?.(jobResult);
          return;
        } else if (data.status === "failed") {
          const errorMsg = data.error || "Job failed";
          console.error(`[STEP 4] Job failed - job_id=${jobId}, error=${errorMsg}`);
          setError(errorMsg);
          onErrorRef.current?.(errorMsg);
          return;
        }
      } catch (err) {
        if (!isMounted) return;
        const errorMsg = err instanceof Error ? err.message : "Polling failed";
        console.error(`[ERROR] Polling error - job_id=${jobId}, error=${errorMsg}`);
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      if (isMounted) {
        currentDelay = Math.min(currentDelay * 1.5, maxInterval);
        console.debug(`[STEP 4] Scheduling next poll - delay=${currentDelay}ms`);
        timerId = setTimeout(poll, currentDelay);
      }
    };

    console.debug(`[STEP 4] Starting polling - job_id=${jobId}`);
    poll();

    return () => {
      isMounted = false;
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [jobId, initialInterval, maxInterval]);

  return { status, isLoading, error, result };
}
