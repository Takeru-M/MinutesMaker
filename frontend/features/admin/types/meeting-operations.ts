export type MeetingOperationMeetingType =
  | "dormitory_general_assembly"
  | "block"
  | "department"
  | "committee"
  | "bureau"
  | "annual";

export type MeetingOperationAgendaMeetingType = "large" | "block" | "annual";

export type MeetingOperationMeetingFormValues = {
  description: string;
  scheduledAt: string;
  location: string;
  status: string;
  meetingType: MeetingOperationMeetingType;
};

export type MeetingOperationAgendaFormValues = {
  meetingDate: string;
  meetingType: MeetingOperationAgendaMeetingType;
  title: string;
  responsible: string;
  description: string;
  content: string;
  status: string;
  priority: string;
  agendaTypes: string;
  votingItems: string;
  pdfS3Key: string;
  pdfUrl: string;
  relatedPastAgendaIds: string;
  relatedOtherAgendaIds: string;
};

export const MEETING_TYPE_OPTIONS: Array<{
  value: MeetingOperationMeetingType;
  label: string;
}> = [
  { value: "dormitory_general_assembly", label: "大規模会議" },
  { value: "block", label: "ブロック会議" },
  { value: "department", label: "部会" },
  { value: "committee", label: "委員会" },
  { value: "bureau", label: "局" },
  { value: "annual", label: "年次会議" },
];

export const AGENDA_MEETING_TYPE_OPTIONS: Array<{
  value: MeetingOperationAgendaMeetingType;
  label: string;
}> = [
  { value: "large", label: "大規模会議" },
  { value: "block", label: "ブロック会議" },
  { value: "annual", label: "年次会議" },
];

export const MEETING_STATUS_OPTIONS = [
  { value: "scheduled", label: "予定" },
  { value: "published", label: "公開" },
  { value: "completed", label: "完了" },
  { value: "canceled", label: "中止" },
];

export const AGENDA_STATUS_OPTIONS = [
  { value: "draft", label: "下書き" },
  { value: "published", label: "公開" },
  { value: "archived", label: "アーカイブ" },
];

export const EMPTY_MEETING_FORM: MeetingOperationMeetingFormValues = {
  description: "",
  scheduledAt: "",
  location: "",
  status: "scheduled",
  meetingType: "dormitory_general_assembly",
};

export const EMPTY_AGENDA_FORM: MeetingOperationAgendaFormValues = {
  meetingDate: "",
  meetingType: "large",
  title: "",
  responsible: "",
  description: "",
  content: "",
  status: "draft",
  priority: "3",
  agendaTypes: "",
  votingItems: "",
  pdfS3Key: "",
  pdfUrl: "",
  relatedPastAgendaIds: "",
  relatedOtherAgendaIds: "",
};

export function parseNumberList(value: string): number[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item));
}

export function parseStringList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function buildMeetingTitle(scheduledAt: string, meetingType: MeetingOperationMeetingType): string {
  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return meetingType;
  }

  const formattedDate = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(scheduledDate);
  const meetingTypeLabel = MEETING_TYPE_OPTIONS.find((option) => option.value === meetingType)?.label ?? meetingType;

  return `${formattedDate} ${meetingTypeLabel}`;
}
