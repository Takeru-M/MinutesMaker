"use client";

import { ContentSearchForm } from "@/features/content-list/components";
import { useI18n } from "@/features/i18n";

type NoticeSearchFormProps = {
  initialFilters: {
    date: string;
    source: string;
    title: string;
  };
};

export function NoticeSearchForm({ initialFilters }: NoticeSearchFormProps) {
  const { t } = useI18n();

  return (
    <ContentSearchForm
      fields={[
        { name: "date", label: t("noticeView.filters.date"), type: "date" },
        {
          name: "source",
          label: t("noticeView.filters.source"),
          type: "text",
          placeholder: t("noticeView.placeholders.source"),
        },
        {
          name: "title",
          label: t("noticeView.filters.title"),
          type: "text",
          placeholder: t("noticeView.placeholders.title"),
        },
      ]}
      initialValues={initialFilters}
      submitLabel={t("noticeView.searchButton")}
      resetLabel={t("noticeView.resetButton")}
      buildHref={(values) => {
        const params = new URLSearchParams();

        if (values.date) {
          params.set("date", values.date);
        }

        if (values.source.trim()) {
          params.set("source", values.source.trim());
        }

        if (values.title.trim()) {
          params.set("title", values.title.trim());
        }

        const query = params.toString();

        return query ? `/notice?${query}` : "/notice";
      }}
      resetHref="/notice"
    />
  );
}
