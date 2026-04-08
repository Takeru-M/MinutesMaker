import { AuthRole } from "@/features/auth/types/auth-role";

export type AuthState = {
  isAuthenticated: boolean;
  role: AuthRole | null;
  username: string | null;
};

export const AUTH_LOGIN_SUCCEEDED = "auth/loginSucceeded" as const;
export const AUTH_LOGOUT_SUCCEEDED = "auth/logoutSucceeded" as const;

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  role: null,
  username: null,
};

type LoginSucceededAction = {
  type: typeof AUTH_LOGIN_SUCCEEDED;
  payload: { role: AuthRole; username: string };
};

type LogoutSucceededAction = {
  type: typeof AUTH_LOGOUT_SUCCEEDED;
};

export type AuthAction = LoginSucceededAction | LogoutSucceededAction;

export const loginSucceeded = (payload: { role: AuthRole; username: string }): LoginSucceededAction => ({
  type: AUTH_LOGIN_SUCCEEDED,
  payload,
});

export const logoutSucceeded = (): LogoutSucceededAction => ({
  type: AUTH_LOGOUT_SUCCEEDED,
});

export const authReducer = (state: AuthState = initialAuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AUTH_LOGIN_SUCCEEDED:
      return {
        ...state,
        isAuthenticated: true,
        role: action.payload.role,
        username: action.payload.username,
      };
    case AUTH_LOGOUT_SUCCEEDED:
      return {
        ...state,
        isAuthenticated: false,
        role: null,
        username: null,
      };
    default:
      return state;
  }
};
