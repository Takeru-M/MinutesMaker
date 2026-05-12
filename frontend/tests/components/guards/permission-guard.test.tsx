import { describe, test, expect } from "vitest";
import { screen } from "@testing-library/react";
import { PermissionGuard, AuthGate, ForbiddenPage } from "@/components/guards/permission-guard";
import { renderWithStore } from "../../helpers/render-with-store";
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

describe("PermissionGuard", () => {
  describe("未認証", () => {
    test("isAuthenticated が false なら children を表示しない", () => {
      renderWithStore(
        <PermissionGuard permission="meeting.read_list">
          <span>protected</span>
        </PermissionGuard>,
        { auth: { isAuthenticated: false, memberships: [], currentOrgId: null } },
      );
      expect(screen.queryByText("protected")).toBeNull();
    });

    test("isAuthenticated が false なら fallback を表示する", () => {
      renderWithStore(
        <PermissionGuard permission="meeting.read_list" fallback={<span>forbidden</span>}>
          <span>protected</span>
        </PermissionGuard>,
        { auth: { isAuthenticated: false, memberships: [], currentOrgId: null } },
      );
      expect(screen.getByText("forbidden")).toBeInTheDocument();
    });
  });

  describe("permission prop (single)", () => {
    test("権限あり -> children を表示", () => {
      renderWithStore(
        <PermissionGuard permission="meeting.read_list">
          <span>content</span>
        </PermissionGuard>,
        { auth: makeAuth(1, "org_user") },
      );
      expect(screen.getByText("content")).toBeInTheDocument();
    });

    test("権限なし -> children を表示しない", () => {
      renderWithStore(
        <PermissionGuard permission="meeting.delete">
          <span>content</span>
        </PermissionGuard>,
        { auth: makeAuth(1, "org_user") },
      );
      expect(screen.queryByText("content")).toBeNull();
    });

    test("権限なし -> fallback を表示", () => {
      renderWithStore(
        <PermissionGuard permission="meeting.delete" fallback={<span>no access</span>}>
          <span>content</span>
        </PermissionGuard>,
        { auth: makeAuth(1, "org_user") },
      );
      expect(screen.getByText("no access")).toBeInTheDocument();
    });
  });

  describe("permissions prop (all must be true)", () => {
    test("すべての権限あり -> children を表示", () => {
      renderWithStore(
        <PermissionGuard permissions={["meeting.read_list", "agenda.read"]}>
          <span>content</span>
        </PermissionGuard>,
        { auth: makeAuth(1, "org_user") },
      );
      expect(screen.getByText("content")).toBeInTheDocument();
    });

    test("1つでも欠ける -> children を表示しない", () => {
      renderWithStore(
        // org_user は meeting.create を持たない
        <PermissionGuard permissions={["meeting.read_list", "meeting.create"]}>
          <span>content</span>
        </PermissionGuard>,
        { auth: makeAuth(1, "org_user") },
      );
      expect(screen.queryByText("content")).toBeNull();
    });
  });

  describe("anyPermission prop (at least one)", () => {
    test("1つ以上の権限あり -> children を表示", () => {
      renderWithStore(
        // org_user は meeting.delete を持たないが meeting.read_list は持つ
        <PermissionGuard anyPermission={["meeting.delete", "meeting.read_list"]}>
          <span>content</span>
        </PermissionGuard>,
        { auth: makeAuth(1, "org_user") },
      );
      expect(screen.getByText("content")).toBeInTheDocument();
    });

    test("すべて欠ける -> children を表示しない", () => {
      renderWithStore(
        <PermissionGuard anyPermission={["meeting.create", "meeting.delete"]}>
          <span>content</span>
        </PermissionGuard>,
        { auth: makeAuth(1, "guest_user") },
      );
      expect(screen.queryByText("content")).toBeNull();
    });
  });

  describe("requireOrg prop", () => {
    test("requireOrg=true かつ currentOrgId なし -> fallback", () => {
      renderWithStore(
        <PermissionGuard requireOrg fallback={<span>no org</span>}>
          <span>content</span>
        </PermissionGuard>,
        {
          auth: {
            isAuthenticated: true,
            role: "org_user",
            username: "u",
            memberships: [],
            currentOrgId: null,
          },
        },
      );
      expect(screen.getByText("no org")).toBeInTheDocument();
    });

    test("requireOrg=true かつ currentOrgId あり -> children", () => {
      renderWithStore(
        <PermissionGuard requireOrg>
          <span>content</span>
        </PermissionGuard>,
        { auth: makeAuth(1) },
      );
      expect(screen.getByText("content")).toBeInTheDocument();
    });

    test("requireOrg が未指定 (default false) なら currentOrgId なしでも children", () => {
      renderWithStore(
        <PermissionGuard>
          <span>content</span>
        </PermissionGuard>,
        {
          auth: {
            isAuthenticated: true,
            role: "org_user",
            username: "u",
            memberships: [],
            currentOrgId: null,
          },
        },
      );
      expect(screen.getByText("content")).toBeInTheDocument();
    });
  });

  describe("prop なし (pass-through)", () => {
    test("permission props がない場合は認証済みなら常に表示", () => {
      renderWithStore(
        <PermissionGuard>
          <span>content</span>
        </PermissionGuard>,
        { auth: makeAuth(1, "guest_user") },
      );
      expect(screen.getByText("content")).toBeInTheDocument();
    });
  });
});

describe("AuthGate", () => {
  test("未認証なら unauthorizedFallback を表示", () => {
    renderWithStore(
      <AuthGate unauthorizedFallback={<span>login required</span>}>
        <span>protected</span>
      </AuthGate>,
      { auth: { isAuthenticated: false, memberships: [], currentOrgId: null } },
    );
    expect(screen.getByText("login required")).toBeInTheDocument();
    expect(screen.queryByText("protected")).toBeNull();
  });

  test("認証済み + org あり -> children を表示", () => {
    renderWithStore(
      <AuthGate>
        <span>content</span>
      </AuthGate>,
      { auth: makeAuth(1) },
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  test("requireOrg=true かつ org なし -> noOrgFallback", () => {
    renderWithStore(
      <AuthGate requireOrg noOrgFallback={<span>select org</span>}>
        <span>content</span>
      </AuthGate>,
      {
        auth: {
          isAuthenticated: true,
          role: "org_user",
          username: "u",
          memberships: [],
          currentOrgId: null,
        },
      },
    );
    expect(screen.getByText("select org")).toBeInTheDocument();
  });

  test("requireOrg=false なら org なしでも children", () => {
    renderWithStore(
      <AuthGate requireOrg={false}>
        <span>content</span>
      </AuthGate>,
      {
        auth: {
          isAuthenticated: true,
          role: "org_user",
          username: "u",
          memberships: [],
          currentOrgId: null,
        },
      },
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});

describe("ForbiddenPage", () => {
  test("日本語メッセージを表示する (default)", () => {
    renderWithStore(<ForbiddenPage />);
    expect(screen.getByText("アクセスが拒否されました")).toBeInTheDocument();
  });

  test("英語メッセージを表示する", () => {
    renderWithStore(<ForbiddenPage locale="en" />);
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  test("カスタムメッセージを表示する", () => {
    renderWithStore(<ForbiddenPage message="カスタムエラー" />);
    expect(screen.getByText("カスタムエラー")).toBeInTheDocument();
  });
});
