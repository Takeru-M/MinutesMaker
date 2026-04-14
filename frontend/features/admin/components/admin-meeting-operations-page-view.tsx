"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Container } from "@/components/ui/container";
import { Footer, Header, PageHero } from "@/components/layout";
import { useI18n } from "@/features/i18n";
import { apiFetch } from "@/lib/api-client";
import type {
  AgendaDetailResponse,
  AgendaListItemResponse,
  MeetingDetailResponse,
  MeetingListItemResponse,
} from "@/lib/api-types";
import { useAppSelector } from "@/store/hooks";
import {
  AGENDA_MEETING_TYPE_OPTIONS,
  AGENDA_STATUS_OPTIONS,
  buildMeetingTitle,
  EMPTY_AGENDA_FORM,
  EMPTY_MEETING_FORM,
  formatDateTimeLocal,
  MEETING_STATUS_OPTIONS,
  MEETING_TYPE_OPTIONS,
  parseNumberList,
  parseStringList,
  type MeetingOperationAgendaFormValues,
  type MeetingOperationMeetingFormValues,
} from "../types/meeting-operations";
import { AdminListSearchBar } from "./admin-list-search-bar";
import { AdminFeaturePageShell } from "./admin-feature-page-shell";
import styles from "./admin-meeting-operations-page-view.module.css";

const ADMIN_ROLES = new Set(["platform_admin", "org_admin", "admin"]);

type MeetingOperationsFeature = "meeting" | "agenda";

type MeetingManagementSectionProps = {
  meetings: MeetingListItemResponse[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetSearch: () => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onChangePage: (page: number) => void;
  meetingForm: MeetingOperationMeetingFormValues;
  isMeetingSubmitting: boolean;
  meetingMode: "create" | "edit";
  onChangeMeetingForm: (updater: (prev: MeetingOperationMeetingFormValues) => MeetingOperationMeetingFormValues) => void;
  onEditMeeting: (meetingId: number) => void;
  onDeleteMeeting: (meetingId: number) => void;
  onResetMeetingForm: () => void;
  onSubmitMeeting: (event: FormEvent<HTMLFormElement>) => void;
};

type AgendaManagementSectionProps = {
  agendas: AgendaListItemResponse[];
  agendaForm: MeetingOperationAgendaFormValues;
  isAgendaSubmitting: boolean;
  agendaMode: "create" | "edit";
  onChangeAgendaForm: (updater: (prev: MeetingOperationAgendaFormValues) => MeetingOperationAgendaFormValues) => void;
  onEditAgenda: (agendaId: number) => void;
  onDeleteAgenda: (agendaId: number) => void;
  onResetAgendaForm: () => void;
  onSubmitAgenda: (event: FormEvent<HTMLFormElement>) => void;
};

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail || fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value: string | null | undefined): string {
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

function formatAgendaDate(value: string | null | undefined): string {
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
  }).format(date);
}

function meetingTypeLabel(value: string): string {
  return MEETING_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function agendaMeetingTypeLabel(value: string): string {
  return AGENDA_MEETING_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function normalizeAgendaMeetingType(value: string): MeetingOperationAgendaFormValues["meetingType"] {
  if (value === "dormitory_general_assembly" || value === "large") {
    return "large";
  }
  if (value === "block") {
    return "block";
  }
  return "annual";
}

function MeetingManagementSection({
  meetings,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onResetSearch,
  currentPage,
  totalPages,
  totalCount,
  onChangePage,
  meetingForm,
  isMeetingSubmitting,
  meetingMode,
  onChangeMeetingForm,
  onEditMeeting,
  onDeleteMeeting,
  onResetMeetingForm,
  onSubmitMeeting,
}: MeetingManagementSectionProps) {
  return (
    <article className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>会議情報管理</h2>
          <p className={styles.sectionMeta}>会議の作成・更新・削除を行います。</p>
        </div>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.secondaryButton} onClick={onResetMeetingForm}>
            新規入力に戻す
          </button>
        </div>
      </div>

      <div className={styles.panel}>
        <AdminListSearchBar
          title="会議検索"
          description="会議タイトル、開催日時、会議種別で絞り込みます。"
          value={searchQuery}
          placeholder="例: 2026/04/14, 大規模会議, 総会"
          onChange={onSearchQueryChange}
          onSubmit={onSearchSubmit}
          onReset={onResetSearch}
        />

        <div className={styles.buttonRow}>
          <span className={styles.statusBadge}>{`全${totalCount}件`}</span>
          <span className={`${styles.statusBadge} ${styles.badgePublished}`}>{`${currentPage}/${Math.max(totalPages, 1)}ページ`}</span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>タイトル</th>
                <th>開催日時</th>
                <th>会議種別</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {meetings.length > 0 ? (
                meetings.map((meeting) => (
                  <tr key={meeting.id}>
                    <td>{meeting.id}</td>
                    <td>{meeting.title}</td>
                    <td>{formatDate(meeting.scheduled_at)}</td>
                    <td>{meetingTypeLabel(meeting.meeting_type)}</td>
                    <td>
                      <div className={styles.tableActions}>
                        <button type="button" className={styles.secondaryButton} onClick={() => onEditMeeting(meeting.id)}>
                          編集
                        </button>
                        <button type="button" className={styles.dangerButton} onClick={() => onDeleteMeeting(meeting.id)}>
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    会議情報はありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <button type="button" className={styles.secondaryButton} disabled={currentPage <= 1} onClick={() => onChangePage(currentPage - 1)}>
            前へ
          </button>
          <div className={styles.paginationNumbers}>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={page === currentPage ? styles.primaryButton : styles.secondaryButton}
                onClick={() => onChangePage(page)}
              >
                {page}
              </button>
            ))}
          </div>
          <button type="button" className={styles.secondaryButton} disabled={currentPage >= totalPages} onClick={() => onChangePage(currentPage + 1)}>
            次へ
          </button>
        </div>

        <form className={styles.subGrid} onSubmit={onSubmitMeeting}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.label}>開催日時</span>
              <input
                className={styles.input}
                type="datetime-local"
                value={meetingForm.scheduledAt}
                onChange={(event) => onChangeMeetingForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>会議種別</span>
              <select
                className={styles.select}
                value={meetingForm.meetingType}
                onChange={(event) =>
                  onChangeMeetingForm((prev) => ({
                    ...prev,
                    meetingType: event.target.value as MeetingOperationMeetingFormValues["meetingType"],
                  }))
                }
              >
                {MEETING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>状態</span>
              <select
                className={styles.select}
                value={meetingForm.status}
                onChange={(event) => onChangeMeetingForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {MEETING_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>場所</span>
              <input
                className={styles.input}
                type="text"
                value={meetingForm.location}
                onChange={(event) => onChangeMeetingForm((prev) => ({ ...prev, location: event.target.value }))}
              />
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>説明</span>
              <textarea
                className={styles.textarea}
                value={meetingForm.description}
                onChange={(event) => onChangeMeetingForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
          </div>

          <div className={styles.autoTitleBox}>
            <span className={styles.label}>自動生成タイトル</span>
            <p className={styles.autoTitleValue}>{buildMeetingTitle(meetingForm.scheduledAt, meetingForm.meetingType)}</p>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={isMeetingSubmitting}>
              {isMeetingSubmitting ? "保存中..." : meetingMode === "create" ? "会議を作成" : "会議を更新"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onResetMeetingForm}>
              クリア
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}

function AgendaManagementSection({
  agendas,
  agendaForm,
  isAgendaSubmitting,
  agendaMode,
  onChangeAgendaForm,
  onEditAgenda,
  onDeleteAgenda,
  onResetAgendaForm,
  onSubmitAgenda,
}: AgendaManagementSectionProps) {
  return (
    <article className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>議案管理</h2>
          <p className={styles.sectionMeta}>議案の作成・更新・削除を行います。</p>
        </div>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.secondaryButton} onClick={onResetAgendaForm}>
            新規入力に戻す
          </button>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>タイトル</th>
                <th>会議日程</th>
                <th>会議種別</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {agendas.length > 0 ? (
                agendas.map((agenda) => (
                  <tr key={agenda.id}>
                    <td>{agenda.id}</td>
                    <td>{agenda.title}</td>
                    <td>{formatAgendaDate(agenda.meeting_scheduled_at)}</td>
                    <td>{agendaMeetingTypeLabel(agenda.meeting_type)}</td>
                    <td>
                      <div className={styles.tableActions}>
                        <button type="button" className={styles.secondaryButton} onClick={() => onEditAgenda(agenda.id)}>
                          編集
                        </button>
                        <button type="button" className={styles.dangerButton} onClick={() => onDeleteAgenda(agenda.id)}>
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    議案はありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form className={styles.subGrid} onSubmit={onSubmitAgenda}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.label}>会議日程</span>
              <input
                className={styles.input}
                type="date"
                value={agendaForm.meetingDate}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, meetingDate: event.target.value }))}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>会議種別</span>
              <select
                className={styles.select}
                value={agendaForm.meetingType}
                onChange={(event) =>
                  onChangeAgendaForm((prev) => ({
                    ...prev,
                    meetingType: event.target.value as MeetingOperationAgendaFormValues["meetingType"],
                  }))
                }
              >
                {AGENDA_MEETING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>タイトル</span>
              <input
                className={styles.input}
                type="text"
                value={agendaForm.title}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>分責者</span>
              <input
                className={styles.input}
                type="text"
                value={agendaForm.responsible}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, responsible: event.target.value }))}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>状態</span>
              <select
                className={styles.select}
                value={agendaForm.status}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {AGENDA_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>優先度</span>
              <input
                className={styles.input}
                type="number"
                min="1"
                max="5"
                value={agendaForm.priority}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, priority: event.target.value }))}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>議案種別</span>
              <input
                className={styles.input}
                type="text"
                value={agendaForm.agendaTypes}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, agendaTypes: event.target.value }))}
              />
              <p className={styles.helpText}>カンマまたは改行で区切って入力してください。</p>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>PDF S3 キー</span>
              <input
                className={styles.input}
                type="text"
                value={agendaForm.pdfS3Key}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, pdfS3Key: event.target.value }))}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>PDF URL</span>
              <input
                className={styles.input}
                type="text"
                value={agendaForm.pdfUrl}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, pdfUrl: event.target.value }))}
              />
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>説明</span>
              <textarea
                className={styles.textarea}
                value={agendaForm.description}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>本文</span>
              <textarea
                className={styles.textarea}
                value={agendaForm.content}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, content: event.target.value }))}
              />
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>採決項目</span>
              <textarea
                className={styles.textarea}
                value={agendaForm.votingItems}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, votingItems: event.target.value }))}
              />
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>過去の議案ID</span>
              <textarea
                className={styles.textarea}
                value={agendaForm.relatedPastAgendaIds}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, relatedPastAgendaIds: event.target.value }))}
              />
            </label>

            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>その他の関連議案ID</span>
              <textarea
                className={styles.textarea}
                value={agendaForm.relatedOtherAgendaIds}
                onChange={(event) => onChangeAgendaForm((prev) => ({ ...prev, relatedOtherAgendaIds: event.target.value }))}
              />
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={isAgendaSubmitting}>
              {isAgendaSubmitting ? "保存中..." : agendaMode === "create" ? "議案を作成" : "議案を更新"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onResetAgendaForm}>
              クリア
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}

export function AdminMeetingOperationsPageView() {
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const { t } = useI18n();

  const [meetings, setMeetings] = useState<MeetingListItemResponse[]>([]);
  const [agendas, setAgendas] = useState<AgendaListItemResponse[]>([]);
  const [meetingForm, setMeetingForm] = useState<MeetingOperationMeetingFormValues>(EMPTY_MEETING_FORM);
  const [agendaForm, setAgendaForm] = useState<MeetingOperationAgendaFormValues>(EMPTY_AGENDA_FORM);
  const [meetingSearchQuery, setMeetingSearchQuery] = useState("");
  const [meetingPage, setMeetingPage] = useState(1);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [selectedAgendaId, setSelectedAgendaId] = useState<number | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<MeetingOperationsFeature | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMeetingSubmitting, setIsMeetingSubmitting] = useState(false);
  const [isAgendaSubmitting, setIsAgendaSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const meetingMode = useMemo(() => (selectedMeetingId === null ? "create" : "edit"), [selectedMeetingId]);
  const agendaMode = useMemo(() => (selectedAgendaId === null ? "create" : "edit"), [selectedAgendaId]);

  const filteredMeetings = useMemo(() => {
    const normalizedQuery = meetingSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return meetings;
    }

    return meetings.filter((meeting) => {
      const haystack = [
        meeting.title,
        formatDate(meeting.scheduled_at),
        meetingTypeLabel(meeting.meeting_type),
        meeting.location ?? "",
        meeting.status,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [meetingSearchQuery, meetings]);

  const meetingPageSize = 10;
  const meetingTotalPages = Math.max(1, Math.ceil(filteredMeetings.length / meetingPageSize));

  const pagedMeetings = useMemo(() => {
    const safePage = Math.min(meetingPage, meetingTotalPages);
    const start = (safePage - 1) * meetingPageSize;
    return filteredMeetings.slice(start, start + meetingPageSize);
  }, [filteredMeetings, meetingPage, meetingTotalPages]);

  useEffect(() => {
    if (meetingPage > meetingTotalPages) {
      setMeetingPage(meetingTotalPages);
    }
  }, [meetingPage, meetingTotalPages]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.replace("/login?redirect=%2Fadmin%2Ffeatures%2Fmeeting-operations");
      return;
    }

    if (auth.role && !ADMIN_ROLES.has(auth.role)) {
      router.replace("/");
    }
  }, [auth.isAuthenticated, auth.role, router]);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.role || !ADMIN_ROLES.has(auth.role)) {
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [meetingResponse, agendaResponse] = await Promise.all([
          apiFetch("/api/v1/meetings?limit=200"),
          apiFetch("/api/v1/agendas?sort_order=newest"),
        ]);

        if (meetingResponse.ok) {
          setMeetings((await meetingResponse.json()) as MeetingListItemResponse[]);
        } else {
          setErrorMessage(await readErrorMessage(meetingResponse, "会議一覧の取得に失敗しました。"));
        }

        if (agendaResponse.ok) {
          setAgendas((await agendaResponse.json()) as AgendaListItemResponse[]);
        } else {
          setErrorMessage(await readErrorMessage(agendaResponse, "議案一覧の取得に失敗しました。"));
        }
      } catch (error) {
        console.error("Failed to load meeting operations:", error);
        setErrorMessage("会議運用管理ページの読み込みに失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [auth.isAuthenticated, auth.role]);

  const refreshData = async () => {
    const [meetingResponse, agendaResponse] = await Promise.all([
      apiFetch("/api/v1/meetings?limit=200"),
      apiFetch("/api/v1/agendas?sort_order=newest"),
    ]);

    if (meetingResponse.ok) {
      setMeetings((await meetingResponse.json()) as MeetingListItemResponse[]);
    }

    if (agendaResponse.ok) {
      setAgendas((await agendaResponse.json()) as AgendaListItemResponse[]);
    }
  };

  const handleMeetingEdit = async (meetingId: number) => {
    setErrorMessage(null);
    const response = await apiFetch(`/api/v1/meetings/${meetingId}`);
    if (!response.ok) {
      setErrorMessage(await readErrorMessage(response, "会議情報を取得できませんでした。"));
      return;
    }

    const meeting = (await response.json()) as MeetingDetailResponse;
    setSelectedMeetingId(meeting.id);
    setMeetingForm({
      description: meeting.description ?? "",
      scheduledAt: formatDateTimeLocal(meeting.scheduled_at),
      location: meeting.location ?? "",
      status: meeting.status,
      meetingType: meeting.meeting_type,
    });
  };

  const handleAgendaEdit = async (agendaId: number) => {
    setErrorMessage(null);
    const response = await apiFetch(`/api/v1/agendas/${agendaId}`);
    if (!response.ok) {
      setErrorMessage(await readErrorMessage(response, "議案情報を取得できませんでした。"));
      return;
    }

    const agenda = (await response.json()) as AgendaDetailResponse;
    setSelectedAgendaId(agenda.id);
    setAgendaForm({
      meetingDate: agenda.meeting_date,
      meetingType: normalizeAgendaMeetingType(agenda.meeting_type),
      title: agenda.title,
      responsible: agenda.responsible ?? "",
      description: agenda.description ?? "",
      content: agenda.content ?? "",
      status: agenda.status,
      priority: agenda.priority.toString(),
      agendaTypes: agenda.agenda_types.join(", "),
      votingItems: agenda.voting_items ?? "",
      pdfS3Key: agenda.pdf_s3_key ?? "",
      pdfUrl: agenda.pdf_url ?? "",
      relatedPastAgendaIds: agenda.related_past_agenda_ids.join(", "),
      relatedOtherAgendaIds: agenda.related_other_agenda_ids.join(", "),
    });
  };

  const resetMeetingForm = () => {
    setSelectedMeetingId(null);
    setMeetingForm(EMPTY_MEETING_FORM);
  };

  const resetAgendaForm = () => {
    setSelectedAgendaId(null);
    setAgendaForm(EMPTY_AGENDA_FORM);
  };

  const handleMeetingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsMeetingSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const title = buildMeetingTitle(meetingForm.scheduledAt, meetingForm.meetingType);

    const payload = {
      title,
      description: meetingForm.description.trim() || null,
      scheduled_at: new Date(meetingForm.scheduledAt).toISOString(),
      location: meetingForm.location.trim() || null,
      status: meetingForm.status.trim(),
      meeting_type: meetingForm.meetingType,
    };

    try {
      const response = await apiFetch(
        selectedMeetingId ? `/api/v1/meetings/${selectedMeetingId}` : "/api/v1/meetings",
        {
          method: selectedMeetingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, "会議情報を保存できませんでした。"));
        return;
      }

      setStatusMessage(selectedMeetingId ? "会議情報を更新しました。" : "会議情報を作成しました。");
      resetMeetingForm();
      await refreshData();
    } catch (error) {
      console.error("Failed to save meeting:", error);
      setErrorMessage("会議情報の保存に失敗しました。");
    } finally {
      setIsMeetingSubmitting(false);
    }
  };

  const handleAgendaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAgendaSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const payload = {
      meeting_date: agendaForm.meetingDate,
      meeting_type: agendaForm.meetingType,
      title: agendaForm.title.trim(),
      responsible: agendaForm.responsible.trim() || null,
      description: agendaForm.description.trim() || null,
      content: agendaForm.content.trim() || null,
      status: agendaForm.status.trim(),
      priority: Number.parseInt(agendaForm.priority, 10),
      agenda_types: parseStringList(agendaForm.agendaTypes),
      voting_items: agendaForm.votingItems.trim() || null,
      pdf_s3_key: agendaForm.pdfS3Key.trim() || null,
      pdf_url: agendaForm.pdfUrl.trim() || null,
      related_past_agenda_ids: parseNumberList(agendaForm.relatedPastAgendaIds),
      related_other_agenda_ids: parseNumberList(agendaForm.relatedOtherAgendaIds),
    };

    try {
      const response = await apiFetch(
        selectedAgendaId ? `/api/v1/agendas/${selectedAgendaId}` : "/api/v1/agendas",
        {
          method: selectedAgendaId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, "議案情報を保存できませんでした。"));
        return;
      }

      setStatusMessage(selectedAgendaId ? "議案情報を更新しました。" : "議案情報を作成しました。");
      resetAgendaForm();
      await refreshData();
    } catch (error) {
      console.error("Failed to save agenda:", error);
      setErrorMessage("議案情報の保存に失敗しました。");
    } finally {
      setIsAgendaSubmitting(false);
    }
  };

  const handleMeetingDelete = async (meetingId: number) => {
    if (!window.confirm("この会議情報を削除しますか？")) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    const response = await apiFetch(`/api/v1/meetings/${meetingId}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      setErrorMessage(await readErrorMessage(response, "会議情報を削除できませんでした。"));
      return;
    }

    if (selectedMeetingId === meetingId) {
      resetMeetingForm();
    }

    setStatusMessage("会議情報を削除しました。");
    await refreshData();
  };

  const handleAgendaDelete = async (agendaId: number) => {
    if (!window.confirm("この議案を削除しますか？")) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);

    const response = await apiFetch(`/api/v1/agendas/${agendaId}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      setErrorMessage(await readErrorMessage(response, "議案を削除できませんでした。"));
      return;
    }

    if (selectedAgendaId === agendaId) {
      resetAgendaForm();
    }

    setStatusMessage("議案を削除しました。");
    await refreshData();
  };

  if (selectedFeature === null) {
    return (
      <AdminFeaturePageShell
        redirectPath="/admin/features/meeting-operations"
        badge={t("adminMeetingOperationsPage.badge")}
        title={t("adminMeetingOperationsPage.title")}
        description={t("adminMeetingOperationsPage.description")}
        sectionTitle={t("adminFeatureCommon.operationExamples")}
        items={[
          {
            title: t("adminMeetingOperationsPage.items.meetingManage.title"),
            description: t("adminMeetingOperationsPage.items.meetingManage.description"),
            onClick: () => setSelectedFeature("meeting"),
          },
          {
            title: t("adminMeetingOperationsPage.items.agendaManage.title"),
            description: t("adminMeetingOperationsPage.items.agendaManage.description"),
            onClick: () => setSelectedFeature("agenda"),
          },
          {
            title: t("adminMeetingOperationsPage.items.minutesWorkflow.title"),
            description: t("adminMeetingOperationsPage.items.minutesWorkflow.description"),
          },
        ]}
      />
    );
  }

  if (!auth.isAuthenticated || !auth.role || !ADMIN_ROLES.has(auth.role)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Header />
        <Container>
          <main className={styles.main}>
            <p className={styles.message}>読み込み中...</p>
          </main>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <Container>
        <main className={styles.main}>
          <PageHero
            badge={t("adminMeetingOperationsPage.badge")}
            title={t("adminMeetingOperationsPage.title")}
            description={t("adminMeetingOperationsPage.description")}
          >
            <div className={styles.buttonRow}>
              <button type="button" className={styles.secondaryButton} onClick={() => setSelectedFeature(null)}>
                機能一覧に戻る
              </button>
            </div>
          </PageHero>

          {statusMessage ? <p className={styles.message}>{statusMessage}</p> : null}
          {errorMessage ? <p className={`${styles.message} ${styles.errorMessage}`}>{errorMessage}</p> : null}

          <section className={styles.grid}>
            {selectedFeature === "meeting" ? (
              <MeetingManagementSection
                meetings={pagedMeetings}
                searchQuery={meetingSearchQuery}
                onSearchQueryChange={(value) => {
                  setMeetingSearchQuery(value);
                  setMeetingPage(1);
                }}
                onSearchSubmit={(event) => {
                  event.preventDefault();
                  setMeetingPage(1);
                }}
                onResetSearch={() => {
                  setMeetingSearchQuery("");
                  setMeetingPage(1);
                }}
                currentPage={meetingPage}
                totalPages={meetingTotalPages}
                totalCount={filteredMeetings.length}
                onChangePage={setMeetingPage}
                meetingForm={meetingForm}
                isMeetingSubmitting={isMeetingSubmitting}
                meetingMode={meetingMode}
                onChangeMeetingForm={(updater) => setMeetingForm(updater)}
                onEditMeeting={(id) => void handleMeetingEdit(id)}
                onDeleteMeeting={(id) => void handleMeetingDelete(id)}
                onResetMeetingForm={resetMeetingForm}
                onSubmitMeeting={(event) => void handleMeetingSubmit(event)}
              />
            ) : null}

            {selectedFeature === "agenda" ? (
              <AgendaManagementSection
                agendas={agendas}
                agendaForm={agendaForm}
                isAgendaSubmitting={isAgendaSubmitting}
                agendaMode={agendaMode}
                onChangeAgendaForm={(updater) => setAgendaForm(updater)}
                onEditAgenda={(id) => void handleAgendaEdit(id)}
                onDeleteAgenda={(id) => void handleAgendaDelete(id)}
                onResetAgendaForm={resetAgendaForm}
                onSubmitAgenda={(event) => void handleAgendaSubmit(event)}
              />
            ) : null}
          </section>
        </main>
      </Container>
      <Footer />
    </div>
  );
}
