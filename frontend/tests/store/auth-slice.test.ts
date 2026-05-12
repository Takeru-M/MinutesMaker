import { describe, test, expect } from "vitest";
import {
  authReducer,
  initialAuthState,
  loginSucceeded,
  logoutSucceeded,
  setCurrentOrg,
  AUTH_LOGIN_SUCCEEDED,
  AUTH_LOGOUT_SUCCEEDED,
  AUTH_SET_CURRENT_ORG,
} from "@/store/slices/auth-slice";

const membership = {
  organization: { id: 1, name: "テスト組織" },
  role: "org_user" as const,
};

describe("authReducer", () => {
  describe("初期状態", () => {
    test("@@INIT で initialAuthState を返す", () => {
      const state = authReducer(undefined, { type: "@@INIT" } as any);
      expect(state).toEqual(initialAuthState);
    });

    test("isAuthenticated の初期値は false", () => {
      expect(initialAuthState.isAuthenticated).toBe(false);
    });
  });

  describe("loginSucceeded", () => {
    const action = loginSucceeded({
      role: "org_user",
      username: "taro",
      memberships: [membership],
      activeOrganizationId: 1,
    });

    test("isAuthenticated が true になる", () => {
      const state = authReducer(initialAuthState, action);
      expect(state.isAuthenticated).toBe(true);
    });

    test("role がセットされる", () => {
      const state = authReducer(initialAuthState, action);
      expect(state.role).toBe("org_user");
    });

    test("username がセットされる", () => {
      const state = authReducer(initialAuthState, action);
      expect(state.username).toBe("taro");
    });

    test("memberships がセットされる", () => {
      const state = authReducer(initialAuthState, action);
      expect(state.memberships).toHaveLength(1);
      expect(state.memberships[0].organization.id).toBe(1);
    });

    test("currentOrgId が activeOrganizationId からセットされる", () => {
      const state = authReducer(initialAuthState, action);
      expect(state.currentOrgId).toBe(1);
    });

    test("activeOrganizationId が null なら currentOrgId は null", () => {
      const state = authReducer(
        initialAuthState,
        loginSucceeded({ role: "org_user", username: "u", memberships: [], activeOrganizationId: null }),
      );
      expect(state.currentOrgId).toBeNull();
    });
  });

  describe("logoutSucceeded", () => {
    const loggedIn = authReducer(
      initialAuthState,
      loginSucceeded({ role: "org_user", username: "taro", memberships: [membership], activeOrganizationId: 1 }),
    );

    test("isAuthenticated が false になる", () => {
      const state = authReducer(loggedIn, logoutSucceeded());
      expect(state.isAuthenticated).toBe(false);
    });

    test("role が null になる", () => {
      const state = authReducer(loggedIn, logoutSucceeded());
      expect(state.role).toBeNull();
    });

    test("username が null になる", () => {
      const state = authReducer(loggedIn, logoutSucceeded());
      expect(state.username).toBeNull();
    });

    test("memberships が空配列になる", () => {
      const state = authReducer(loggedIn, logoutSucceeded());
      expect(state.memberships).toEqual([]);
    });

    test("currentOrgId が null になる", () => {
      const state = authReducer(loggedIn, logoutSucceeded());
      expect(state.currentOrgId).toBeNull();
    });
  });

  describe("setCurrentOrg", () => {
    test("currentOrgId を更新する", () => {
      const state = authReducer(initialAuthState, setCurrentOrg(42));
      expect(state.currentOrgId).toBe(42);
    });

    test("currentOrgId を null に戻せる", () => {
      const withOrg = authReducer(initialAuthState, setCurrentOrg(42));
      const state = authReducer(withOrg, setCurrentOrg(null));
      expect(state.currentOrgId).toBeNull();
    });

    test("他の state は変化しない", () => {
      const loggedIn = authReducer(
        initialAuthState,
        loginSucceeded({ role: "org_user", username: "u", memberships: [membership], activeOrganizationId: 1 }),
      );
      const state = authReducer(loggedIn, setCurrentOrg(99));
      expect(state.isAuthenticated).toBe(true);
      expect(state.username).toBe("u");
      expect(state.currentOrgId).toBe(99);
    });
  });

  describe("不明なアクション", () => {
    test("状態を変えずに返す", () => {
      const state = authReducer(initialAuthState, { type: "UNKNOWN_ACTION" } as any);
      expect(state).toEqual(initialAuthState);
    });
  });
});

describe("action creators", () => {
  test("loginSucceeded は正しい type を持つ", () => {
    const action = loginSucceeded({ role: "org_user", username: "u", memberships: [], activeOrganizationId: null });
    expect(action.type).toBe(AUTH_LOGIN_SUCCEEDED);
  });

  test("logoutSucceeded は正しい type を持つ", () => {
    expect(logoutSucceeded().type).toBe(AUTH_LOGOUT_SUCCEEDED);
  });

  test("setCurrentOrg は正しい type と payload を持つ", () => {
    const action = setCurrentOrg(5);
    expect(action.type).toBe(AUTH_SET_CURRENT_ORG);
    expect(action.payload.orgId).toBe(5);
  });
});
