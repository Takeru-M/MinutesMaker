import { AuthRole } from "@/features/auth/types/auth-role";

/**
 * Permission definitions matching backend PERMISSION_DEFINITIONS
 */
export const PERMISSION_DEFINITIONS = [
  "meeting.read_list",
  "meeting.read_detail",
  "meeting.qa.ask",
  "meeting.qa.ingest",
  "meeting.create",
  "meeting.update",
  "meeting.delete",
  "agenda.read",
  "agenda.create",
  "agenda.update",
  "agenda.delete",
  "minutes.read",
  "minutes.create",
  "minutes.update",
  "minutes.approve",
  "minutes.publish",
  "notice.read",
  "notice.create",
  "notice.update",
  "notice.delete",
  "notice.publish",
  "repository.read",
  "repository.create",
  "repository.update",
  "repository.delete",
  "guide.read",
  "guide.create",
  "guide.update",
  "guide.delete",
  "org.read",
  "org.update",
  "org.member.manage",
  "user.read",
  "user.invite",
  "user.update",
  "user.deactivate",
  "role.assign",
  "role.revoke",
] as const;

export type Permission = (typeof PERMISSION_DEFINITIONS)[number];

/**
 * Role to permissions mapping matching backend ROLE_PERMISSION_ASSIGNMENTS
 */
export const ROLE_PERMISSION_ASSIGNMENTS: Record<AuthRole, Set<Permission>> = {
  platform_admin: new Set(PERMISSION_DEFINITIONS as unknown as Permission[]),
  org_admin: new Set([
    "meeting.read_list",
    "meeting.read_detail",
    "meeting.qa.ask",
    "meeting.qa.ingest",
    "meeting.create",
    "meeting.update",
    "agenda.read",
    "agenda.create",
    "agenda.update",
    "minutes.read",
    "minutes.create",
    "minutes.update",
    "minutes.approve",
    "notice.read",
    "notice.create",
    "notice.update",
    "notice.publish",
    "repository.read",
    "repository.create",
    "repository.update",
    "guide.read",
    "guide.create",
    "guide.update",
    "user.read",
    "user.invite",
    "user.update",
    "org.read",
  ] as const),
  org_user: new Set([
    "meeting.read_list",
    "meeting.read_detail",
    "meeting.qa.ask",
    "meeting.qa.ingest",
    "agenda.read",
    "agenda.create",
    "minutes.read",
    "minutes.create",
    "minutes.update",
    "notice.read",
    "repository.read",
    "guide.read",
  ] as const),
  auditor: new Set([
    "meeting.read_list",
    "meeting.read_detail",
    "meeting.qa.ask",
    "agenda.read",
    "minutes.read",
    "notice.read",
    "repository.read",
    "guide.read",
    "user.read",
  ] as const),
  guest_user: new Set(["meeting.read_list"] as const),
  user: new Set([
    "meeting.read_list",
    "meeting.read_detail",
    "meeting.qa.ask",
    "meeting.qa.ingest",
    "agenda.read",
    "agenda.create",
    "minutes.read",
    "minutes.create",
    "minutes.update",
    "notice.read",
    "repository.read",
    "guide.read",
  ] as const),
  admin: new Set([
    "meeting.read_list",
    "meeting.read_detail",
    "meeting.qa.ask",
    "meeting.qa.ingest",
    "meeting.create",
    "meeting.update",
    "agenda.read",
    "agenda.create",
    "agenda.update",
    "minutes.read",
    "minutes.create",
    "minutes.update",
    "minutes.approve",
    "notice.read",
    "notice.create",
    "notice.update",
    "notice.publish",
    "repository.read",
    "repository.create",
    "repository.update",
    "guide.read",
    "guide.create",
    "guide.update",
    "user.read",
    "user.invite",
    "user.update",
    "org.read",
  ] as const),
};

/**
 * Get permissions for a given role
 */
export function getPermissionsForRole(role: AuthRole): Set<Permission> {
  return ROLE_PERMISSION_ASSIGNMENTS[role] || new Set();
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: AuthRole, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.has(permission);
}
