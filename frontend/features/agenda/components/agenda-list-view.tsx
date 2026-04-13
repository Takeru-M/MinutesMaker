"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ContentListItemCard, ContentListView } from "@/features/content-list/components";
import { CONTENT_LIST_ITEMS_PER_PAGE, getContentListPage } from "@/features/content-list/utils/get-content-list-page";
import { useI18n } from "@/features/i18n";
import type { AgendaListItemResponse } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";
import styles from "./agenda-list-view.module.css";
import { AgendaSearchForm } from "./agenda-search-form";

interface ContentListAgendaItem {
  id: string;
  date: string;
  source: string;
  title: string;
}

export function AgendaListView() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const [allAgendas, setAllAgendas] = useState<ContentListAgendaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const filters = {
    keyword: searchParams.get("keyword") ?? "",
    date: searchParams.get("date") ?? "",
    source: searchParams.get("source") ?? "",
    title: searchParams.get("title") ?? "",
  };

  useEffect(() => {
    const fetchAgendas = async () => {
      try {
        const response = await apiFetch("/api/v1/agendas?sort_order=newest");
        if (response.ok) {
          const agendas = (await response.json()) as AgendaListItemResponse[];
          const converted: ContentListAgendaItem[] = agendas.map((item) => ({
            id: item.id.toString(),
            date: item.meeting_scheduled_at ?? item.meeting_date,
            source: item.meeting_title,
            title: item.title,
          }));
          setAllAgendas(converted);
        }
      } catch (error) {
        console.error("Failed to fetch agendas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgendas();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = filters.keyword.trim().toLowerCase();
    const normalizedSource = filters.source.trim().toLowerCase();
    const normalizedTitle = filters.title.trim().toLowerCase();

    const toDateString = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return allAgendas.filter((item) => {
      const searchableText = `${item.source} ${item.title}`.toLowerCase();
      const matchesKeyword = !normalizedKeyword || searchableText.includes(normalizedKeyword);
      const matchesDate = !filters.date || toDateString(item.date) === filters.date;
      const matchesSource = !normalizedSource || item.source.toLowerCase().includes(normalizedSource);
      const matchesTitle = !normalizedTitle || item.title.toLowerCase().includes(normalizedTitle);

      return matchesKeyword && matchesDate && matchesSource && matchesTitle;
    });
  }, [allAgendas, filters.keyword, filters.date, filters.source, filters.title]);

  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const { currentPage, totalItems, totalPages, pageItems } = getContentListPage(
    filteredItems,
    requestedPage,
    CONTENT_LIST_ITEMS_PER_PAGE,
    false,
  );

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const dateFormatter = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value || "-";
    }
    return dateFormatter.format(date);
  };

  if (isLoading) {
    return <div>{t("common.loading") || "読み込み中..."}</div>;
  }

  return (
    <ContentListView
      homeLabel={t("agendaListView.home")}
      homeHref="/"
      currentLabel={t("agendaListView.title")}
      badge={t("agendaListView.badge")}
      title={t("agendaListView.title")}
      description={t("agendaListView.description")}
      searchTitle={t("agendaListView.searchTitle")}
      sectionTitle={t("agendaListView.listTitle")}
      totalItems={totalItems}
      countLabel={t("agendaListView.countLabel")}
      searchForm={<AgendaSearchForm initialFilters={filters} />}
      emptyState={t("agendaListView.noResults")}
      pageItems={pageItems.map((item) => ({
        id: item.id,
        rendered: (
          <Link href={`/agenda/${item.id}`} className={styles.itemLink}>
            <ContentListItemCard
              meta={`${formatDate(item.date)} ・ ${item.source}`}
              title={item.title}
            />
          </Link>
        ),
      }))}
      currentPage={currentPage}
      pageNumbers={pageNumbers}
      paginationAriaLabel={t("agendaListView.paginationAriaLabel")}
      buildPageHref={(page) => {
        const params = new URLSearchParams();

        if (filters.keyword) {
          params.set("keyword", filters.keyword);
        }

        if (filters.date) {
          params.set("date", filters.date);
        }

        if (filters.source) {
          params.set("source", filters.source);
        }

        if (filters.title) {
          params.set("title", filters.title);
        }

        if (page > 1) {
          params.set("page", String(page));
        }

        const query = params.toString();
        return query ? `/agenda?${query}` : "/agenda";
      }}
    />
  );
}
