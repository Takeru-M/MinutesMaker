"use client";

import { useI18n } from "@/features/i18n";
import { AdminFeaturePageShell } from "./admin-feature-page-shell";

export function AdminAccountPermissionPageView() {
  const { t } = useI18n();

  return (
    <AdminFeaturePageShell
      redirectPath="/admin/features/account-permission"
      badge={t("adminAccountPermissionPage.badge")}
      title={t("adminAccountPermissionPage.title")}
      description={t("adminAccountPermissionPage.description")}
      sectionTitle={t("adminFeatureCommon.operationExamples")}
      items={[
        {
          title: t("adminAccountPermissionPage.items.userManage.title"),
          description: t("adminAccountPermissionPage.items.userManage.description"),
          href: "/admin/features/account-permission/user-management",
        },
      ]}
    />
  );
}
