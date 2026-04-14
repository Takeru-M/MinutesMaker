"use client";

import { useI18n } from "@/features/i18n";
import { AdminFeaturePageShell } from "./admin-feature-page-shell";

export function AdminAuditPageView() {
  const { t } = useI18n();

  return (
    <AdminFeaturePageShell
      redirectPath="/admin/features/audit"
      badge={t("adminAuditPage.badge")}
      title={t("adminAuditPage.title")}
      description={t("adminAuditPage.description")}
      sectionTitle={t("adminFeatureCommon.operationExamples")}
      items={[
        {
          title: t("adminAuditPage.items.auditLogView.title"),
          description: t("adminAuditPage.items.auditLogView.description"),
        },
        {
          title: t("adminAuditPage.items.changeHistory.title"),
          description: t("adminAuditPage.items.changeHistory.description"),
        },
        {
          title: t("adminAuditPage.items.incidentReview.title"),
          description: t("adminAuditPage.items.incidentReview.description"),
        },
      ]}
    />
  );
}
