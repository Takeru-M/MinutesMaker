"use client";

import { useI18n } from "@/features/i18n";
import { AdminFeaturePageShell } from "./admin-feature-page-shell";

export function AdminRepositoryPageView() {
  const { t } = useI18n();

  return (
    <AdminFeaturePageShell
      redirectPath="/admin/features/repository"
      badge={t("adminRepositoryPage.badge")}
      title={t("adminRepositoryPage.title")}
      description={t("adminRepositoryPage.description")}
      sectionTitle={t("adminFeatureCommon.operationExamples")}
      items={[
        {
          title: t("adminRepositoryPage.items.contentManage.title"),
          description: t("adminRepositoryPage.items.contentManage.description"),
        },
        {
          title: t("adminRepositoryPage.items.attachmentManage.title"),
          description: t("adminRepositoryPage.items.attachmentManage.description"),
        },
        {
          title: t("adminRepositoryPage.items.publishManage.title"),
          description: t("adminRepositoryPage.items.publishManage.description"),
        },
      ]}
    />
  );
}
