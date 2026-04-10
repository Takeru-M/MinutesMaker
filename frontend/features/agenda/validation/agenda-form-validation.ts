import { AgendaFormData, AgendaValidationErrors } from "@/features/agenda/types/agenda-form";

export const validateRequiredAgendaFields = (formData: AgendaFormData): AgendaValidationErrors => {
  const errors: AgendaValidationErrors = {};

  if (!formData.date.trim()) errors.date = "agendaForm.errors.dateRequired";
  if (formData.types.length === 0) errors.types = "agendaForm.errors.typesRequired";
  if (!formData.title.trim()) errors.title = "agendaForm.errors.titleRequired";
  if (!formData.responsible.trim()) errors.responsible = "agendaForm.errors.responsibleRequired";
  if (!formData.password.trim()) errors.password = "agendaForm.errors.passwordRequired";
  if (!formData.passwordConfirm.trim()) errors.passwordConfirm = "agendaForm.errors.passwordConfirmRequired";
  if ((formData.types.includes("voting") || formData.types.includes("voting-planned")) && !formData.votingItems.trim()) {
    errors.votingItems = "agendaForm.errors.votingItemsRequired";
  }
  if (!formData.body.trim() && !formData.pdfFile) {
    errors.body = "agendaForm.errors.bodyOrPdfRequired";
  }

  return errors;
};
