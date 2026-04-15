"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Footer, Header } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import type { ContentDetailResponse, ContentAttachmentResponse } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";
import styles from "./guide-detail-view.module.css";

type GuideDetailViewProps = {
  contentId: string;
};

export function GuideDetailView({ contentId }: GuideDetailViewProps) {
  const { t } = useI18n();

  const [content, setContent] = useState<ContentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      const normalized = (contentId ?? "").trim();
      const token = normalized.split("-").at(-1) ?? "";
      const numericContentId = /^\d+$/.test(normalized)
        ? normalized
        : /^\d+$/.test(token)
          ? token
          : "";

      if (!numericContentId) {
        setIsNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setIsNotFound(false);
        setHasFetchError(false);

        const response = await apiFetch(`/api/v1/guide/${numericContentId}`);
        if (response.status === 404) {
          setIsNotFound(true);
          return;
        }
        if (!response.ok) {
          setHasFetchError(true);
          return;
        }

        const data = (await response.json()) as ContentDetailResponse;
        setContent(data);
      } catch (error) {
        console.error("Failed to fetch guide detail:", error);
        setHasFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [contentId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (hasFetchError || !content) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">{t("common.error")}</p>
        <Link href="/guide" className="mt-4 inline-block text-blue-500 hover:underline">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlowTop} aria-hidden="true" />
      <div className={styles.bgGlowBottom} aria-hidden="true" />
      <Header />

      <Container>
        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>
              {t("guideView.home")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link href="/guide" className={styles.breadcrumbLink}>
              {t("guideView.title")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{t("guideView.current")}</span>
          </div>

          <section className={styles.hero}>
            <p className={styles.badge}>{t("guideView.badge")}</p>
            <h2 className={styles.title}>{t("guideView.title")}</h2>
            <p className={styles.description}>{t("guideView.description")}</p>
          </section>

          {isLoading ? <section className={styles.panel}>{t("guideView.loading")}</section> : null}
          {!isLoading && isNotFound ? <section className={styles.panel}>データが見つかりませんでした。</section> : null}
          {!isLoading && hasFetchError ? <section className={styles.panel}>{t("guideView.fetchFailed")}</section> : null}

          {!isLoading && content && !hasFetchError ? (
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>{content.title}</h3>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <tbody>
                    <tr>
                      <th>作成者</th>
                      <td>{content.created_by_name || "-"}</td>
                      <th>作成日時</th>
                      <td>{formatDate(content.created_at)}</td>
                    </tr>
                    <tr>
                      <th>更新日時</th>
                      <td colSpan={3}>{formatDate(content.updated_at)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <section className={styles.contentSection}>
                <h4 className={styles.contentHeading}>内容</h4>
                <p className={styles.contentBody}>{content.content || "-"}</p>
              </section>

              <section className={styles.contentSection}>
                <h4 className={styles.contentHeading}>添付物</h4>
                {content.attachments.length === 0 ? (
                  <p className={styles.contentBody}>添付ファイルはありません。</p>
                ) : (
                  <ul className={styles.attachmentList}>
                    {content.attachments.map((attachment: ContentAttachmentResponse) => (
                      <li key={attachment.id} className={styles.attachmentItem}>
                        <span>{`${attachment.file_name} (${formatFileSize(attachment.file_size)})`}</span>
                        <a
                          href={attachment.download_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.downloadLink}
                        >
                          ダウンロード
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </section>
          ) : null}
        </main>
      </Container>

      <Footer />
    </div>
  );
}

