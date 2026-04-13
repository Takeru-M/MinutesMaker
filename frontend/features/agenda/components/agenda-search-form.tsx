"use client";

import { ContentSearchForm } from "@/features/content-list/components";
import { useI18n } from "@/features/i18n";

type AgendaSearchFormProps = {
  initialFilters: {
    keyword: string;
    date: string;
    source: string;
    title: string;
  };
};

export function AgendaSearchForm({ initialFilters }: AgendaSearchFormProps) {
  const { t } = useI18n();

  return (
    <ContentSearchForm
      fields={[
        {
          name: "keyword",
          label: t("agendaListView.filters.keyword"),
          type: "text",
          placeholder: t("agendaListView.placeholders.keyword"),
        },
        { name: "date", label: t("agendaListView.filters.date"), type: "date" },
        {
          name: "source",
          label: t("agendaListView.filters.source"),
          type: "text",
          placeholder: t("agendaListView.placeholders.source"),
        },
        {
          name: "title",
          label: t("agendaListView.filters.title"),
          type: "text",
          placeholder: t("agendaListView.placeholders.title"),
        },
      ]}
      initialValues={initialFilters}
      submitLabel={t("agendaListView.searchButton")}
      resetLabel={t("agendaListView.resetButton")}
      buildHref={(values) => {
        const params = new URLSearchParams();

        if (values.keyword.trim()) {
          params.set("keyword", values.keyword.trim());
        }

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

        return query ? `/agenda?${query}` : "/agenda";
      }}
      resetHref="/agenda"
    />
  );
}
