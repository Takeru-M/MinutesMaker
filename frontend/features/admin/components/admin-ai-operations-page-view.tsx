"use client";

import { useI18n } from "@/features/i18n";
import { AdminFeaturePageShell } from "./admin-feature-page-shell";

export function AdminAiOperationsPageView() {
  const { t } = useI18n();

  return (
    <AdminFeaturePageShell
      redirectPath="/admin/features/ai-operations"
      badge={t("adminAiOperationsPage.badge")}
      title={t("adminAiOperationsPage.title")}
      description={t("adminAiOperationsPage.description")}
      sectionTitle={t("adminFeatureCommon.operationExamples")}
      items={[
        {
          title: t("adminAiOperationsPage.items.knowledgeSync.title"),
          description: t("adminAiOperationsPage.items.knowledgeSync.description"),
        },
        {
          title: t("adminAiOperationsPage.items.chunkQuality.title"),
          description: t("adminAiOperationsPage.items.chunkQuality.description"),
        },
        {
          title: t("adminAiOperationsPage.items.qaLogReview.title"),
          description: t("adminAiOperationsPage.items.qaLogReview.description"),
        },
      ]}
    />
  );
}
