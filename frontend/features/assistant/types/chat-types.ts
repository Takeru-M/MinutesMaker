import type { MeetingQAResponse } from "@/lib/api-types-assistant";

export type ChatMessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  jobId?: string; // For tracking async QA jobs
  qaResult?: MeetingQAResponse; // Result when job completes
  isLoading?: boolean; // Loading state for async jobs
  error?: string;
}

export interface ChatContextOptions {
  meetingId?: number | null;
  scope?: "meeting_only" | "cross_meeting" | "global";
  intent?: "auto" | "context" | "lookup" | "term";
}
