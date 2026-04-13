"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/features/i18n";
import { AgendaFormData } from "@/features/agenda/types/agenda-form";
import { validateRequiredAgendaFields } from "@/features/agenda/validation/agenda-form-validation";
import type { AgendaCreateRequest, AgendaPdfUploadResponse, AgendaSearchItemResponse, MeetingListItemResponse } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";
import { formatDateToJapanese } from "@/lib/date-formatter";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearAgendaFieldError,
  resetAgendaValidation,
  validateAgendaForm,
} from "@/store/slices/agenda-validation-slice";
import styles from "./agenda-submit-form.module.css";

const AGENDA_TYPES = [
  { id: "announcement", labelKey: "agendaForm.types.announcement" },
  { id: "discussion", labelKey: "agendaForm.types.discussion" },
  { id: "voting", labelKey: "agendaForm.types.voting" },
  { id: "recruitment", labelKey: "agendaForm.types.recruitment" },
  { id: "voting-planned", labelKey: "agendaForm.types.votingPlanned" },
];

const MEETING_TYPES = [
  { value: "block", labelKey: "agendaForm.meetingTypes.block" },
] as const;

const isVotingRelatedTypeSelected = (types: string[]) => types.includes("voting") || types.includes("voting-planned");

type RelatedAgendaItem = {
  id: number;
  title: string;
  meetingTitle: string;
  meetingType: string;
  meetingScheduledAt: string;
};

type RelatedScope = "past" | "other";

export function AgendaSubmitForm() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const errors = useAppSelector((state: RootState) => state.agendaValidation.errors);

  const initialFormData: AgendaFormData = {
    date: "",
    meetingType: "",
    types: [],
    title: "",
    responsible: "",
    password: "",
    passwordConfirm: "",
    body: "",
    pdfFile: null,
    votingItems: "",
    relatedPastAgendaIds: [],
    relatedOtherAgendaIds: [],
  };

  const [formData, setFormData] = useState<AgendaFormData>(initialFormData);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfTypeError, setPdfTypeError] = useState<string | null>(null);
  const [isSubmittingToApi, setIsSubmittingToApi] = useState(false);
  const [agendaDates, setAgendaDates] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(true);

  const [pastQuery, setPastQuery] = useState("");
  const [otherQuery, setOtherQuery] = useState("");
  const [pastResults, setPastResults] = useState<RelatedAgendaItem[]>([]);
  const [otherResults, setOtherResults] = useState<RelatedAgendaItem[]>([]);
  const [selectedPastItems, setSelectedPastItems] = useState<RelatedAgendaItem[]>([]);
  const [selectedOtherItems, setSelectedOtherItems] = useState<RelatedAgendaItem[]>([]);
  const [isPastLoading, setIsPastLoading] = useState(false);
  const [isOtherLoading, setIsOtherLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfDialogRef = useRef<HTMLDialogElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "body") {
      dispatch(clearAgendaFieldError("body"));
    }

    if (name in formData) {
      dispatch(clearAgendaFieldError(name as keyof AgendaFormData));
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;

    if (!selectedFile) {
      setFormData((prev) => ({ ...prev, pdfFile: null }));
      return;
    }

    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setPdfTypeError("agendaForm.errors.pdfOnly");
      setFormData((prev) => ({ ...prev, pdfFile: null }));
      e.target.value = "";
      return;
    }

    setPdfTypeError(null);
    setFormData((prev) => ({
      ...prev,
      pdfFile: selectedFile,
    }));
    dispatch(clearAgendaFieldError("body"));
  };

  const handleRemovePdf = () => {
    setFormData((prev) => ({ ...prev, pdfFile: null }));
    setPdfPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenPdfPreview = () => {
    if (!formData.pdfFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(formData.pdfFile);
    setPdfPreviewUrl(objectUrl);
    pdfDialogRef.current?.showModal();
  };

  const handlePdfStatusClick = () => {
    if (formData.pdfFile) {
      handleOpenPdfPreview();
      return;
    }

    fileInputRef.current?.click();
  };

  const handleClosePdfPreview = () => {
    if (pdfDialogRef.current?.open) {
      pdfDialogRef.current.close();
    }
    setPdfPreviewUrl(null);
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const handleTypeChange = (typeId: string) => {
    setFormData((prev) => {
      const nextTypes = prev.types.includes(typeId)
        ? prev.types.filter((t) => t !== typeId)
        : [...prev.types, typeId];

      if (!isVotingRelatedTypeSelected(nextTypes)) {
        dispatch(clearAgendaFieldError("votingItems"));
      }

      return {
        ...prev,
        types: nextTypes,
      };
    });
    dispatch(clearAgendaFieldError("types"));
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setPdfPreviewUrl(null);
    setPdfTypeError(null);
    setPastQuery("");
    setOtherQuery("");
    setPastResults([]);
    setOtherResults([]);
    setSelectedPastItems([]);
    setSelectedOtherItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (pdfDialogRef.current?.open) {
      pdfDialogRef.current.close();
    }
    dispatch(resetAgendaValidation());
  };

  const searchRelatedAgendas = async (scope: RelatedScope) => {
    const query = scope === "past" ? pastQuery : otherQuery;
    const meetingType = scope === "past" ? "block" : "annual";
    if (scope === "past") {
      setIsPastLoading(true);
    } else {
      setIsOtherLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("query", query);
      params.set("meeting_type", meetingType);
      params.set("limit", "20");

      const response = await apiFetch(`/api/v1/agendas/search?${params.toString()}`);
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as AgendaSearchItemResponse[];
      const mapped: RelatedAgendaItem[] = data.map((item) => ({
        id: item.id,
        title: item.title,
        meetingTitle: item.meeting_title,
        meetingType: item.meeting_type,
        meetingScheduledAt: item.meeting_scheduled_at,
      }));
      if (scope === "past") {
        setPastResults(mapped);
      } else {
        setOtherResults(mapped);
      }
    } finally {
      if (scope === "past") {
        setIsPastLoading(false);
      } else {
        setIsOtherLoading(false);
      }
    }
  };

  const addRelatedAgenda = (scope: RelatedScope, agendaId: number) => {
    const sourceResults = scope === "past" ? pastResults : otherResults;
    const selectedAgenda = sourceResults.find((agenda) => agenda.id === agendaId);

    setFormData((prev) => {
      if (scope === "past") {
        if (prev.relatedPastAgendaIds.includes(agendaId)) {
          return prev;
        }
        return {
          ...prev,
          relatedPastAgendaIds: [...prev.relatedPastAgendaIds, agendaId],
        };
      }

      if (prev.relatedOtherAgendaIds.includes(agendaId)) {
        return prev;
      }
      return {
        ...prev,
        relatedOtherAgendaIds: [...prev.relatedOtherAgendaIds, agendaId],
      };
    });

    if (!selectedAgenda) {
      return;
    }

    if (scope === "past") {
      setSelectedPastItems((prev) =>
        prev.some((agenda) => agenda.id === selectedAgenda.id) ? prev : [...prev, selectedAgenda],
      );
      return;
    }

    setSelectedOtherItems((prev) =>
      prev.some((agenda) => agenda.id === selectedAgenda.id) ? prev : [...prev, selectedAgenda],
    );
  };

  const removeRelatedAgenda = (scope: RelatedScope, agendaId: number) => {
    setFormData((prev) => {
      if (scope === "past") {
        setSelectedPastItems((prev) => prev.filter((agenda) => agenda.id !== agendaId));
        return {
          ...prev,
          relatedPastAgendaIds: prev.relatedPastAgendaIds.filter((id) => id !== agendaId),
        };
      }
      setSelectedOtherItems((prev) => prev.filter((agenda) => agenda.id !== agendaId));
      return {
        ...prev,
        relatedOtherAgendaIds: prev.relatedOtherAgendaIds.filter((id) => id !== agendaId),
      };
    });
  };

  useEffect(() => {
    const fetchBlockMeetings = async () => {
      setIsLoadingDates(true);
      try {
        const response = await apiFetch("/api/v1/meetings?limit=500");
        if (!response.ok) {
          return;
        }

        const meetings = (await response.json()) as MeetingListItemResponse[];
        // ブロック会議のみをフィルタリング
        const blockMeetings = meetings.filter((m) => m.meeting_type === "block");
        // 日付でソートし、重複を除去
        const uniqueMeetings = new Map<string, MeetingListItemResponse>();
        blockMeetings.forEach((m) => {
          const dateKey = new Date(m.scheduled_at).toISOString().split("T")[0];
          if (!uniqueMeetings.has(dateKey)) {
            uniqueMeetings.set(dateKey, m);
          }
        });

        const dates = Array.from(uniqueMeetings.values()).map((m) => ({
          value: new Date(m.scheduled_at).toISOString().split("T")[0],
          label: formatDateToJapanese(m.scheduled_at),
        }));

        setAgendaDates(dates);
      } finally {
        setIsLoadingDates(false);
      }
    };

    fetchBlockMeetings();
    searchRelatedAgendas("past");
    searchRelatedAgendas("other");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    dispatch(validateAgendaForm(formData));
    const latestErrors = validateRequiredAgendaFields(formData);

    if (Object.keys(latestErrors).length > 0) {
      return;
    }

    setIsSubmittingToApi(true);
    try {
      let pdfS3Key: string | null = null;
      let pdfUrl: string | null = null;

      if (formData.pdfFile) {
        const uploadFormData = new FormData();
        uploadFormData.set("file", formData.pdfFile);

        const uploadResponse = await apiFetch("/api/v1/agendas/upload-pdf", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          alert(t("agendaForm.errors.submitFailed"));
          return;
        }

        const uploadData = (await uploadResponse.json()) as AgendaPdfUploadResponse;
        pdfS3Key = uploadData.s3_key;
        pdfUrl = uploadData.url;
      }

      const payload: AgendaCreateRequest = {
        meeting_date: formData.date,
        meeting_type: formData.meetingType as AgendaCreateRequest["meeting_type"],
        title: formData.title,
        responsible: formData.responsible.trim() || null,
        description: null,
        content: formData.body.trim() || null,
        status: "draft",
        priority: 3,
        agenda_types: formData.types,
        voting_items: formData.votingItems.trim() || null,
        pdf_s3_key: pdfS3Key,
        pdf_url: pdfUrl,
        related_past_agenda_ids: formData.relatedPastAgendaIds,
        related_other_agenda_ids: formData.relatedOtherAgendaIds,
      };

      const response = await apiFetch("/api/v1/agendas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        alert(t("agendaForm.errors.submitFailed"));
        return;
      }

      alert(t("agendaForm.submitted"));
      handleReset();
      searchRelatedAgendas("past");
      searchRelatedAgendas("other");
    } catch {
      alert(t("agendaForm.errors.submitFailed"));
    } finally {
      setIsSubmittingToApi(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <form onSubmit={handleSubmit} onReset={handleReset} className={styles.form}>
          {/* 日程 */}
          <div className={styles.formGroup}>
            <label htmlFor="meetingType" className={styles.label}>
              {t("agendaForm.labels.meetingType")} <span className={styles.required}>*</span>
            </label>
            <select
              id="meetingType"
              name="meetingType"
              value={formData.meetingType}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.meetingType ? styles.inputError : ""}`}
            >
              <option value="" disabled>
                {t("agendaForm.placeholders.meetingType")}
              </option>
              {MEETING_TYPES.map((meetingType) => (
                <option key={meetingType.value} value={meetingType.value}>
                  {t(meetingType.labelKey)}
                </option>
              ))}
            </select>
            {errors.meetingType && <p className={styles.errorText}>{t(errors.meetingType)}</p>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="date" className={styles.label}>
              {t("agendaForm.labels.date")} <span className={styles.required}>*</span>
            </label>
            <select
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.date ? styles.inputError : ""}`}
              disabled={isLoadingDates}
            >
              <option value="" disabled>
                {isLoadingDates ? t("common.loading") : t("agendaForm.placeholders.date")}
              </option>
              {agendaDates.map((agendaDate) => (
                <option key={agendaDate.value} value={agendaDate.value}>
                  {agendaDate.label}
                </option>
              ))}
            </select>
            <p className={styles.helperText}>{t("agendaForm.hints.meetingDateType")}</p>
            {errors.date && <p className={styles.errorText}>{t(errors.date)}</p>}
          </div>

          {/* 議案の種別 */}
          <div className={styles.formGroup}>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>
                {t("agendaForm.labels.types")} <span className={styles.required}>*</span>
              </legend>
              <div className={styles.checkboxGroup}>
                {AGENDA_TYPES.map((type) => (
                  <label key={type.id} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.types.includes(type.id)}
                      onChange={() => handleTypeChange(type.id)}
                      className={styles.checkbox}
                    />
                    {t(type.labelKey)}
                  </label>
                ))}
              </div>
              {errors.types && <p className={styles.errorText}>{t(errors.types)}</p>}
            </fieldset>
          </div>

          {/* タイトル */}
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              {t("agendaForm.labels.title")} <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder={t("agendaForm.placeholders.title")}
              className={`${styles.input} ${errors.title ? styles.inputError : ""}`}
            />
            {errors.title && <p className={styles.errorText}>{t(errors.title)}</p>}
          </div>

          {/* 分責者 */}
          <div className={styles.formGroup}>
            <label htmlFor="responsible" className={styles.label}>
              {t("agendaForm.labels.responsible")} <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="responsible"
              name="responsible"
              value={formData.responsible}
              onChange={handleInputChange}
              placeholder={t("agendaForm.placeholders.responsible")}
              className={`${styles.input} ${errors.responsible ? styles.inputError : ""}`}
            />
            {errors.responsible && <p className={styles.errorText}>{t(errors.responsible)}</p>}
          </div>

          {/* パスワード */}
          <div className={styles.twoColumn}>
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                {t("agendaForm.labels.password")} <span className={styles.required}>*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
              />
              {errors.password && <p className={styles.errorText}>{t(errors.password)}</p>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="passwordConfirm" className={styles.label}>
                {t("agendaForm.labels.passwordConfirm")} <span className={styles.required}>*</span>
              </label>
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.passwordConfirm ? styles.inputError : ""}`}
              />
              {errors.passwordConfirm && <p className={styles.errorText}>{t(errors.passwordConfirm)}</p>}
            </div>
          </div>

          {/* 本文 */}
          <div className={styles.label}>
            {t("agendaForm.labels.bodyOrPdf")} <span className={styles.required}>*</span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="body" className={styles.label}>
              {t("agendaForm.labels.body")}
            </label>
            <textarea
              id="body"
              name="body"
              value={formData.body}
              onChange={handleInputChange}
              placeholder={t("agendaForm.placeholders.body")}
              rows={8}
              className={`${styles.textarea} ${errors.body ? styles.inputError : ""}`}
            />
          </div>

          {/* PDFアップロード */}
          <div className={styles.formGroup}>
            <label htmlFor="pdfFile" className={styles.label}>
              {t("agendaForm.labels.pdf")}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id="pdfFile"
              name="pdfFile"
              accept="application/pdf,.pdf"
              onChange={handlePdfChange}
              className={styles.visuallyHiddenInput}
            />
            <button type="button" className={styles.fileSelectButton} onClick={handlePdfStatusClick}>
              {formData.pdfFile ? formData.pdfFile.name : "ファイルを選択"}
            </button>
            <p className={styles.fileHint}>{t("agendaForm.placeholders.pdf")}</p>

            {formData.pdfFile && (
              <div className={styles.fileActions}>
                <button type="button" className={styles.removeFileButton} onClick={handleRemovePdf}>
                  {t("agendaForm.buttons.removePdf")}
                </button>
              </div>
            )}

            {pdfTypeError && <p className={styles.errorText}>{t(pdfTypeError)}</p>}
            {errors.body && <p className={styles.errorText}>{t(errors.body)}</p>}
          </div>

          {/* 採決項目 */}
          {isVotingRelatedTypeSelected(formData.types) && (
            <div className={styles.formGroup}>
              <label htmlFor="votingItems" className={styles.label}>
                {t("agendaForm.labels.votingItems")} <span className={styles.required}>*</span>
              </label>
              <textarea
                id="votingItems"
                name="votingItems"
                value={formData.votingItems}
                onChange={handleInputChange}
                placeholder={t("agendaForm.placeholders.votingItems")}
                rows={5}
                className={`${styles.textarea} ${errors.votingItems ? styles.inputError : ""}`}
              />
              {errors.votingItems && <p className={styles.errorText}>{t(errors.votingItems)}</p>}
            </div>
          )}

          {/* 過去のブロック会議の議案 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("agendaForm.labels.relatedPast")}</label>
            <div className={styles.relatedSearchRow}>
              <input
                type="text"
                value={pastQuery}
                onChange={(event) => setPastQuery(event.target.value)}
                className={styles.input}
                placeholder={t("agendaForm.placeholders.relatedSearch")}
              />
              <button
                type="button"
                className={styles.relatedSearchButton}
                onClick={() => searchRelatedAgendas("past")}
                disabled={isPastLoading}
              >
                {isPastLoading ? t("agendaForm.buttons.searching") : t("agendaForm.buttons.searchRelated")}
              </button>
            </div>
            <div className={styles.relatedList}>
              {pastResults.length === 0 ? (
                <p className={styles.placeholderText}>{t("agendaForm.placeholders.relatedPast")}</p>
              ) : (
                pastResults.map((agenda) => (
                  <button
                    type="button"
                    key={`past-${agenda.id}`}
                    className={styles.relatedListItem}
                    onClick={() => addRelatedAgenda("past", agenda.id)}
                  >
                    <strong>{agenda.title}</strong>
                    <span>{agenda.meetingTitle}</span>
                  </button>
                ))
              )}
            </div>
            <div className={styles.selectedTags}>
              {selectedPastItems.map((agenda) => (
                <span key={`past-selected-${agenda.id}`} className={styles.selectedTag}>
                  {agenda.title}
                  <button type="button" onClick={() => removeRelatedAgenda("past", agenda.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* その他の関連議案 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("agendaForm.labels.relatedOther")}</label>
            <div className={styles.relatedSearchRow}>
              <input
                type="text"
                value={otherQuery}
                onChange={(event) => setOtherQuery(event.target.value)}
                className={styles.input}
                placeholder={t("agendaForm.placeholders.relatedSearch")}
              />
              <button
                type="button"
                className={styles.relatedSearchButton}
                onClick={() => searchRelatedAgendas("other")}
                disabled={isOtherLoading}
              >
                {isOtherLoading ? t("agendaForm.buttons.searching") : t("agendaForm.buttons.searchRelated")}
              </button>
            </div>
            <div className={styles.relatedList}>
              {otherResults.length === 0 ? (
                <p className={styles.placeholderText}>{t("agendaForm.placeholders.relatedOther")}</p>
              ) : (
                otherResults.map((agenda) => (
                  <button
                    type="button"
                    key={`other-${agenda.id}`}
                    className={styles.relatedListItem}
                    onClick={() => addRelatedAgenda("other", agenda.id)}
                  >
                    <strong>{agenda.title}</strong>
                    <span>{agenda.meetingTitle}</span>
                  </button>
                ))
              )}
            </div>
            <div className={styles.selectedTags}>
              {selectedOtherItems.map((agenda) => (
                <span key={`other-selected-${agenda.id}`} className={styles.selectedTag}>
                  {agenda.title}
                  <button type="button" onClick={() => removeRelatedAgenda("other", agenda.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* ボタン */}
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitButton}>
              {isSubmittingToApi ? t("agendaForm.buttons.submitting") : t("agendaForm.buttons.submit")}
            </button>
            <button type="reset" className={styles.resetButton}>
              {t("agendaForm.buttons.reset")}
            </button>
          </div>
        </form>
      </div>

      <dialog ref={pdfDialogRef} className={styles.previewDialog} onClose={handleClosePdfPreview}>
        <div className={styles.previewDialogHeader}>
          <strong>{formData.pdfFile?.name}</strong>
          <button type="button" className={styles.previewCloseButton} onClick={handleClosePdfPreview}>
            {t("agendaForm.buttons.closePreview")}
          </button>
        </div>
        {pdfPreviewUrl && <iframe src={pdfPreviewUrl} className={styles.previewFrame} title="PDF Preview" />}
      </dialog>
    </div>
  );
}
