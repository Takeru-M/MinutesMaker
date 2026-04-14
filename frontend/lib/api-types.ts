export type AuthRole =
  | "platform_admin"
  | "guest_user"
  | "org_admin"
  | "org_user"
  | "auditor"
  | "user"
  | "admin";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  role: AuthRole;
};

export type RefreshResponse = {
  message: string;
};

export type CurrentUserResponse = {
  id: number;
  username: string;
  role: AuthRole;
};

export type AgendaMeetingType = "large" | "block" | "annual";

export type AgendaCreateRequest = {
  meeting_date: string;
  meeting_type: AgendaMeetingType;
  title: string;
  responsible: string | null;
  description: string | null;
  content: string | null;
  status: string;
  priority: number;
  agenda_types: string[];
  voting_items: string | null;
  pdf_s3_key: string | null;
  pdf_url: string | null;
  related_past_agenda_ids: number[];
  related_other_agenda_ids: number[];
};

export type AgendaListItemResponse = {
  id: number;
  title: string;
  meeting_date: string;
  meeting_type: string;
  meeting_title: string;
  meeting_scheduled_at: string;
};

export type AgendaSearchItemResponse = {
  id: number;
  title: string;
  meeting_id: number;
  meeting_title: string;
  meeting_type: string;
  meeting_scheduled_at: string;
};

export type AgendaDetailResponse = {
  id: number;
  meeting_id: number;
  meeting_date: string;
  meeting_type: string;
  title: string;
  responsible: string | null;
  description: string | null;
  content: string | null;
  status: string;
  priority: number;
  agenda_types: string[];
  voting_items: string | null;
  pdf_s3_key: string | null;
  pdf_url: string | null;
  order_no: number;
  is_active: boolean;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
  related_past_agenda_ids: number[];
  related_other_agenda_ids: number[];
};

export type AgendaPdfUploadResponse = {
  s3_key: string;
  url: string;
};

export type MeetingListItemResponse = {
  id: number;
  title: string;
  scheduled_at: string;
  location: string | null;
  meeting_type: string;
  meeting_scale: string;
};

export type MeetingAgendaItemResponse = {
  id: number;
  title: string;
  responsible: string | null;
  status: string;
  order_no: number;
  content: string | null;
  pdf_s3_key: string | null;
  pdf_url: string | null;
};

export type MeetingDetailResponse = {
  id: number;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string | null;
  status: string;
  meeting_type: "dormitory_general_assembly" | "block" | "department" | "committee" | "bureau" | "annual";
  meeting_scale: "large" | "small";
  agendas: MeetingAgendaItemResponse[];
};

export type NoticeListItemResponse = {
  id: number;
  title: string;
  content: string;
  category: "important" | "info" | "warning";
  created_at: string;
  published_at: string | null;
};

export type NoticeDetailResponse = {
  id: number;
  title: string;
  content: string;
  category: "important" | "info" | "warning";
  created_by_name: string;
  published_at: string | null;
};

export type NoticeStatus = "draft" | "published" | "archived";

export type NoticeAdminListItemResponse = {
  id: number;
  title: string;
  content: string;
  category: "important" | "info" | "warning";
  status: NoticeStatus;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type NoticeAdminDetailResponse = NoticeAdminListItemResponse & {
  created_by_name: string;
  updated_by_name: string | null;
};

export type NoticeCreateRequest = {
  title: string;
  content: string;
  category: "important" | "info" | "warning";
  status: NoticeStatus;
  is_pinned: boolean;
  published_at: string | null;
};

export type NoticeUpdateRequest = NoticeCreateRequest;

export type MinutesCreateRequest = {
  title: string;
  body: string | null;
  content_type: "text" | "pdf";
  pdf_s3_key: string | null;
  pdf_url: string | null;
};

export type MinutesResponse = {
  id: number;
  agenda_id: number;
  meeting_id: number;
  title: string;
  body: string;
  content_type: "text" | "pdf";
  pdf_s3_key: string | null;
  pdf_url: string | null;
  status: string;
  created_by: number;
  approved_by: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type MinutesListResponse = {
  total: number;
  items: MinutesResponse[];
};

export type MinutesPdfUploadResponse = {
  s3_key: string;
  url: string;
};

export type ContentItemResponse = {
  db_id: number;
  id: string;
  title: string;
  author: string;
  date: string;
};

export type ContentAttachmentResponse = {
  id: number;
  file_name: string;
  s3_key: string;
  file_size: number;
  mime_type: string;
  order_no: number;
  created_at: string;
};

export type ContentStatus = "draft" | "published" | "archived";

export type ContentWriteRequest = {
  title: string;
  content: string;
  status: ContentStatus;
};

export type ContentDetailResponse = {
  id: number;
  content_type: "repository" | "guide";
  title: string;
  content: string;
  status: string;
  created_by_name: string;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  attachments: ContentAttachmentResponse[];
};

export type ContentAdminDetailResponse = {
  id: number;
  content_type: "repository" | "guide";
  title: string;
  content: string;
  status: ContentStatus;
  created_by_name: string;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
  attachments: ContentAttachmentResponse[];
};