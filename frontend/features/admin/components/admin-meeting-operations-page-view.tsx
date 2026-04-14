"use client";

import { useI18n } from "@/features/i18n";
import { AdminFeaturePageShell } from "./admin-feature-page-shell";

export function AdminMeetingOperationsPageView() {
  const { t } = useI18n();

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
        },
        {
          title: t("adminMeetingOperationsPage.items.agendaManage.title"),
          description: t("adminMeetingOperationsPage.items.agendaManage.description"),
        },
        {
          title: t("adminMeetingOperationsPage.items.minutesWorkflow.title"),
          description: t("adminMeetingOperationsPage.items.minutesWorkflow.description"),
        },
      ]}
    />
  );
}
