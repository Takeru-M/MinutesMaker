import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
  getCurrentUser: vi.fn(),
}));

import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, getCurrentUser } from "@/lib/api-client";
import { LoginView } from "@/features/auth/components/login-view";
import { renderWithStore } from "../../helpers/render-with-store";

const mockApiFetch = vi.mocked(apiFetch);
const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockUseRouter = vi.mocked(useRouter);
const mockUseSearchParams = vi.mocked(useSearchParams);

const mockReplace = vi.fn();

function makeLoginResponse(role = "user", activeOrgId: number | null = 1) {
  return new Response(
    JSON.stringify({ role, active_organization_id: activeOrgId }),
    { status: 200 },
  );
}

function makeCurrentUserResponse(orgId: number | null = 1) {
  return {
    id: 1,
    username: "testuser",
    memberships: [],
    active_organization_id: orgId,
  } as any;
}

describe("LoginView", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockUseRouter.mockReturnValue({ replace: mockReplace } as any);
    mockUseSearchParams.mockReturnValue({ get: () => null } as any);
    mockApiFetch.mockReset();
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(makeCurrentUserResponse());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("レンダリング", () => {
    test("ユーザ名とパスワードの入力欄が表示される", () => {
      renderWithStore(<LoginView />);
      expect(screen.getByLabelText("ユーザ名")).toBeInTheDocument();
      expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    });

    test("ログインボタンが表示される", () => {
      renderWithStore(<LoginView />);
      expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
    });
  });

  describe("バリデーション", () => {
    test("username/password 未入力でログインボタンを押すとエラーメッセージが表示される", async () => {
      renderWithStore(<LoginView />);
      // クリック前はdescriptionのみ（エラーはまだ出ていない）
      expect(screen.queryAllByText("ユーザ名とパスワードを入力してください。")).toHaveLength(1);
      await userEvent.click(screen.getByRole("button", { name: "ログイン" }));
      // クリック後はdescription + errorMessageの2つになる
      expect(screen.queryAllByText("ユーザ名とパスワードを入力してください。")).toHaveLength(2);
    });

    test("username/password 未入力では apiFetch を呼ばない", async () => {
      renderWithStore(<LoginView />);
      await userEvent.click(screen.getByRole("button", { name: "ログイン" }));
      expect(mockApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("ログイン成功", () => {
    test("user ロールでログイン成功後にリダイレクトされる", async () => {
      mockApiFetch.mockResolvedValue(makeLoginResponse("user", 1));

      renderWithStore(<LoginView />);
      await userEvent.type(screen.getByLabelText("ユーザ名"), "testuser");
      await userEvent.type(screen.getByLabelText("パスワード"), "pass");
      await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalled();
      });
    });

    test("active_organization_id があれば /orgs/:id/ へリダイレクト", async () => {
      mockApiFetch.mockResolvedValue(makeLoginResponse("user", 42));
      mockGetCurrentUser.mockResolvedValue(makeCurrentUserResponse(42));

      renderWithStore(<LoginView />);
      await userEvent.type(screen.getByLabelText("ユーザ名"), "testuser");
      await userEvent.type(screen.getByLabelText("パスワード"), "pass");
      await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/orgs/42/");
      });
    });

    test("redirect クエリパラメータがあればそこへリダイレクト", async () => {
      mockUseSearchParams.mockReturnValue({ get: (k: string) => k === "redirect" ? "/agenda" : null } as any);
      mockApiFetch.mockResolvedValue(makeLoginResponse("user", 1));

      renderWithStore(<LoginView />);
      await userEvent.type(screen.getByLabelText("ユーザ名"), "testuser");
      await userEvent.type(screen.getByLabelText("パスワード"), "pass");
      await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/agenda");
      });
    });
  });

  describe("user ロールで 403 -> admin ロールにフォールバック", () => {
    test("user が 403 のとき admin エンドポイントを叩く", async () => {
      mockApiFetch
        .mockResolvedValueOnce(new Response(null, { status: 403 }))
        .mockResolvedValueOnce(makeLoginResponse("admin", 1));

      renderWithStore(<LoginView />);
      await userEvent.type(screen.getByLabelText("ユーザ名"), "testuser");
      await userEvent.type(screen.getByLabelText("パスワード"), "pass");
      await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledTimes(2);
        const secondCallPath = mockApiFetch.mock.calls[1][0] as string;
        expect(secondCallPath).toContain("admin");
      });
    });
  });

  describe("ログイン失敗", () => {
    test("API が 401 を返すとエラーメッセージを表示する", async () => {
      mockApiFetch.mockResolvedValue(new Response(null, { status: 401 }));

      renderWithStore(<LoginView />);
      await userEvent.type(screen.getByLabelText("ユーザ名"), "wrong");
      await userEvent.type(screen.getByLabelText("パスワード"), "wrong");
      await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

      await waitFor(() => {
        expect(
          screen.getByText("ログインに失敗しました。認証情報を確認してください。"),
        ).toBeInTheDocument();
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });

    test("ネットワークエラーでエラーメッセージを表示する", async () => {
      mockApiFetch.mockRejectedValue(new Error("Network Error"));

      renderWithStore(<LoginView />);
      await userEvent.type(screen.getByLabelText("ユーザ名"), "testuser");
      await userEvent.type(screen.getByLabelText("パスワード"), "pass");
      await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

      await waitFor(() => {
        expect(
          screen.getByText("サーバーに接続できませんでした。"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("送信中の状態", () => {
    test("送信中はボタンが disabled になる", async () => {
      let resolveLogin!: (v: Response) => void;
      mockApiFetch.mockReturnValue(
        new Promise<Response>((res) => {
          resolveLogin = res;
        }),
      );

      renderWithStore(<LoginView />);
      await userEvent.type(screen.getByLabelText("ユーザ名"), "testuser");
      await userEvent.type(screen.getByLabelText("パスワード"), "pass");

      const button = screen.getByRole("button", { name: "ログイン" });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "認証中..." })).toBeDisabled();
      });

      resolveLogin(makeLoginResponse());
    });
  });
});
