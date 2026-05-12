import { describe, test, expect } from "vitest";
import { getPermissionsForRole, roleHasPermission, ROLE_PERMISSION_ASSIGNMENTS } from "@/lib/permissions";
import type { AuthRole } from "@/features/auth/types/auth-role";

const roles: AuthRole[] = ["platform_admin", "org_admin", "org_user", "auditor", "guest_user", "user", "admin"];

describe("getPermissionsForRole", () => {
  test("platform_admin はすべての権限を持つ", () => {
    const perms = getPermissionsForRole("platform_admin");
    expect(perms.has("role.revoke")).toBe(true);
    expect(perms.has("user.deactivate")).toBe(true);
    expect(perms.has("meeting.delete")).toBe(true);
  });

  test("guest_user は読み取り系のみ", () => {
    const perms = getPermissionsForRole("guest_user");
    expect(perms.has("meeting.read_list")).toBe(true);
    expect(perms.has("agenda.read")).toBe(true);
    expect(perms.has("minutes.read")).toBe(true);
    expect(perms.has("meeting.create")).toBe(false);
    expect(perms.has("meeting.delete")).toBe(false);
  });

  test("すべてのロールに対して Set を返す", () => {
    for (const role of roles) {
      expect(getPermissionsForRole(role)).toBeInstanceOf(Set);
    }
  });

  test("未知のロールは空の Set を返す", () => {
    const perms = getPermissionsForRole("unknown_role" as AuthRole);
    expect(perms.size).toBe(0);
  });

  test("org_admin は meeting.delete を持たない", () => {
    const perms = getPermissionsForRole("org_admin");
    expect(perms.has("meeting.delete")).toBe(false);
  });
});

describe("roleHasPermission", () => {
  test("org_user が meeting.qa.ask を持つ", () => {
    expect(roleHasPermission("org_user", "meeting.qa.ask")).toBe(true);
  });

  test("auditor が meeting.qa.ask を持つ", () => {
    expect(roleHasPermission("auditor", "meeting.qa.ask")).toBe(true);
  });

  test("auditor が meeting.create を持たない", () => {
    expect(roleHasPermission("auditor", "meeting.create")).toBe(false);
  });

  test("guest_user が role.assign を持たない", () => {
    expect(roleHasPermission("guest_user", "role.assign")).toBe(false);
  });
});

describe("ROLE_PERMISSION_ASSIGNMENTS の整合性", () => {
  test("platform_admin の権限数が最大", () => {
    const adminCount = ROLE_PERMISSION_ASSIGNMENTS["platform_admin"].size;
    for (const role of roles) {
      expect(ROLE_PERMISSION_ASSIGNMENTS[role].size).toBeLessThanOrEqual(adminCount);
    }
  });

  test("guest_user の権限数が最小", () => {
    const guestCount = ROLE_PERMISSION_ASSIGNMENTS["guest_user"].size;
    expect(guestCount).toBeGreaterThan(0);
    expect(guestCount).toBeLessThan(ROLE_PERMISSION_ASSIGNMENTS["org_user"].size);
  });
});
