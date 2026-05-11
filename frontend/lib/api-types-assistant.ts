/**
 * AI Assistant / QA types for async job management and responses
 */

export type MeetingQAJobScope = "meeting_only" | "cross_meeting" | "global";
export type MeetingQAJobIntent = "auto" | "context" | "lookup" | "term";
export type MeetingQAJobStatus = "queued" | "started" | "deferred" | "finished" | "stopped" | "failed";

export type MeetingQACitationResponse = {
  chunk_id: number;
  source_type: string;
  source_entity_id: number;
  chunk_index: number;
  score: number;
  snippet: string;
};

export type MeetingQARelatedSourceResponse = {
  source_type: string;
  source_entity_id: number;
  title: string;
  meeting_id: number;
  score: number;
};

export type MeetingQAResponse = {
  meeting_id: number;
  question: string;
  intent: string;
  scope: string;
  answer: string;
  model_name: string;
  confidence: number;
  citations: MeetingQACitationResponse[];
  related_sources: MeetingQARelatedSourceResponse[];
};

export type MeetingQARequest = {
  question: string;
  scope?: MeetingQAJobScope;
  intent?: MeetingQAJobIntent;
};

export type MeetingQAJobEnqueueResponse = {
  job_id: string;
  status: string;
  job_type: "meeting_qa" | "meeting_ingest";
};

export type MeetingQAJobStatusResponse = {
  job_id: string;
  status: MeetingQAJobStatus;
  progress?: number;
  result?: MeetingQAResponse | null;
  error?: string | null;
};

export type MeetingIngestRequest = {
  // Empty body for now, parameters in URL
};

export type MeetingIngestResponse = {
  meeting_id: number;
  indexed_sources: number;
  indexed_chunks: number;
  skipped_sources: number;
};
