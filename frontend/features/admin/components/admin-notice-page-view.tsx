"use client";

import { useI18n } from "@/features/i18n";
import { AdminFeaturePageShell } from "./admin-feature-page-shell";

export function AdminNoticePageView() {
  const { t } = useI18n();

  return (
    <AdminFeaturePageShell
      redirectPath="/admin/features/notice"
      badge={t("adminNoticePage.badge")}
      title={t("adminNoticePage.title")}
      description={t("adminNoticePage.description")}
      sectionTitle={t("adminFeatureCommon.operationExamples")}
      items={[
        {
          title: t("adminNoticePage.items.createPublish.title"),
          description: t("adminNoticePage.items.createPublish.description"),
        },
        {
          title: t("adminNoticePage.items.categoryManage.title"),
          description: t("adminNoticePage.items.categoryManage.description"),
        },
        {
          title: t("adminNoticePage.items.pinnedManage.title"),
          description: t("adminNoticePage.items.pinnedManage.description"),
        },
      ]}
    />
  );
}
