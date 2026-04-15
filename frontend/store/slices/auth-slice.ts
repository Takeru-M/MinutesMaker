import { AuthRole, MembershipResponse } from "@/features/auth/types/auth-role";

export type AuthState = {
  isAuthenticated: boolean;
  role: AuthRole | null;
  username: string | null;
  memberships: MembershipResponse[];
  currentOrgId: number | null;
};

export const AUTH_LOGIN_SUCCEEDED = "auth/loginSucceeded" as const;
export const AUTH_LOGOUT_SUCCEEDED = "auth/logoutSucceeded" as const;
export const AUTH_SET_CURRENT_ORG = "auth/setCurrentOrg" as const;

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  role: null,
  username: null,
  memberships: [],
  currentOrgId: null,
};

type LoginSucceededAction = {
  type: typeof AUTH_LOGIN_SUCCEEDED;
  payload: { role: AuthRole; username: string; memberships: MembershipResponse[]; activeOrganizationId: number | null };
};

type LogoutSucceededAction = {
  type: typeof AUTH_LOGOUT_SUCCEEDED;
};

type SetCurrentOrgAction = {
  type: typeof AUTH_SET_CURRENT_ORG;
  payload: { orgId: number | null };
};

export type AuthAction = LoginSucceededAction | LogoutSucceededAction | SetCurrentOrgAction;

export const loginSucceeded = (payload: {
  role: AuthRole;
  username: string;
  memberships: MembershipResponse[];
  activeOrganizationId: number | null;
}): LoginSucceededAction => ({
  type: AUTH_LOGIN_SUCCEEDED,
  payload,
});

export const logoutSucceeded = (): LogoutSucceededAction => ({
  type: AUTH_LOGOUT_SUCCEEDED,
});

export const setCurrentOrg = (orgId: number | null): SetCurrentOrgAction => ({
  type: AUTH_SET_CURRENT_ORG,
  payload: { orgId },
});

export const authReducer = (state: AuthState = initialAuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AUTH_LOGIN_SUCCEEDED:
      return {
        ...state,
        isAuthenticated: true,
        role: action.payload.role,
        username: action.payload.username,
        memberships: action.payload.memberships,
        currentOrgId: action.payload.activeOrganizationId,
      };
    case AUTH_LOGOUT_SUCCEEDED:
      return {
        ...state,
        isAuthenticated: false,
        role: null,
        username: null,
        memberships: [],
        currentOrgId: null,
      };
    case AUTH_SET_CURRENT_ORG:
      return {
        ...state,
        currentOrgId: action.payload.orgId,
      };
    default:
      return state;
  }
};
