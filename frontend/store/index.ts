import { combineReducers, createStore } from "redux";

import { AgendaValidationState } from "@/features/agenda/types/agenda-form";
import { AuthState, AuthAction } from "@/store/slices/auth-slice";
import { AgendaValidationAction } from "@/store/slices/agenda-validation-slice";
import { agendaValidationReducer } from "@/store/slices/agenda-validation-slice";
import { authReducer } from "@/store/slices/auth-slice";

const rootReducer = combineReducers({
  auth: authReducer,
  agendaValidation: agendaValidationReducer,
});

export const store = createStore(rootReducer);

export type RootState = {
  auth: AuthState;
  agendaValidation: AgendaValidationState;
};

export type AppDispatch = (action: AuthAction | AgendaValidationAction) => AuthAction | AgendaValidationAction;
