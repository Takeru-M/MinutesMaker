import { RootState } from "@/store";
import { Permission, getPermissionsForRole } from "@/lib/permissions";
import { MembershipResponse } from "@/features/auth/types/auth-role";

/**
 * Get current organization ID from store
 */
export const selectCurrentOrgId = (state: RootState): number | null => {
  return state.auth.currentOrgId;
};

/**
 * Get all memberships from store
 */
export const selectMemberships = (state: RootState): MembershipResponse[] => {
  return state.auth.memberships;
};

/**
 * Get current user's authentication status
 */
export const selectIsAuthenticated = (state: RootState): boolean => {
  return state.auth.isAuthenticated;
};

/**
 * Get current user's role
 */
export const selectUserRole = (state: RootState): string | null => {
  return state.auth.role;
};

/**
 * Get membership for a specific organization ID
 */
export const selectMembershipForOrg = (state: RootState, orgId: number): MembershipResponse | undefined => {
  return state.auth.memberships.find((m) => m.organization.id === orgId);
};

/**
 * Get permissions for current organization
 */
export const selectCurrentOrgPermissions = (state: RootState): Set<Permission> => {
  const currentOrgId = selectCurrentOrgId(state);
  if (!currentOrgId) {
    return new Set();
  }

  const membership = selectMembershipForOrg(state, currentOrgId);
  if (!membership) {
    return new Set();
  }

  return getPermissionsForRole(membership.role);
};

/**
 * Get permissions for a specific organization
 */
export const selectPermissionsForOrg = (state: RootState, orgId: number): Set<Permission> => {
  const membership = selectMembershipForOrg(state, orgId);
  if (!membership) {
    return new Set();
  }

  return getPermissionsForRole(membership.role);
};

/**
 * Check if user can perform an action in the current organization
 */
export const selectCanInCurrentOrg = (state: RootState, permission: Permission): boolean => {
  const permissions = selectCurrentOrgPermissions(state);
  return permissions.has(permission);
};

/**
 * Check if user can perform an action in a specific organization
 */
export const selectCanInOrg = (state: RootState, orgId: number, permission: Permission): boolean => {
  const permissions = selectPermissionsForOrg(state, orgId);
  return permissions.has(permission);
};
