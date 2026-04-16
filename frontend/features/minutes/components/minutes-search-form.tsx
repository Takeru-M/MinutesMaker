"use client";

import { ContentSearchForm } from "@/features/content-list/components";
import { useI18n } from "@/features/i18n";

type MinutesSearchFormProps = {
  initialFilters: {
    date: string;
    source: string;
    title: string;
  };
};

export function MinutesSearchForm({ initialFilters }: MinutesSearchFormProps) {
  const { t } = useI18n();

  return (
    <ContentSearchForm
      fields={[
        { name: "date", label: t("minutesListView.filters.date"), type: "date" },
        {
          name: "source",
          label: t("minutesListView.filters.source"),
          type: "text",
          placeholder: t("minutesListView.placeholders.source"),
        },
        {
          name: "title",
          label: t("minutesListView.filters.title"),
          type: "text",
          placeholder: t("minutesListView.placeholders.title"),
        },
      ]}
      initialValues={initialFilters}
      submitLabel={t("minutesListView.searchButton")}
      resetLabel={t("minutesListView.resetButton")}
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
        return query ? `/minutes?${query}` : "/minutes";
      }}
      resetHref="/minutes"
    />
  );
}