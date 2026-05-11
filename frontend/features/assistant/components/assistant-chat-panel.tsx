"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/features/assistant/types/chat-types";
import type { MeetingQAResponse } from "@/lib/api-types-assistant";
import { useQAJobPolling } from "@/features/assistant/hooks/use-qa-job-polling";
import { enqueueMeetingQAJob, enqueueGlobalQAJob } from "@/lib/api-client";
import { useI18n } from "@/features/i18n";
import styles from "./assistant-chat-panel.module.css";

export interface AssistantChatPanelProps {
  meetingId?: number | null;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 680;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;

export function AssistantChatPanel({ meetingId, isOpen, onClose }: AssistantChatPanelProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const dx = resizeStart.current.x - e.clientX;
      const dy = resizeStart.current.y - e.clientY;
      setSize({
        width: Math.max(MIN_WIDTH, resizeStart.current.width + dx),
        height: Math.max(MIN_HEIGHT, resizeStart.current.height + dy),
      });
    };
    const onMouseUp = () => {
      isResizing.current = false;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, ...size };
  };

  const currentJobIdRef = useRef(currentJobId);
  useEffect(() => {
    currentJobIdRef.current = currentJobId;
  }, [currentJobId]);

  const handleQAComplete = useCallback((result: object) => {
    console.debug("[STEP 6] QA job completed:", result);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.jobId === currentJobIdRef.current) {
        last.qaResult = result as MeetingQAResponse;
        last.isLoading = false;
        console.debug("[STEP 7] Answer added to chat message");
      }
      return updated;
    });
    setCurrentJobId(null);
  }, []);

  const handleQAError = useCallback((rawError: string) => {
    void rawError;
    console.error("[ERROR] QA job failed:", rawError);
    const friendlyMsg = t("assistant.error.jobFailed") || "回答の生成に失敗しました。しばらく待ってから再度お試しください。";
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.jobId === currentJobIdRef.current) {
        last.error = friendlyMsg;
        last.isLoading = false;
        last.content = friendlyMsg;
      }
      return updated;
    });
    setCurrentJobId(null);
  }, [t]);

  const { isLoading: isPolling } = useQAJobPolling({
    jobId: currentJobId,
    onComplete: handleQAComplete,
    onError: handleQAError,
  });

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question) return;

    console.debug("[STEP 0] User submitted question:", question);
    setIsSubmitting(true);
    setError(null);

    try {
      console.debug("[STEP 1] Adding user message to chat");
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", content: question, timestamp: Date.now() },
      ]);
      setInputValue("");

      console.debug("[STEP 2] Enqueueing QA job");
      const { job_id } = meetingId
        ? await enqueueMeetingQAJob(meetingId, { question })
        : await enqueueGlobalQAJob({ question });
      console.debug("[STEP 2] Job enqueued with ID:", job_id);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: t("assistant.loading.processing") || "Processing your question...",
        timestamp: Date.now(),
        jobId: job_id,
        isLoading: true,
      };
      console.debug("[STEP 3] Adding assistant loading message");
      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentJobId(job_id);
      console.debug("[STEP 3] Starting job polling for job_id:", job_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send question";
      console.error("[ERROR] Failed to submit question:", msg);
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "assistant", content: msg, timestamp: Date.now(), error: msg },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.panel} style={{ width: size.width, height: size.height }}>
      <div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} aria-hidden="true" />

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-primary)" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.296.772 4.41 2.067 6.092a.75.75 0 01.125.61c-.135.577-.43 1.252-.838 1.942z"
              clipRule="evenodd"
            />
            <circle cx="8" cy="12" r="1.3" fill="white" />
            <circle cx="12" cy="12" r="1.3" fill="white" />
            <circle cx="16" cy="12" r="1.3" fill="white" />
          </svg>
          <h2 className={styles.title}>{t("assistant.title") || "AI Assistant"}</h2>
        </div>
        <button className={styles.closeButton} onClick={onClose} aria-label={t("common.close") || "Close"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--color-text-secondary)" opacity="0.4" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2.296.772 4.41 2.067 6.092a.75.75 0 01.125.61c-.135.577-.43 1.252-.838 1.942z"
                clipRule="evenodd"
              />
              <circle cx="8" cy="12" r="1.3" fill="white" />
              <circle cx="12" cy="12" r="1.3" fill="white" />
              <circle cx="16" cy="12" r="1.3" fill="white" />
            </svg>
            <p>{t("assistant.emptyState") || "Ask a question about the meeting..."}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`${styles.message} ${styles[`message-${msg.role}`]}`}>
              <div className={styles.messageContent}>
                {msg.isLoading ? (
                  <div className={styles.loading}>
                    <span className={styles.spinner} />
                    {msg.content}
                  </div>
                ) : msg.role === "assistant" && msg.qaResult ? (
                  <div className={styles.qaResult}>
                    <p className={styles.answer}>{msg.qaResult.answer}</p>
                    {msg.qaResult.confidence && (
                      <p className={styles.confidence}>
                        {t("assistant.confidence") || "Confidence"}: {(msg.qaResult.confidence * 100).toFixed(0)}%
                      </p>
                    )}
                    {msg.qaResult.citations && msg.qaResult.citations.length > 0 && (
                      <div className={styles.citations}>
                        <p className={styles.citationsLabel}>{t("assistant.citations") || "Citations"}:</p>
                        <ul>
                          {msg.qaResult.citations.map((citation, idx) => (
                            <li key={idx} className={styles.citation}>
                              <small>
                                {citation.source_type}:{citation.source_entity_id} (score:{" "}
                                {citation.score.toFixed(2)})
                              </small>
                              <p>{citation.snippet.substring(0, 100)}...</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
                {msg.error && <p className={styles.errorMsg}>{msg.error}</p>}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t("assistant.placeholder") || "Ask a question..."}
            className={styles.input}
            disabled={isSubmitting || isPolling}
            maxLength={4000}
          />
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || isPolling || !inputValue.trim()}
            aria-label={t("assistant.send") || "Send"}
          >
            {isSubmitting || isPolling ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
