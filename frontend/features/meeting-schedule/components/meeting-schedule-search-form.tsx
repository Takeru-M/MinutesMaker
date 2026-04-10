"use client";

import { ContentSearchForm } from "@/features/content-list/components";

import { useI18n } from "@/features/i18n";

type MeetingScheduleSearchFormProps = {
  initialFilters: {
    date: string;
    host: string;
    title: string;
  };
};

export function MeetingScheduleSearchForm({ initialFilters }: MeetingScheduleSearchFormProps) {
  const { t } = useI18n();

  return (
    <ContentSearchForm
      fields={[
        { name: "date", label: t("meetingScheduleView.filters.date"), type: "date" },
        {
          name: "host",
          label: t("meetingScheduleView.filters.host"),
          type: "text",
          placeholder: t("meetingScheduleView.placeholders.host"),
        },
        {
          name: "title",
          label: t("meetingScheduleView.filters.title"),
          type: "text",
          placeholder: t("meetingScheduleView.placeholders.title"),
        },
      ]}
      initialValues={initialFilters}
      submitLabel={t("meetingScheduleView.searchButton")}
      resetLabel={t("meetingScheduleView.resetButton")}
      buildHref={(values) => {
        const params = new URLSearchParams();

        if (values.date) {
          params.set("date", values.date);
        }

        if (values.host.trim()) {
          params.set("host", values.host.trim());
        }

        if (values.title.trim()) {
          params.set("title", values.title.trim());
        }

        const query = params.toString();

        return query ? `/meeting-schedule?${query}` : "/meeting-schedule";
      }}
      resetHref="/meeting-schedule"
    />
  );
}