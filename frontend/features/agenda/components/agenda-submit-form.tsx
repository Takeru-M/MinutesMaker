"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/features/i18n";
import { AgendaFormData } from "@/features/agenda/types/agenda-form";
import { validateRequiredAgendaFields } from "@/features/agenda/validation/agenda-form-validation";
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

const MOCK_AGENDA_DATES = [
  { value: "2026-04-06", label: "4月6日のブロック会議" },
  { value: "2026-04-13", label: "4月13日のブロック会議" },
  { value: "2026-04-20", label: "4月20日のブロック会議" },
  { value: "2026-04-27", label: "4月27日のブロック会議" },
];

const isVotingRelatedTypeSelected = (types: string[]) => types.includes("voting") || types.includes("voting-planned");

export function AgendaSubmitForm() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const errors = useAppSelector((state: RootState) => state.agendaValidation.errors);

  const initialFormData: AgendaFormData = {
    date: "",
    types: [],
    title: "",
    responsible: "",
    password: "",
    passwordConfirm: "",
    body: "",
    pdfFile: null,
    votingItems: "",
  };

  const [formData, setFormData] = useState<AgendaFormData>(initialFormData);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfTypeError, setPdfTypeError] = useState<string | null>(null);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (pdfDialogRef.current?.open) {
      pdfDialogRef.current.close();
    }
    dispatch(resetAgendaValidation());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    dispatch(validateAgendaForm(formData));
    const latestErrors = validateRequiredAgendaFields(formData);

    if (Object.keys(latestErrors).length > 0) {
      return;
    }

    // ここでAPIに送信する処理を追加
    console.log("Form submitted:", formData);
    alert(t("agendaForm.submitted"));
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <form onSubmit={handleSubmit} onReset={handleReset} className={styles.form}>
          {/* 日程 */}
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
            >
              <option value="" disabled>
                {t("agendaForm.placeholders.date")}
              </option>
              {MOCK_AGENDA_DATES.map((agendaDate) => (
                <option key={agendaDate.value} value={agendaDate.value}>
                  {agendaDate.label}
                </option>
              ))}
            </select>
            <p className={styles.helperText}>{t("agendaForm.hints.dateMock")}</p>
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
            <div className={styles.placeholderBox}>
              <p className={styles.placeholderText}>{t("agendaForm.placeholders.relatedPast")}</p>
            </div>
          </div>

          {/* その他の関連議案 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("agendaForm.labels.relatedOther")}</label>
            <div className={styles.placeholderBox}>
              <p className={styles.placeholderText}>{t("agendaForm.placeholders.relatedOther")}</p>
            </div>
          </div>

          {/* ボタン */}
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitButton}>
              {t("agendaForm.buttons.submit")}
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
