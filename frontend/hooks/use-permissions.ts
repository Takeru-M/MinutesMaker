import { useAppSelector } from "@/store/hooks";
import { selectCanInCurrentOrg, selectCanInOrg } from "@/store/selectors/auth";
import { Permission } from "@/lib/permissions";

/**
 * Hook to check if current user has a permission in the current organization
 */
export function useCanInCurrentOrg(permission: Permission): boolean {
  return useAppSelector((state) => selectCanInCurrentOrg(state, permission));
}

/**
 * Hook to check if current user has a permission in a specific organization
 */
export function useCanInOrg(orgId: number, permission: Permission): boolean {
  return useAppSelector((state) => selectCanInOrg(state, orgId, permission));
}

/**
 * Hook to check multiple permissions (all must be true)
 */
export function useCanAllInCurrentOrg(...permissions: Permission[]): boolean {
  return useAppSelector((state) => permissions.every((p) => selectCanInCurrentOrg(state, p)));
}

/**
 * Hook to check if any of the permissions is available (at least one must be true)
 */
export function useCanAnyInCurrentOrg(...permissions: Permission[]): boolean {
  return useAppSelector((state) => permissions.some((p) => selectCanInCurrentOrg(state, p)));
}
