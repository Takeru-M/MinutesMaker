"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

import { Footer, Header } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import type { AgendaDetailResponse } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";
import { isWithinMinutesMutationWindow } from "../../../lib/minutes-window";
import { MinutesList, type Minute } from "./minutes-list";
import { MinutesForm } from "./minutes-form";
import styles from "./agenda-detail-view.module.css";

// PDF.js ワーカーの設定
if (typeof window !== "undefined") {
  // API と同じバージョンの worker を使って不一致エラーを防ぐ
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

type AgendaDetailViewProps = {
  agendaId: string;
};

export function AgendaDetailView({ agendaId }: AgendaDetailViewProps) {
  const { locale, t } = useI18n();
  const [agenda, setAgenda] = useState<AgendaDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [minutesRefreshTrigger, setMinutesRefreshTrigger] = useState(0);
  const [editingMinute, setEditingMinute] = useState<Minute | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const normalizedAgendaId = agendaId?.trim();
  const isValidAgendaId = /^\d+$/.test(normalizedAgendaId);

  useEffect(() => {
    if (!isValidAgendaId) {
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    const fetchAgenda = async () => {
      try {
        const response = await apiFetch(`/api/v1/agendas/${normalizedAgendaId}`);
        if (response.status === 404) {
          setIsNotFound(true);
          return;
        }
        if (!response.ok) {
          setHasFetchError(true);
          return;
        }

        const data = (await response.json()) as AgendaDetailResponse;
        setAgenda(data);
      } catch (error) {
        console.error("Failed to fetch agenda detail:", error);
        setHasFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgenda();
  }, [isValidAgendaId, normalizedAgendaId]);

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

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [locale],
  );

  const isMinutesMutationAllowed = agenda ? isWithinMinutesMutationWindow(agenda.meeting_date) : false;

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

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return dateFormatter.format(date);
  };

  const formatMeetingType = (value: string) => {
    if (value === "large") {
      return t("agendaForm.meetingTypes.large");
    }
    if (value === "block") {
      return t("agendaForm.meetingTypes.block");
    }
    if (value === "annual") {
      return t("agendaForm.meetingTypes.annual");
    }
    return value;
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
              {t("agendaDetailView.home")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link href="/agenda" className={styles.breadcrumbLink}>
              {t("agendaListView.title")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{t("agendaDetailView.current")}</span>
          </div>

          <section className={styles.hero}>
            <p className={styles.badge}>{t("agendaDetailView.badge")}</p>
            <h2 className={styles.title}>{t("agendaDetailView.title")}</h2>
            <p className={styles.description}>{t("agendaDetailView.description")}</p>
          </section>

          {isLoading ? <section className={styles.panel}>{t("agendaDetailView.loading")}</section> : null}

          {!isLoading && isNotFound ? <section className={styles.panel}>{t("agendaDetailView.notFound")}</section> : null}

          {!isLoading && hasFetchError ? <section className={styles.panel}>{t("agendaDetailView.fetchFailed")}</section> : null}

          {!isLoading && agenda && !hasFetchError ? (
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>{agenda.title}</h3>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <tbody>
                    <tr>
                      <th>{t("agendaDetailView.fields.meetingDate")}</th>
                      <td>{formatDate(agenda.meeting_date)}</td>
                      <th>{t("agendaDetailView.fields.meetingType")}</th>
                      <td>{formatMeetingType(agenda.meeting_type)}</td>
                    </tr>
                    <tr>
                      <th>{t("agendaDetailView.fields.responsible")}</th>
                      <td colSpan={3}>{agenda.responsible || "-"}</td>
                    </tr>
                    <tr>
                      <th>{t("agendaDetailView.fields.votingItems")}</th>
                      <td colSpan={3} className={styles.votingItemsCell}>{agenda.voting_items || "-"}</td>
                    </tr>
                    <tr>
                      <th>{t("agendaDetailView.fields.agendaTypes")}</th>
                      <td colSpan={3}>{agenda.agenda_types.length > 0 ? agenda.agenda_types.join(" / ") : "-"}</td>
                    </tr>
                    <tr>
                      <th>{t("agendaDetailView.fields.createdAt")}</th>
                      <td>{formatDateTime(agenda.created_at)}</td>
                      <th>{t("agendaDetailView.fields.updatedAt")}</th>
                      <td>{formatDateTime(agenda.updated_at)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <section className={styles.contentSection}>
                <h4 className={styles.contentHeading}>{t("agendaDetailView.fields.content")}</h4>
                <p className={styles.contentBody}>{agenda.content || "-"}</p>
              </section>

              <section className={styles.contentSection}>
                <h4 className={styles.contentHeading}>{t("agendaDetailView.fields.pdf")}</h4>
                {agenda.pdf_url ? (
                  <>
                    <div className={styles.pdfViewerWrap}>
                      <Document
                        file={agenda?.pdf_url ?? undefined}
                        onLoadSuccess={({ numPages }: { numPages: number }) => {
                          setNumPages(numPages);
                        }}
                        onLoadError={(error: Error) => {
                          console.error("Failed to load PDF:", error);
                        }}
                        className={styles.pdfDocument}
                        loading={
                          <div style={{ padding: "20px", textAlign: "center" }}>
                            <p>{t("agendaDetailView.pdfLoading") || "Loading PDF..."}</p>
                          </div>
                        }
                        error={
                          <div style={{ padding: "20px", textAlign: "center" }}>
                            <p style={{ color: "#dc2626" }}>
                              {t("agendaDetailView.pdfError") || "Failed to load PDF"}
                            </p>
                            <p style={{ fontSize: "0.875rem", color: "#666" }}>
                              PDF URL: {agenda.pdf_url}
                            </p>
                          </div>
                        }
                      >
                        {Array.from({ length: numPages ?? 0 }, (_, index) => (
                          <Page
                            key={`pdf-page-${index + 1}`}
                            pageNumber={index + 1}
                            width={780}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                          />
                        ))}
                      </Document>
                    </div>
                  </>
                ) : (
                  <p className={styles.contentBody}>-</p>
                )}
              </section>

              <MinutesList
                agendaId={normalizedAgendaId}
                refreshTrigger={minutesRefreshTrigger}
                editingMinuteId={editingMinute?.id ?? null}
                isMutationAllowed={isMinutesMutationAllowed}
                onRequestEdit={setEditingMinute}
                onMinuteDeleted={() => {
                  setMinutesRefreshTrigger((prev) => prev + 1);
                  setEditingMinute(null);
                }}
              />

              <MinutesForm
                agendaId={normalizedAgendaId}
                editingMinute={editingMinute}
                isMutationAllowed={isMinutesMutationAllowed}
                onEditCancel={() => setEditingMinute(null)}
                onMinuteAdded={() => setMinutesRefreshTrigger((prev) => prev + 1)}
                onMinuteSaved={() => setMinutesRefreshTrigger((prev) => prev + 1)}
              />
            </section>
          ) : null}
        </main>
      </Container>

      <Footer />
    </div>
  );
}
