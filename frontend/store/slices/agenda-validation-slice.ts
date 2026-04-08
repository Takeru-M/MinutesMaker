import { AgendaFieldName, AgendaFormData, AgendaValidationState } from "@/features/agenda/types/agenda-form";
import { validateRequiredAgendaFields } from "@/features/agenda/validation/agenda-form-validation";

export const VALIDATE_AGENDA_FORM = "agendaValidation/validateAgendaForm" as const;
export const CLEAR_AGENDA_FIELD_ERROR = "agendaValidation/clearAgendaFieldError" as const;
export const RESET_AGENDA_VALIDATION = "agendaValidation/resetAgendaValidation" as const;

const initialState: AgendaValidationState = {
  errors: {},
};

type ValidateAgendaFormAction = {
  type: typeof VALIDATE_AGENDA_FORM;
  payload: AgendaFormData;
};

type ClearAgendaFieldErrorAction = {
  type: typeof CLEAR_AGENDA_FIELD_ERROR;
  payload: AgendaFieldName;
};

type ResetAgendaValidationAction = {
  type: typeof RESET_AGENDA_VALIDATION;
};

export type AgendaValidationAction =
  | ValidateAgendaFormAction
  | ClearAgendaFieldErrorAction
  | ResetAgendaValidationAction;

export const validateAgendaForm = (payload: AgendaFormData): ValidateAgendaFormAction => ({
  type: VALIDATE_AGENDA_FORM,
  payload,
});

export const clearAgendaFieldError = (payload: AgendaFieldName): ClearAgendaFieldErrorAction => ({
  type: CLEAR_AGENDA_FIELD_ERROR,
  payload,
});

export const resetAgendaValidation = (): ResetAgendaValidationAction => ({
  type: RESET_AGENDA_VALIDATION,
});

export const agendaValidationReducer = (
  state: AgendaValidationState = initialState,
  action: AgendaValidationAction,
): AgendaValidationState => {
  switch (action.type) {
    case VALIDATE_AGENDA_FORM:
      return {
        ...state,
        errors: validateRequiredAgendaFields(action.payload),
      };
    case CLEAR_AGENDA_FIELD_ERROR: {
      if (!state.errors[action.payload]) {
        return state;
      }
      const nextErrors = { ...state.errors };
      delete nextErrors[action.payload];
      return {
        ...state,
        errors: nextErrors,
      };
    }
    case RESET_AGENDA_VALIDATION:
      return {
        ...state,
        errors: {},
      };
    default:
      return state;
  }
};
