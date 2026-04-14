"use client";

import { useI18n } from "@/features/i18n";
import { AdminContentManagementPageView } from "./admin-content-management-page-view";

export function AdminGuidePageView() {
  const { t } = useI18n();

  return (
    <AdminContentManagementPageView
      redirectPath="/admin/features/guide"
      badge={t("adminGuidePage.badge")}
      title={t("adminGuidePage.title")}
      description={t("adminGuidePage.description")}
      contentType="guide"
      searchTitle={t("adminContentManagementCommon.searchTitle")}
      searchDescription={t("adminContentManagementCommon.searchDescription")}
      searchPlaceholder={t("adminContentManagementCommon.searchPlaceholder")}
      listTitle={t("adminContentManagementCommon.listTitle")}
      listDescription={t("adminContentManagementCommon.listDescription")}
      formTitle={t("adminGuidePage.items.contentManage.title")}
      formDescription={t("adminGuidePage.items.contentManage.description")}
      totalLabel={t("adminContentManagementCommon.totalLabel")}
      publishedLabel={t("adminContentManagementCommon.publishedLabel")}
      loadingLabel={t("adminContentManagementCommon.loading")}
      fetchFailedLabel={t("adminContentManagementCommon.fetchFailed")}
      noResultsLabel={t("adminContentManagementCommon.noResults")}
      newButtonLabel={t("adminContentManagementCommon.newButton")}
      editButtonLabel={t("adminContentManagementCommon.editButton")}
      deleteButtonLabel={t("adminContentManagementCommon.deleteButton")}
      saveButtonCreateLabel={t("adminContentManagementCommon.saveButtonCreate")}
      saveButtonUpdateLabel={t("adminContentManagementCommon.saveButtonUpdate")}
      clearButtonLabel={t("adminContentManagementCommon.clearButton")}
      createSuccessLabel={t("adminContentManagementCommon.createSuccess")}
      updateSuccessLabel={t("adminContentManagementCommon.updateSuccess")}
      deleteSuccessLabel={t("adminContentManagementCommon.deleteSuccess")}
      deleteConfirmLabel={t("adminContentManagementCommon.deleteConfirm")}
      authorLabel={t("adminContentManagementCommon.authorLabel")}
      updatedAtLabel={t("adminContentManagementCommon.updatedAtLabel")}
      statusLabel={t("adminContentManagementCommon.statusLabel")}
      titleFieldLabel={t("adminContentManagementCommon.titleField")}
      statusFieldLabel={t("adminContentManagementCommon.statusField")}
      contentFieldLabel={t("adminContentManagementCommon.contentField")}
      contentHelpLabel={t("adminContentManagementCommon.contentHelp")}
      detailLabel={t("adminContentManagementCommon.detailLabel")}
      noSelectionLabel={t("adminContentManagementCommon.noSelection")}
      selectedAttachmentsLabel={t("adminContentManagementCommon.selectedAttachments")}
    />
  );
}
