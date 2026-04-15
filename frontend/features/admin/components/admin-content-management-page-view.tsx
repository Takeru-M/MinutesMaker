"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Footer, Header, PageHero } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { AdminListSearchBar } from "./admin-list-search-bar";
import { apiFetch } from "@/lib/api-client";
import type {
  ContentAdminDetailResponse,
  ContentItemResponse,
  ContentStatus,
  ContentWriteRequest,
} from "@/lib/api-types";
import { useAppSelector } from "@/store/hooks";
import styles from "./admin-content-management-page-view.module.css";

const ADMIN_ROLES = new Set(["platform_admin", "org_admin", "admin"]);

type ContentType = "repository" | "guide";

type AdminContentManagementPageViewProps = {
  redirectPath: string;
  badge: string;
  title: string;
  description: string;
  contentType: ContentType;
  searchTitle: string;
  searchDescription: string;
  searchPlaceholder: string;
  listTitle: string;
  listDescription: string;
  formTitle: string;
  formDescription: string;
  totalLabel: string;
  publishedLabel: string;
  loadingLabel: string;
  fetchFailedLabel: string;
  noResultsLabel: string;
  editButtonLabel: string;
  deleteButtonLabel: string;
  saveButtonCreateLabel: string;
  saveButtonUpdateLabel: string;
  clearButtonLabel: string;
  createSuccessLabel: string;
  updateSuccessLabel: string;
  deleteSuccessLabel: string;
  deleteConfirmLabel: string;
  authorLabel: string;
  updatedAtLabel: string;
  statusLabel: string;
  titleFieldLabel: string;
  statusFieldLabel: string;
  contentFieldLabel: string;
  contentHelpLabel: string;
  detailLabel: string;
  noSelectionLabel: string;
  selectedAttachmentsLabel: string;
};

type ContentFormState = {
  title: string;
  content: string;
  status: ContentStatus;
};

const EMPTY_FORM: ContentFormState = {
  title: "",
  content: "",
  status: "draft",
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function readErrorMessage(response: Response, fallback: string): Promise<string> {
  return response
    .json()
    .then((payload: { detail?: string }) => payload.detail || fallback)
    .catch(() => fallback);
}

function statusBadgeClass(status: ContentStatus): string {
  if (status === "published") {
    return styles.badgePublished;
  }

  if (status === "archived") {
    return styles.badgeArchived;
  }

  return styles.badgeDraft;
}

export function AdminContentManagementPageView({
  redirectPath,
  badge,
  title,
  description,
  contentType,
  searchTitle,
  searchDescription,
  searchPlaceholder,
  listTitle,
  listDescription,
  formTitle,
  formDescription,
  totalLabel,
  publishedLabel,
  loadingLabel,
  fetchFailedLabel,
  noResultsLabel,
  editButtonLabel,
  deleteButtonLabel,
  saveButtonCreateLabel,
  saveButtonUpdateLabel,
  clearButtonLabel,
  createSuccessLabel,
  updateSuccessLabel,
  deleteSuccessLabel,
  deleteConfirmLabel,
  authorLabel,
  updatedAtLabel,
  statusLabel,
  titleFieldLabel,
  statusFieldLabel,
  contentFieldLabel,
  contentHelpLabel,
  detailLabel,
  noSelectionLabel,
  selectedAttachmentsLabel,
}: AdminContentManagementPageViewProps) {
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const [items, setItems] = useState<ContentItemResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ContentAdminDetailResponse | null>(null);
  const [form, setForm] = useState<ContentFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const maxAttachments = contentType === "repository" ? 5 : 3;
  const maxAttachmentSizeLabel = "15MB";

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (auth.role && !ADMIN_ROLES.has(auth.role)) {
      router.replace("/");
    }
  }, [auth.isAuthenticated, auth.role, redirectPath, router]);

  const refreshItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const query = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : "";
      const response = await apiFetch(`/api/v1/${contentType}${query}`);
      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, fetchFailedLabel));
        return;
      }

      setItems((await response.json()) as ContentItemResponse[]);
    } catch (error) {
      console.error(`Failed to load ${contentType} items:`, error);
      setErrorMessage(fetchFailedLabel);
    } finally {
      setIsLoading(false);
    }
  }, [contentType, fetchFailedLabel, searchQuery]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    if (auth.role && !ADMIN_ROLES.has(auth.role)) {
      return;
    }

    void refreshItems();
  }, [auth.isAuthenticated, auth.role, refreshItems, router, redirectPath]);

  useEffect(() => {
    if (selectedContentId === null) {
      setSelectedDetail(null);
      setForm(EMPTY_FORM);
    }
  }, [selectedContentId]);

  const publishedCount = useMemo(() => items.length, [items]);

  const resetForm = () => {
    setSelectedContentId(null);
    setSelectedDetail(null);
    setForm(EMPTY_FORM);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  const openEditor = async (item: ContentItemResponse) => {
    const contentId = String(item.db_id);
    setSelectedContentId(contentId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await apiFetch(`/api/v1/${contentType}/admin/${contentId}`);
      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, fetchFailedLabel));
        return;
      }

      const detail = (await response.json()) as ContentAdminDetailResponse;
      setSelectedDetail(detail);
      setForm({
        title: detail.title,
        content: detail.content,
        status: detail.status,
      });
    } catch (error) {
      console.error(`Failed to load ${contentType} detail:`, error);
      setErrorMessage(fetchFailedLabel);
    }
  };

  const saveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const payload: ContentWriteRequest = {
      title: form.title.trim(),
      content: form.content.trim(),
      status: form.status,
    };

    try {
      const response = await apiFetch(
        selectedContentId === null ? `/api/v1/${contentType}/admin` : `/api/v1/${contentType}/admin/${selectedContentId}`,
        {
          method: selectedContentId === null ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, fetchFailedLabel));
        return;
      }

      setStatusMessage(selectedContentId === null ? createSuccessLabel : updateSuccessLabel);
      resetForm();
      await refreshItems();
    } catch (error) {
      console.error(`Failed to save ${contentType} content:`, error);
      setErrorMessage(fetchFailedLabel);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadAttachment = async () => {
    if (selectedContentId === null) {
      setErrorMessage("先にコンテンツを作成または選択してください。");
      return;
    }

    const file = attachmentInputRef.current?.files?.[0] ?? null;
    if (!file) {
      setErrorMessage("PDFファイルを選択してください。");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("PDFファイル（.pdf）のみアップロードできます。");
      return;
    }

    setIsAttachmentUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const payload = new FormData();
      payload.set("file", file);

      const response = await apiFetch(`/api/v1/${contentType}/admin/${selectedContentId}/attachments/upload-pdf`, {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, "添付ファイルのアップロードに失敗しました。"));
        return;
      }

      const data = (await response.json()) as { attachment: ContentAdminDetailResponse["attachments"][number] };
      setSelectedDetail((current) => {
        if (!current) {
          return current;
        }
        return { ...current, attachments: [...current.attachments, data.attachment] };
      });
      setStatusMessage("添付ファイルをアップロードしました。");
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    } catch (error) {
      console.error(`Failed to upload ${contentType} attachment:`, error);
      setErrorMessage("添付ファイルのアップロードに失敗しました。");
    } finally {
      setIsAttachmentUploading(false);
    }
  };

  const deleteAttachment = async (attachmentId: number) => {
    if (!selectedContentId) {
      return;
    }
    if (!window.confirm("この添付ファイルを削除しますか？")) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await apiFetch(`/api/v1/${contentType}/admin/${selectedContentId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        setErrorMessage(await readErrorMessage(response, "添付ファイルの削除に失敗しました。"));
        return;
      }

      setSelectedDetail((current) => {
        if (!current) {
          return current;
        }
        return { ...current, attachments: current.attachments.filter((item) => item.id !== attachmentId) };
      });
      setStatusMessage("添付ファイルを削除しました。");
    } catch (error) {
      console.error(`Failed to delete ${contentType} attachment:`, error);
      setErrorMessage("添付ファイルの削除に失敗しました。");
    }
  };

  const deleteContent = async (itemId: number) => {
    if (!window.confirm(deleteConfirmLabel)) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await apiFetch(`/api/v1/${contentType}/admin/${itemId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        setErrorMessage(await readErrorMessage(response, fetchFailedLabel));
        return;
      }

      setItems((current) => current.filter((item) => item.db_id !== itemId));
      if (selectedContentId === String(itemId)) {
        resetForm();
      }
      setStatusMessage(deleteSuccessLabel);
      await refreshItems();
    } catch (error) {
      console.error(`Failed to delete ${contentType} content:`, error);
      setErrorMessage(fetchFailedLabel);
    }
  };

  const totalCountLabel = totalLabel.replace("{{count}}", String(items.length));
  const publishedCountLabel = publishedLabel.replace("{{count}}", String(publishedCount));

  if (!auth.isAuthenticated || !auth.role || !ADMIN_ROLES.has(auth.role)) {
    return null;
  }

  const isEditMode = selectedContentId !== null;

  return (
    <div className={styles.page}>
      <Header />
      <Container>
        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <Link href="/admin/features" className={styles.breadcrumbLink}>
              管理者機能一覧
            </Link>
            <span className={styles.breadcrumbCurrent}>/ {title}</span>
          </div>

          <PageHero badge={badge} title={title} description={description} />

          {statusMessage ? <p className={styles.message}>{statusMessage}</p> : null}
          {errorMessage ? <p className={`${styles.message} ${styles.errorMessage}`}>{errorMessage}</p> : null}

          <section className={styles.grid}>
            <article className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>{listTitle}</h2>
                  <p className={styles.sectionMeta}>{listDescription}</p>
                </div>
                <div className={styles.buttonRow}>
                  <span className={styles.statusBadge}>{totalCountLabel}</span>
                  <span className={`${styles.statusBadge} ${styles.badgePublished}`}>{publishedCountLabel}</span>
                </div>
              </div>

              <div className={styles.panel}>
                <AdminListSearchBar
                  title={searchTitle}
                  description={searchDescription}
                  value={searchQuery}
                  placeholder={searchPlaceholder}
                  onChange={setSearchQuery}
                  onSubmit={(event) => event.preventDefault()}
                  onReset={() => setSearchQuery("")}
                />

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{titleFieldLabel}</th>
                        <th>{authorLabel}</th>
                        <th>{updatedAtLabel}</th>
                        <th>{statusLabel}</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className={styles.emptyState}>
                            {loadingLabel}
                          </td>
                        </tr>
                      ) : items.length > 0 ? (
                        items.map((item) => (
                          <tr key={item.db_id}>
                            <td>{item.title}</td>
                            <td>{item.author}</td>
                            <td>{formatDate(item.date)}</td>
                            <td>
                              <span className={`${styles.statusBadge} ${statusBadgeClass("published")}`}>公開中</span>
                            </td>
                            <td>
                              <div className={styles.tableActions}>
                                <button type="button" className={styles.secondaryButton} onClick={() => void openEditor(item)}>
                                  {editButtonLabel}
                                </button>
                                <button type="button" className={styles.dangerButton} onClick={() => void deleteContent(item.db_id)}>
                                  {deleteButtonLabel}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className={styles.emptyState}>
                            {noResultsLabel}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>

            <article className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>{formTitle}</h2>
                  <p className={styles.sectionMeta}>{formDescription}</p>
                </div>
                <span className={styles.statusBadge}>{detailLabel}</span>
              </div>

              <div className={styles.panel}>
                {selectedDetail ? (
                  <div className={styles.detailSummary}>
                    <div>
                      <p className={styles.detailLabel}>{selectedDetail.title}</p>
                      <p className={styles.detailMeta}>
                        {authorLabel}：{selectedDetail.created_by_name}
                      </p>
                    </div>
                    <div className={styles.detailMetaGroup}>
                      <span>{`${updatedAtLabel}：${formatDateTime(selectedDetail.updated_at)}`}</span>
                      <span>{`${selectedAttachmentsLabel}：${selectedDetail.attachments.length}`}</span>
                      <span>{`${statusLabel}：${statusLabelFromState(selectedDetail.status)}`}</span>
                    </div>
                  </div>
                ) : (
                  <p className={styles.detailFallback}>{noSelectionLabel}</p>
                )}

                <form className={styles.formGrid} onSubmit={saveContent}>
                  <label className={styles.field}>
                    <span className={styles.label}>{titleFieldLabel}</span>
                    <input
                      className={styles.input}
                      type="text"
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>{statusFieldLabel}</span>
                    <select
                      className={styles.select}
                      value={form.status}
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ContentStatus }))}
                    >
                      <option value="draft">下書き</option>
                      <option value="published">公開</option>
                      <option value="archived">アーカイブ</option>
                    </select>
                  </label>

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>{contentFieldLabel}</span>
                    <textarea
                      className={styles.textarea}
                      value={form.content}
                      onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                    />
                  </label>

                  <p className={`${styles.helpText} ${styles.fieldWide}`}>{contentHelpLabel}</p>

                  <div className={`${styles.attachmentBlock} ${styles.fieldWide}`}>
                    <p className={styles.label}>PDF添付</p>
                    <p className={styles.helpText}>{`最大${maxAttachments}件 / 1ファイル最大${maxAttachmentSizeLabel} / PDFのみ`}</p>
                    <div className={styles.attachmentUploadRow}>
                      <input ref={attachmentInputRef} type="file" name="attachmentFile" accept=".pdf,application/pdf" className={styles.input} />
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        disabled={selectedContentId === null || isAttachmentUploading}
                        onClick={() => void uploadAttachment()}
                      >
                        {isAttachmentUploading ? "アップロード中..." : "PDFをアップロード"}
                      </button>
                    </div>

                    {selectedDetail && selectedDetail.attachments.length > 0 ? (
                      <ul className={styles.attachmentList}>
                        {selectedDetail.attachments.map((attachment) => (
                          <li key={attachment.id} className={styles.attachmentItem}>
                            <a href={attachment.download_url || "#"} target="_blank" rel="noopener noreferrer">
                              {attachment.file_name}
                            </a>
                            <span>{formatFileSize(attachment.file_size)}</span>
                            <button
                              type="button"
                              className={styles.dangerButton}
                              onClick={() => void deleteAttachment(attachment.id)}
                            >
                              添付を削除
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.helpText}>添付ファイルはありません。</p>
                    )}
                  </div>

                  <div className={`${styles.formActions} ${styles.fieldWide}`}>
                    <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                      {isSubmitting ? loadingLabel : isEditMode ? saveButtonUpdateLabel : saveButtonCreateLabel}
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={resetForm}>
                      {clearButtonLabel}
                    </button>
                  </div>
                </form>
              </div>
            </article>
          </section>
        </main>
      </Container>
      <Footer />
    </div>
  );
}

function statusLabelFromState(status: ContentStatus): string {
  if (status === "published") {
    return "公開";
  }

  if (status === "archived") {
    return "アーカイブ";
  }

  return "下書き";
}
