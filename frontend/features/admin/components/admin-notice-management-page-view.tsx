"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Footer, Header, PageHero } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { apiFetch } from "@/lib/api-client";
import type {
  NoticeAdminDetailResponse,
  NoticeAdminListItemResponse,
  NoticeCreateRequest,
  NoticeStatus,
  NoticeUpdateRequest,
} from "@/lib/api-types";
import { useAppSelector } from "@/store/hooks";
import { AdminListSearchBar } from "./admin-list-search-bar";
import styles from "./admin-notice-management-page-view.module.css";

const ADMIN_ROLES = new Set(["platform_admin", "org_admin", "admin"]);

type NoticeFormState = {
  title: string;
  content: string;
  category: "important" | "info" | "warning";
  status: NoticeStatus;
  isPinned: boolean;
  publishedAt: string;
};

const EMPTY_FORM: NoticeFormState = {
  title: "",
  content: "",
  category: "info",
  status: "draft",
  isPinned: false,
  publishedAt: "",
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function categoryLabel(category: NoticeFormState["category"]): string {
  if (category === "important") {
    return "重要";
  }

  if (category === "warning") {
    return "注意";
  }

  return "一般";
}

function statusLabel(status: NoticeStatus): string {
  if (status === "published") {
    return "公開";
  }

  if (status === "archived") {
    return "アーカイブ";
  }

  return "下書き";
}

function statusClass(status: NoticeStatus): string {
  if (status === "published") {
    return styles.badgePublished;
  }

  if (status === "archived") {
    return styles.badgeDraft;
  }

  return styles.badgeDraft;
}

function readErrorMessage(response: Response, fallback: string): Promise<string> {
  return response
    .json()
    .then((payload: { detail?: string }) => payload.detail || fallback)
    .catch(() => fallback);
}

function toFormState(notice: NoticeAdminListItemResponse | NoticeAdminDetailResponse): NoticeFormState {
  return {
    title: notice.title,
    content: notice.content,
    category: notice.category,
    status: notice.status,
    isPinned: notice.is_pinned,
    publishedAt: formatDateTimeLocal(notice.published_at),
  };
}

function AdminNoticeShell({
  redirectPath,
  badge,
  title,
  description,
  children,
}: {
  redirectPath: string;
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (auth.role && !ADMIN_ROLES.has(auth.role)) {
      router.replace("/");
    }
  }, [auth.isAuthenticated, auth.role, redirectPath, router]);

  if (!auth.isAuthenticated || !auth.role || !ADMIN_ROLES.has(auth.role)) {
    return null;
  }

  return (
    <div className={styles.page}>
      <Header />
      <Container>
        <main className={styles.main}>
          <PageHero badge={badge} title={title} description={description}>
            <div className={styles.buttonRow}>
              <Link href="/admin/features" className={styles.secondaryButton}>
                管理者機能一覧へ
              </Link>
            </div>
          </PageHero>

          {children}
        </main>
      </Container>
      <Footer />
    </div>
  );
}

export function AdminNoticeCreatePublishPageView() {
  const [notices, setNotices] = useState<NoticeAdminListItemResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<NoticeFormState>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mode = useMemo(() => (selectedId === null ? "create" : "edit"), [selectedId]);
  const filteredNotices = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return notices;
    }

    return notices.filter((notice) => {
      const haystack = [notice.title, notice.content, categoryLabel(notice.category), statusLabel(notice.status), notice.is_pinned ? "固定" : ""]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [notices, searchQuery]);

  const loadNotices = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiFetch("/api/v1/notices/admin?limit=200");
      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, "お知らせ一覧の取得に失敗しました。"));
        return;
      }

      setNotices((await response.json()) as NoticeAdminListItemResponse[]);
    } catch (error) {
      console.error("Failed to load notices:", error);
      setErrorMessage("お知らせ一覧の読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotices();
  }, []);

  const resetForm = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
  };

  const editNotice = (notice: NoticeAdminListItemResponse) => {
    setSelectedId(notice.id);
    setForm(toFormState(notice));
  };

  const saveNotice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const payload: NoticeCreateRequest | NoticeUpdateRequest = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      status: form.status,
      is_pinned: form.isPinned,
      published_at: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
    };

    try {
      const response = await apiFetch(
        selectedId === null ? "/api/v1/notices/admin" : `/api/v1/notices/admin/${selectedId}`,
        {
          method: selectedId === null ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, "お知らせを保存できませんでした。"));
        return;
      }

      const saved = (await response.json()) as NoticeAdminDetailResponse;
      setStatusMessage(selectedId === null ? "お知らせを作成しました。" : "お知らせを更新しました。");
      setNotices((prev) => {
        const next = prev.filter((notice) => notice.id !== saved.id);
        next.unshift(saved);
        return next;
      });
      resetForm();
    } catch (error) {
      console.error("Failed to save notice:", error);
      setErrorMessage("お知らせの保存に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteNotice = async (noticeId: number) => {
    if (!window.confirm("このお知らせを削除しますか？")) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    const response = await apiFetch(`/api/v1/notices/admin/${noticeId}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      setErrorMessage(await readErrorMessage(response, "お知らせを削除できませんでした。"));
      return;
    }

    setNotices((prev) => prev.filter((notice) => notice.id !== noticeId));
    if (selectedId === noticeId) {
      resetForm();
    }
    setStatusMessage("お知らせを削除しました。");
  };

  const totalCount = filteredNotices.length;
  const publishedCount = filteredNotices.filter((notice) => notice.status === "published").length;
  const pinnedCount = filteredNotices.filter((notice) => notice.is_pinned).length;

  return (
    <AdminNoticeShell
      redirectPath="/admin/features/notice/create-publish"
      badge="ADMIN NOTICE"
      title="お知らせ作成・公開"
      description="下書き作成から公開、固定表示までを管理します。"
    >
      {statusMessage ? <p className={styles.message}>{statusMessage}</p> : null}
      {errorMessage ? <p className={`${styles.message} ${styles.errorMessage}`}>{errorMessage}</p> : null}

      <section className={styles.grid}>
        <article className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>お知らせ一覧と編集</h2>
              <p className={styles.sectionMeta}>作成済みのお知らせを一覧で確認し、編集・削除・公開設定を行います。</p>
            </div>
            <div className={styles.buttonRow}>
              <span className={styles.statusBadge}>{`全${totalCount}件`}</span>
              <span className={`${styles.statusBadge} ${styles.badgePublished}`}>{`公開${publishedCount}件`}</span>
              <span className={`${styles.statusBadge} ${styles.badgePinned}`}>{`固定${pinnedCount}件`}</span>
            </div>
          </div>

          <div className={styles.panel}>
            <AdminListSearchBar
              title="お知らせ検索"
              description="タイトル、本文、カテゴリ、状態で絞り込みます。"
              value={searchQuery}
              placeholder="例: メンテナンス, 重要, 公開"
              onChange={setSearchQuery}
              onSubmit={(event) => event.preventDefault()}
              onReset={() => setSearchQuery("")}
            />

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>タイトル</th>
                    <th>カテゴリ</th>
                    <th>状態</th>
                    <th>固定</th>
                    <th>公開日時</th>
                    <th>更新日時</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyState}>
                        読み込み中...
                      </td>
                    </tr>
                  ) : filteredNotices.length > 0 ? (
                    filteredNotices.map((notice) => (
                      <tr key={notice.id}>
                        <td>{notice.title}</td>
                        <td>{categoryLabel(notice.category)}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${statusClass(notice.status)}`}>{statusLabel(notice.status)}</span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${notice.is_pinned ? styles.badgePinned : styles.badgeDraft}`}>
                            {notice.is_pinned ? "固定中" : "-"}
                          </span>
                        </td>
                        <td>{formatDateTime(notice.published_at)}</td>
                        <td>{formatDateTime(notice.updated_at)}</td>
                        <td>
                          <div className={styles.tableActions}>
                            <button type="button" className={styles.secondaryButton} onClick={() => editNotice(notice)}>
                              編集
                            </button>
                            <button type="button" className={styles.dangerButton} onClick={() => void deleteNotice(notice.id)}>
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className={styles.emptyState}>
                        {searchQuery.trim() ? "条件に一致するお知らせはありません。" : "登録されたお知らせはありません。"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <form className={styles.subGrid} onSubmit={saveNotice}>
              <div>
                <h3 className={styles.sectionTitle}>お知らせの登録と更新</h3>
                <p className={styles.sectionMeta}>一覧から編集・削除を行い、フォームで内容を更新します。</p>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>タイトル</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>カテゴリ</span>
                  <select
                    className={styles.select}
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        category: event.target.value as NoticeFormState["category"],
                      }))
                    }
                  >
                    <option value="important">重要</option>
                    <option value="info">一般</option>
                    <option value="warning">注意</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>状態</span>
                  <select
                    className={styles.select}
                    value={form.status}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        status: event.target.value as NoticeStatus,
                      }))
                    }
                  >
                    <option value="draft">下書き</option>
                    <option value="published">公開</option>
                    <option value="archived">アーカイブ</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>公開日時</span>
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={form.publishedAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, publishedAt: event.target.value }))}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>固定表示</span>
                  <select
                    className={styles.select}
                    value={form.isPinned ? "yes" : "no"}
                    onChange={(event) => setForm((prev) => ({ ...prev, isPinned: event.target.value === "yes" }))}
                  >
                    <option value="no">固定しない</option>
                    <option value="yes">固定する</option>
                  </select>
                </label>

                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>本文</span>
                  <textarea
                    className={styles.textarea}
                    value={form.content}
                    onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                  {isSubmitting ? "保存中..." : mode === "create" ? "お知らせを登録" : "お知らせを更新"}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={resetForm}>
                  クリア
                </button>
              </div>
            </form>
          </div>
        </article>
      </section>
    </AdminNoticeShell>
  );
}
