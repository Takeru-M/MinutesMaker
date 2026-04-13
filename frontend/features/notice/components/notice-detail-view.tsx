"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Footer, Header } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import type { NoticeDetailResponse } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";
import styles from "./notice-detail-view.module.css";

type NoticeDetailViewProps = {
  noticeId: string;
};

export function NoticeDetailView({ noticeId }: NoticeDetailViewProps) {
  const { locale, t } = useI18n();
  const [notice, setNotice] = useState<NoticeDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);

  const normalizedNoticeId = noticeId?.trim();
  const isValidNoticeId = /^\d+$/.test(normalizedNoticeId);

  useEffect(() => {
    if (!isValidNoticeId) {
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    const fetchNotice = async () => {
      try {
        const response = await apiFetch(`/api/v1/notices/${normalizedNoticeId}`);
        if (response.status === 404) {
          setIsNotFound(true);
          return;
        }
        if (!response.ok) {
          setHasFetchError(true);
          return;
        }

        const data = (await response.json()) as NoticeDetailResponse;
        setNotice(data);
      } catch (error) {
        console.error("Failed to fetch notice detail:", error);
        setHasFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotice();
  }, [isValidNoticeId, normalizedNoticeId]);

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return dateTimeFormatter.format(date);
  };

  const formatCategory = (value: NoticeDetailResponse["category"]) => {
    if (value === "important") {
      return t("noticeDetailView.categories.important");
    }
    if (value === "warning") {
      return t("noticeDetailView.categories.warning");
    }
    return t("noticeDetailView.categories.info");
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
              {t("noticeDetailView.home")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link href="/notice" className={styles.breadcrumbLink}>
              {t("noticeView.title")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{t("noticeDetailView.current")}</span>
          </div>

          <section className={styles.hero}>
            <p className={styles.badge}>{t("noticeDetailView.badge")}</p>
            <h2 className={styles.title}>{t("noticeDetailView.title")}</h2>
            <p className={styles.description}>{t("noticeDetailView.description")}</p>
          </section>

          {isLoading ? <section className={styles.panel}>{t("noticeDetailView.loading")}</section> : null}

          {!isLoading && isNotFound ? <section className={styles.panel}>{t("noticeDetailView.notFound")}</section> : null}

          {!isLoading && hasFetchError ? <section className={styles.panel}>{t("noticeDetailView.fetchFailed")}</section> : null}

          {!isLoading && notice && !hasFetchError ? (
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>{notice.title}</h3>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <tbody>
                    <tr>
                      <th>{t("noticeDetailView.fields.id")}</th>
                      <td>{notice.id}</td>
                      <th>{t("noticeDetailView.fields.category")}</th>
                      <td>{formatCategory(notice.category)}</td>
                    </tr>
                    <tr>
                      <th>{t("noticeDetailView.fields.createdBy")}</th>
                      <td>{notice.created_by_name}</td>
                      <th>{t("noticeDetailView.fields.publishedAt")}</th>
                      <td>{formatDateTime(notice.published_at)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <section className={styles.contentSection}>
                <h4 className={styles.contentHeading}>{t("noticeDetailView.fields.content")}</h4>
                <p className={styles.contentBody}>{notice.content || "-"}</p>
              </section>
            </section>
          ) : null}
        </main>
      </Container>

      <Footer />
    </div>
  );
}
