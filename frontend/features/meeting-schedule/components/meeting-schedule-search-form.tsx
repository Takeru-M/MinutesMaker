"use client";

import { ContentSearchForm } from "@/features/content-list/components";

import { useI18n } from "@/features/i18n";

type MeetingScheduleSearchFormProps = {
  initialFilters: {
    date: string;
    host: string;
    title: string;
    meetingType: string;
  };
  meetingTypeOptions: Array<{
    value: string;
    label: string;
  }>;
};

export function MeetingScheduleSearchForm({
  initialFilters,
  meetingTypeOptions,
}: MeetingScheduleSearchFormProps) {
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
        {
          name: "meetingType",
          label: t("meetingScheduleView.filters.meetingType"),
          type: "select",
          placeholder: t("meetingScheduleView.placeholders.meetingTypeAll"),
          options: meetingTypeOptions,
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

        if (values.meetingType) {
          params.set("meetingType", values.meetingType);
        }

        const query = params.toString();

        return query ? `/meeting-schedule?${query}` : "/meeting-schedule";
      }}
      resetHref="/meeting-schedule"
    />
  );
}