"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/features/i18n";
import type { MinutesCreateRequest } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";
import type { Minute } from "./minutes-list";
import styles from "./minutes-form.module.css";

type MinutesFormProps = {
  agendaId: string;
  onMinuteAdded?: () => void;
  editingMinute?: Minute | null;
  isMutationAllowed: boolean;
  onEditCancel?: () => void;
  onMinuteSaved?: () => void;
};

export function MinutesForm({
  agendaId,
  onMinuteAdded,
  editingMinute,
  isMutationAllowed,
  onEditCancel,
  onMinuteSaved,
}: MinutesFormProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editingMinute) {
      setTitle(editingMinute.title);
      setBody(editingMinute.body);
      setErrorMessage(null);
      setSuccessMessage(null);
      return;
    }

    setTitle("");
    setBody("");
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [editingMinute]);

  useEffect(() => {
    // Clear messages after 3 seconds
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isMutationAllowed) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const isEditing = Boolean(editingMinute);
      const requestBody: MinutesCreateRequest = {
        title,
        body,
        content_type: "text",
        pdf_s3_key: null,
        pdf_url: null,
      };

      const response = await apiFetch(
        isEditing ? `/api/v1/minutes/${editingMinute?.id}` : `/api/v1/minutes/agenda/${agendaId}`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        setErrorMessage(error.detail || t("minutesForm.error.failed"));
        return;
      }

      setSuccessMessage(isEditing ? t("minutesForm.success.updated") : t("minutesForm.success.added"));
      setTitle("");
      setBody("");
      if (isEditing) {
        onMinuteSaved?.();
        onEditCancel?.();
        return;
      }

      onMinuteAdded?.();
    } catch (error) {
      console.error("Failed to submit minute:", error);
      setErrorMessage(t("minutesForm.error.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>{editingMinute ? t("minutesForm.editTitle") : t("minutesForm.title")}</h4>

      {editingMinute ? <p className={styles.editingNotice}>{t("minutesForm.editingNotice")}</p> : null}
      {!isMutationAllowed ? <p className={styles.restrictionNotice}>{t("minutesWindow.lockedNotice")}</p> : null}

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="minute-title" className={styles.label}>
            {t("minutesForm.fields.title")}
          </label>
          <input
            id="minute-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("minutesForm.fields.titlePlaceholder")}
            className={styles.input}
            required
            disabled={!isMutationAllowed || isSubmitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="minute-body" className={styles.label}>
            {t("minutesForm.fields.body")}
          </label>
          <textarea
            id="minute-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("minutesForm.fields.bodyPlaceholder")}
            className={styles.textarea}
            rows={6}
            required
            disabled={!isMutationAllowed || isSubmitting}
          />
        </div>

        <div className={styles.buttonGroup}>
          {editingMinute ? (
            <button type="button" className={styles.buttonSecondary} onClick={onEditCancel} disabled={isSubmitting}>
              {t("minutesForm.cancelEdit")}
            </button>
          ) : null}
          <button type="submit" className={styles.button} disabled={!isMutationAllowed || isSubmitting}>
            {isSubmitting
              ? t("minutesForm.submitting")
              : editingMinute
                ? t("minutesForm.update")
                : t("minutesForm.submit")}
          </button>
        </div>
      </form>
    </section>
  );
}
