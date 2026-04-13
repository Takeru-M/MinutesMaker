"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Footer, Header } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import type { MeetingDetailResponse } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";
import styles from "./meeting-detail-view.module.css";

type MeetingDetailViewProps = {
  meetingId: string;
};

export function MeetingDetailView({ meetingId }: MeetingDetailViewProps) {
  const { locale, t } = useI18n();
  const [meeting, setMeeting] = useState<MeetingDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);

  const normalizedMeetingId = meetingId?.trim();
  const isValidMeetingId = /^\d+$/.test(normalizedMeetingId);

  useEffect(() => {
    if (!isValidMeetingId) {
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    const fetchMeeting = async () => {
      try {
        const response = await apiFetch(`/api/v1/meetings/${normalizedMeetingId}`);
        if (response.status === 404) {
          setIsNotFound(true);
          return;
        }
        if (!response.ok) {
          setHasFetchError(true);
          return;
        }

        const data = (await response.json()) as MeetingDetailResponse;
        setMeeting(data);
      } catch (error) {
        console.error("Failed to fetch meeting detail:", error);
        setHasFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeeting();
  }, [isValidMeetingId, normalizedMeetingId]);

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

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return dateTimeFormatter.format(date);
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

  const formatMeetingScale = (value: string) => {
    if (value === "large") {
      return t("meetingDetailView.meetingScales.large");
    }
    if (value === "medium") {
      return t("meetingDetailView.meetingScales.medium");
    }
    if (value === "small") {
      return t("meetingDetailView.meetingScales.small");
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
              {t("meetingDetailView.home")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link href="/meeting-schedule" className={styles.breadcrumbLink}>
              {t("meetingScheduleView.title")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{t("meetingDetailView.current")}</span>
          </div>

          <section className={styles.hero}>
            <p className={styles.badge}>{t("meetingDetailView.badge")}</p>
            <h2 className={styles.title}>{t("meetingDetailView.title")}</h2>
            <p className={styles.description}>{t("meetingDetailView.description")}</p>
          </section>

          {isLoading ? <section className={styles.panel}>{t("meetingDetailView.loading")}</section> : null}
          {!isLoading && isNotFound ? <section className={styles.panel}>{t("meetingDetailView.notFound")}</section> : null}
          {!isLoading && hasFetchError ? <section className={styles.panel}>{t("meetingDetailView.fetchFailed")}</section> : null}

          {!isLoading && meeting && !hasFetchError ? (
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>{meeting.title}</h3>

              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <p className={styles.metaLabel}>{t("meetingDetailView.fields.scheduledAt")}</p>
                  <p className={styles.metaValue}>{formatDateTime(meeting.scheduled_at)}</p>
                </div>
                <div className={styles.metaItem}>
                  <p className={styles.metaLabel}>{t("meetingDetailView.fields.location")}</p>
                  <p className={styles.metaValue}>{meeting.location || "-"}</p>
                </div>
                <div className={styles.metaItem}>
                  <p className={styles.metaLabel}>{t("meetingDetailView.fields.meetingType")}</p>
                  <p className={styles.metaValue}>{formatMeetingType(meeting.meeting_type)}</p>
                </div>
                <div className={styles.metaItem}>
                  <p className={styles.metaLabel}>{t("meetingDetailView.fields.meetingScale")}</p>
                  <p className={styles.metaValue}>{formatMeetingScale(meeting.meeting_scale)}</p>
                </div>
              </div>

              {meeting.meeting_scale === "large" ? (
                <>
                  <h4 className={styles.panelTitle}>{t("meetingDetailView.largeAgendaTitle")}</h4>
                  {meeting.agendas.length === 0 ? (
                    <p className={styles.noticeText}>{t("meetingDetailView.noAgenda")}</p>
                  ) : (
                    <ol className={styles.agendaList}>
                      {meeting.agendas.map((agenda) => (
                        <li key={agenda.id}>
                          <Link className={styles.agendaLink} href={`/agenda/${agenda.id}`}>
                            {agenda.order_no}. {agenda.title}
                          </Link>
                          <span className={styles.agendaMeta}>{agenda.responsible || "-"}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              ) : (
                <p className={styles.noticeText}>{t("meetingDetailView.smallPlaceholder")}</p>
              )}
            </section>
          ) : null}
        </main>
      </Container>

      <Footer />
    </div>
  );
}
