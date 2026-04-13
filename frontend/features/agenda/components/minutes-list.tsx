"use client";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/features/i18n";
import type { MinutesListResponse, MinutesResponse } from "@/lib/api-types";
import { apiFetch, getCurrentUser } from "@/lib/api-client";
import styles from "./minutes-list.module.css";

export type Minute = MinutesResponse;

type MinutesListProps = {
  agendaId: string;
  refreshTrigger?: number;
  editingMinuteId?: number | null;
  isMutationAllowed: boolean;
  onRequestEdit?: (minute: Minute) => void;
  onMinuteDeleted?: () => void;
};

export function MinutesList({
  agendaId,
  refreshTrigger,
  editingMinuteId,
  isMutationAllowed,
  onRequestEdit,
  onMinuteDeleted,
}: MinutesListProps) {
  const { locale, t } = useI18n();
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [deletingMinuteId, setDeletingMinuteId] = useState<number | null>(null);

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

  const handleDeleteMinute = async (minuteId: number) => {
    const confirmed = window.confirm(t("minutesList.deleteConfirm"));
    if (!confirmed) {
      return;
    }

    try {
      setDeletingMinuteId(minuteId);
      const response = await apiFetch(`/api/v1/minutes/${minuteId}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || t("minutesList.deleteFailed"));
      }

      setMinutes((prev) => prev.filter((minute) => minute.id !== minuteId));
      onMinuteDeleted?.();
    } catch (error) {
      console.error("Failed to delete minute:", error);
      window.alert(error instanceof Error ? error.message : t("minutesList.deleteFailed"));
    } finally {
      setDeletingMinuteId(null);
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setCurrentUserId(currentUser?.id ?? null);
      } catch (error) {
        console.error("Failed to fetch current user:", error);
        setCurrentUserId(null);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchMinutes = async () => {
      try {
        setIsLoading(true);
        setHasFetchError(false);

        const response = await apiFetch(`/api/v1/minutes/agenda/${agendaId}`);
        if (!response.ok) {
          setHasFetchError(true);
          return;
        }

        const data = (await response.json()) as MinutesListResponse;
        setMinutes(data.items || []);
      } catch (error) {
        console.error("Failed to fetch minutes:", error);
        setHasFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMinutes();
  }, [agendaId, refreshTrigger]);

  if (isLoading) {
    return <div className={styles.container}>{t("minutesList.loading")}</div>;
  }

  if (hasFetchError) {
    return <div className={styles.error}>{t("minutesList.fetchFailed")}</div>;
  }

  if (minutes.length === 0) {
    return <div className={styles.empty}>{t("minutesList.empty")}</div>;
  }

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>{t("minutesList.title")}</h4>
      {!isMutationAllowed ? <p className={styles.restrictionNotice}>{t("minutesWindow.lockedNotice")}</p> : null}
      <div className={styles.list}>
        {minutes.map((minute) => (
          <article
            key={minute.id}
            className={`${styles.item} ${editingMinuteId === minute.id ? styles.itemSelected : ""}`}
          >
            <div className={styles.header}>
              <h5 className={styles.title}>{minute.title}</h5>
              <div className={styles.headerActions}>
                {currentUserId === minute.created_by && minute.content_type === "text" ? (
                  <>
                    <button
                      type="button"
                      className={styles.editButton}
                      onClick={() => onRequestEdit?.(minute)}
                      disabled={!isMutationAllowed}
                    >
                      {t("minutesList.edit")}
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDeleteMinute(minute.id)}
                      disabled={!isMutationAllowed || deletingMinuteId === minute.id}
                    >
                      {deletingMinuteId === minute.id ? t("minutesList.deleting") : t("minutesList.delete")}
                    </button>
                  </>
                ) : null}
                <span className={styles.meta}>{formatDateTime(minute.created_at)}</span>
              </div>
            </div>
            <p className={styles.body}>{minute.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
