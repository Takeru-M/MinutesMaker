import { describe, test, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useCanInCurrentOrg,
  useCanInOrg,
  useCanAllInCurrentOrg,
  useCanAnyInCurrentOrg,
} from "@/hooks/use-permissions";
import { renderHookWithStore } from "../helpers/render-with-store";
import type { AuthState } from "@/store/slices/auth-slice";

function makeAuth(orgId: number | null, role: AuthState["role"] = "org_user"): Partial<AuthState> {
  return {
    isAuthenticated: true,
    role,
    username: "user",
    memberships:
      orgId !== null
        ? [{ organization: { id: orgId, name: "組織" }, role: role ?? "org_user" }]
        : [],
    currentOrgId: orgId,
  };
}

describe("useCanInCurrentOrg", () => {
  test("org_user が持つ権限で true を返す", () => {
    const { wrapper } = renderHookWithStore(() => {}, { auth: makeAuth(1, "org_user") });
    const { result } = renderHook(() => useCanInCurrentOrg("meeting.read_list"), { wrapper });
    expect(result.current).toBe(true);
  });

  test("org_user が持たない権限で false を返す", () => {
    const { wrapper } = renderHookWithStore(() => {}, { auth: makeAuth(1, "org_user") });
    const { result } = renderHook(() => useCanInCurrentOrg("meeting.delete"), { wrapper });
    expect(result.current).toBe(false);
  });

  test("currentOrgId が null のとき false を返す", () => {
    const { wrapper } = renderHookWithStore(() => {}, {
      auth: { isAuthenticated: true, role: "org_user", username: "u", memberships: [], currentOrgId: null },
    });
    const { result } = renderHook(() => useCanInCurrentOrg("meeting.read_list"), { wrapper });
    expect(result.current).toBe(false);
  });

  test("platform_admin はすべての権限を持つ", () => {
    const { wrapper } = renderHookWithStore(() => {}, { auth: makeAuth(1, "platform_admin") });
    const { result } = renderHook(() => useCanInCurrentOrg("role.revoke"), { wrapper });
    expect(result.current).toBe(true);
  });

  test("guest_user は限定的な権限のみ", () => {
    const { wrapper } = renderHookWithStore(() => {}, { auth: makeAuth(1, "guest_user") });
    const { result: canRead } = renderHook(() => useCanInCurrentOrg("meeting.read_list"), { wrapper });
    expect(canRead.current).toBe(true);

    const { result: canCreate } = renderHook(() => useCanInCurrentOrg("meeting.create"), { wrapper });
    expect(canCreate.current).toBe(false);
  });
});

describe("useCanInOrg", () => {
  test("指定した orgId のメンバーシップで権限チェックする", () => {
    const auth: Partial<AuthState> = {
      isAuthenticated: true,
      role: "org_user",
      username: "u",
      memberships: [
        { organization: { id: 10, name: "A組織" }, role: "org_admin" },
        { organization: { id: 20, name: "B組織" }, role: "guest_user" },
      ],
      currentOrgId: 10,
    };
    const { wrapper } = renderHookWithStore(() => {}, { auth });

    // org 10 は org_admin -> meeting.create 持つ
    const { result: canCreate10 } = renderHook(() => useCanInOrg(10, "meeting.create"), { wrapper });
    expect(canCreate10.current).toBe(true);

    // org 20 は guest_user -> meeting.create 持たない
    const { result: canCreate20 } = renderHook(() => useCanInOrg(20, "meeting.create"), { wrapper });
    expect(canCreate20.current).toBe(false);
  });

  test("該当 orgId のメンバーシップがなければ false", () => {
    const { wrapper } = renderHookWithStore(() => {}, { auth: makeAuth(1) });
    const { result } = renderHook(() => useCanInOrg(999, "meeting.read_list"), { wrapper });
    expect(result.current).toBe(false);
  });
});

describe("useCanAllInCurrentOrg", () => {
  test("すべての権限を持つ場合 true", () => {
    const { wrapper } = renderHookWithStore(() => {}, { auth: makeAuth(1, "org_admin") });
    const { result } = renderHook(
      () => useCanAllInCurrentOrg("meeting.create", "meeting.update"),
      { wrapper },
    );
    expect(result.current).toBe(true);
  });

  test("1つでも欠けていれば false", () => {
    const { wrapper } = renderHookWithStore(() => {}, { auth: makeAuth(1, "org_user") });
    // org_user は meeting.create を持たない
    const { result } = renderHook(
      () => useCanAllInCurrentOrg("meeting.read_list", "meeting.create"),
      { wrapper },
    );
    expect(result.current).toBe(false);
  });
});

describe("useCanAnyInCurrentOrg", () => {
  test("1つでも持っていれば true", () => {
    const { wrapper } = renderHookWithStore(() => {}, { auth: makeAuth(1, "org_user") });
    // org_user は meeting.delete を持たないが meeting.read_list は持つ
    const { result } = renderHook(
      () => useCanAnyInCurrentOrg("meeting.delete", "meeting.read_list"),
      { wrapper },
    );
    expect(result.current).toBe(true);
  });

  test("すべて持っていなければ false", () => {
    const { wrapper } = renderHookWithStore(() => {}, { auth: makeAuth(1, "guest_user") });
    const { result } = renderHook(
      () => useCanAnyInCurrentOrg("meeting.create", "meeting.delete", "meeting.update"),
      { wrapper },
    );
    expect(result.current).toBe(false);
  });
});
