"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Footer, Header } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import type {
  MeetingDetailResponse,
  MinutesCreateRequest,
  MinutesListResponse,
  MinutesPdfUploadResponse,
  MinutesResponse,
} from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";
import { isWithinMinutesMutationWindow } from "../../../lib/minutes-window";
import styles from "./small-meeting-detail-view.module.css";

type SmallMeetingDetailViewProps = {
  meetingId: string;
};

export function SmallMeetingDetailView({ meetingId }: SmallMeetingDetailViewProps) {
  const { locale, t } = useI18n();
  const [meeting, setMeeting] = useState<MeetingDetailResponse | null>(null);
  const [minutesItems, setMinutesItems] = useState<MinutesResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<"text" | "pdf">("text");
  const [body, setBody] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const normalizedMeetingId = meetingId?.trim();
  const isValidMeetingId = /^\d+$/.test(normalizedMeetingId);

  useEffect(() => {
    if (!isValidMeetingId) {
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    const fetchAll = async () => {
      try {
        const [meetingRes, minutesRes] = await Promise.all([
          apiFetch(`/api/v1/meetings/${normalizedMeetingId}`),
          apiFetch(`/api/v1/minutes/meeting/${normalizedMeetingId}?limit=200`),
        ]);

        if (meetingRes.status === 404) {
          setIsNotFound(true);
          return;
        }

        if (!meetingRes.ok || !minutesRes.ok) {
          setHasFetchError(true);
          return;
        }

        const meetingData = (await meetingRes.json()) as MeetingDetailResponse;
        const minutesData = (await minutesRes.json()) as MinutesListResponse;

        setMeeting(meetingData);
        setMinutesItems(minutesData.items);
      } catch (error) {
        console.error("Failed to fetch small meeting detail:", error);
        setHasFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
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

  const isMinutesMutationAllowed = meeting ? isWithinMinutesMutationWindow(meeting.scheduled_at) : false;

  const resetForm = () => {
    setTitle("");
    setContentType("text");
    setBody("");
    setPdfFile(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidMeetingId) {
      return;
    }

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setSubmitError(t("smallMeetingDetailView.form.errors.titleRequired"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let payload: MinutesCreateRequest = {
        title: normalizedTitle,
        content_type: contentType,
        body: null,
        pdf_s3_key: null,
        pdf_url: null,
      };

      if (contentType === "text") {
        const normalizedBody = body.trim();
        if (!normalizedBody) {
          setSubmitError(t("smallMeetingDetailView.form.errors.bodyRequired"));
          setIsSubmitting(false);
          return;
        }
        payload = {
          ...payload,
          body: normalizedBody,
        };
      } else {
        if (!pdfFile) {
          setSubmitError(t("smallMeetingDetailView.form.errors.pdfRequired"));
          setIsSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", pdfFile);

        setIsUploadingPdf(true);
        const uploadResponse = await apiFetch("/api/v1/minutes/upload-pdf", {
          method: "POST",
          body: formData,
        });
        setIsUploadingPdf(false);

        if (!uploadResponse.ok) {
          setSubmitError(t("smallMeetingDetailView.form.errors.uploadFailed"));
          setIsSubmitting(false);
          return;
        }

        const uploaded = (await uploadResponse.json()) as MinutesPdfUploadResponse;
        payload = {
          ...payload,
          pdf_s3_key: uploaded.s3_key,
          pdf_url: uploaded.url,
        };
      }

      const createResponse = await apiFetch(`/api/v1/minutes/meeting/${normalizedMeetingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!createResponse.ok) {
        setSubmitError(t("smallMeetingDetailView.form.errors.submitFailed"));
        setIsSubmitting(false);
        return;
      }

      const created = (await createResponse.json()) as MinutesResponse;
      setMinutesItems((prev) => [created, ...prev]);
      resetForm();
    } catch (error) {
      console.error("Failed to submit minute:", error);
      setSubmitError(t("smallMeetingDetailView.form.errors.submitFailed"));
    } finally {
      setIsSubmitting(false);
      setIsUploadingPdf(false);
    }
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
              {t("smallMeetingDetailView.home")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link href="/meeting-schedule" className={styles.breadcrumbLink}>
              {t("meetingScheduleView.title")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{t("smallMeetingDetailView.current")}</span>
          </div>

          <section className={styles.hero}>
            <p className={styles.badge}>{t("smallMeetingDetailView.badge")}</p>
            <h2 className={styles.title}>{t("smallMeetingDetailView.title")}</h2>
            <p className={styles.description}>{t("smallMeetingDetailView.description")}</p>
          </section>

          {isLoading ? <section className={styles.panel}>{t("smallMeetingDetailView.loading")}</section> : null}
          {!isLoading && isNotFound ? <section className={styles.panel}>{t("smallMeetingDetailView.notFound")}</section> : null}
          {!isLoading && hasFetchError ? <section className={styles.panel}>{t("smallMeetingDetailView.fetchFailed")}</section> : null}

          {!isLoading && meeting && !hasFetchError ? (
            <>
              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>{meeting.title}</h3>

                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <p className={styles.metaLabel}>{t("smallMeetingDetailView.fields.scheduledAt")}</p>
                    <p className={styles.metaValue}>{formatDateTime(meeting.scheduled_at)}</p>
                  </div>
                  <div className={styles.metaItem}>
                    <p className={styles.metaLabel}>{t("smallMeetingDetailView.fields.location")}</p>
                    <p className={styles.metaValue}>{meeting.location || "-"}</p>
                  </div>
                  <div className={styles.metaItem}>
                    <p className={styles.metaLabel}>{t("smallMeetingDetailView.fields.meetingType")}</p>
                    <p className={styles.metaValue}>{formatMeetingType(meeting.meeting_type)}</p>
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>{t("smallMeetingDetailView.materialsTitle")}</h3>
                {meeting.agendas.length === 0 ? (
                  <p className={styles.noticeText}>{t("smallMeetingDetailView.noMaterials")}</p>
                ) : (
                  <ul className={styles.materialList}>
                    {meeting.agendas.map((agenda) => (
                      <li key={agenda.id} className={styles.materialItem}>
                        <p className={styles.materialTitle}>{agenda.order_no}. {agenda.title}</p>
                        {agenda.content ? <p className={styles.materialBody}>{agenda.content}</p> : null}
                        {agenda.pdf_url ? (
                          <a className={styles.downloadLink} href={agenda.pdf_url} target="_blank" rel="noreferrer">
                            {t("smallMeetingDetailView.downloadPdf")}
                          </a>
                        ) : null}
                        {!agenda.content && !agenda.pdf_url ? (
                          <p className={styles.noticeText}>{t("smallMeetingDetailView.noMaterialContent")}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>{t("smallMeetingDetailView.minutesTitle")}</h3>
                {minutesItems.length === 0 ? (
                  <p className={styles.noticeText}>{t("smallMeetingDetailView.noMinutes")}</p>
                ) : (
                  <ul className={styles.minutesList}>
                    {minutesItems.map((minute) => (
                      <li key={minute.id} className={styles.minutesItem}>
                        <p className={styles.minutesTitle}>{minute.title}</p>
                        <p className={styles.minutesMeta}>{formatDateTime(minute.created_at)}</p>
                        {minute.content_type === "text" ? (
                          <p className={styles.minutesBody}>{minute.body}</p>
                        ) : minute.pdf_url ? (
                          <a className={styles.downloadLink} href={minute.pdf_url} target="_blank" rel="noreferrer">
                            {t("smallMeetingDetailView.downloadPdf")}
                          </a>
                        ) : (
                          <p className={styles.noticeText}>{t("smallMeetingDetailView.noMinuteContent")}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <form className={styles.form} onSubmit={handleSubmit}>
                  <h4 className={styles.formTitle}>{t("smallMeetingDetailView.form.title")}</h4>

                  {!isMinutesMutationAllowed ? <p className={styles.noticeText}>{t("minutesWindow.lockedNotice")}</p> : null}

                  <label className={styles.formLabel} htmlFor="minutes-title">
                    {t("smallMeetingDetailView.form.nameLabel")}
                  </label>
                  <input
                    id="minutes-title"
                    className={styles.input}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t("smallMeetingDetailView.form.namePlaceholder")}
                    maxLength={255}
                    required
                    disabled={!isMinutesMutationAllowed || isSubmitting || isUploadingPdf}
                  />

                  <div className={styles.radioRow}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="minutes-content-type"
                        value="text"
                        checked={contentType === "text"}
                        onChange={() => setContentType("text")}
                        disabled={!isMinutesMutationAllowed || isSubmitting || isUploadingPdf}
                      />
                      {t("smallMeetingDetailView.form.textOption")}
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="minutes-content-type"
                        value="pdf"
                        checked={contentType === "pdf"}
                        onChange={() => setContentType("pdf")}
                        disabled={!isMinutesMutationAllowed || isSubmitting || isUploadingPdf}
                      />
                      {t("smallMeetingDetailView.form.pdfOption")}
                    </label>
                  </div>

                  {contentType === "text" ? (
                    <>
                      <label className={styles.formLabel} htmlFor="minutes-body">
                        {t("smallMeetingDetailView.form.bodyLabel")}
                      </label>
                      <textarea
                        id="minutes-body"
                        className={styles.textarea}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        placeholder={t("smallMeetingDetailView.form.bodyPlaceholder")}
                        rows={6}
                        disabled={!isMinutesMutationAllowed || isSubmitting || isUploadingPdf}
                      />
                    </>
                  ) : (
                    <>
                      <label className={styles.formLabel} htmlFor="minutes-pdf">
                        {t("smallMeetingDetailView.form.pdfLabel")}
                      </label>
                      <input
                        id="minutes-pdf"
                        type="file"
                        accept="application/pdf"
                        className={styles.input}
                        onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
                        disabled={!isMinutesMutationAllowed || isSubmitting || isUploadingPdf}
                      />
                    </>
                  )}

                  {submitError ? <p className={styles.errorText}>{submitError}</p> : null}

                  <button
                    className={styles.submitButton}
                    type="submit"
                    disabled={!isMinutesMutationAllowed || isSubmitting || isUploadingPdf}
                  >
                    {isUploadingPdf
                      ? t("smallMeetingDetailView.form.uploading")
                      : isSubmitting
                        ? t("smallMeetingDetailView.form.submitting")
                        : t("smallMeetingDetailView.form.submitButton")}
                  </button>
                </form>
              </section>
            </>
          ) : null}
        </main>
      </Container>

      <Footer />
    </div>
  );
}
