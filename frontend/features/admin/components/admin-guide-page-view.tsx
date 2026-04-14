"use client";

import { useI18n } from "@/features/i18n";
import { AdminFeaturePageShell } from "./admin-feature-page-shell";

export function AdminGuidePageView() {
  const { t } = useI18n();

  return (
    <AdminFeaturePageShell
      redirectPath="/admin/features/guide"
      badge={t("adminGuidePage.badge")}
      title={t("adminGuidePage.title")}
      description={t("adminGuidePage.description")}
      sectionTitle={t("adminFeatureCommon.operationExamples")}
      items={[
        {
          title: t("adminGuidePage.items.contentManage.title"),
          description: t("adminGuidePage.items.contentManage.description"),
        },
        {
          title: t("adminGuidePage.items.versionManage.title"),
          description: t("adminGuidePage.items.versionManage.description"),
        },
        {
          title: t("adminGuidePage.items.publishManage.title"),
          description: t("adminGuidePage.items.publishManage.description"),
        },
      ]}
    />
  );
}
