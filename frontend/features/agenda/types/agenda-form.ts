export type AgendaFormData = {
  date: string;
  meetingType: string;
  types: string[];
  title: string;
  responsible: string;
  password: string;
  passwordConfirm: string;
  body: string;
  pdfFile: File | null;
  votingItems: string;
  relatedPastAgendaIds: number[];
  relatedOtherAgendaIds: number[];
};

export type AgendaFieldName = keyof AgendaFormData | "types";

export type AgendaValidationErrors = Partial<Record<AgendaFieldName, string>>;

export type AgendaValidationState = {
  errors: AgendaValidationErrors;
};
