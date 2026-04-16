"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ContentListItemCard, ContentListView } from "@/features/content-list/components";
import { CONTENT_LIST_ITEMS_PER_PAGE, getContentListPage } from "@/features/content-list/utils/get-content-list-page";
import { useI18n } from "@/features/i18n";
import type { AgendaListItemResponse, MinutesListResponse } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";

import { MinutesSearchForm } from "./minutes-search-form";
import styles from "./minutes-list-view.module.css";

interface MinutesListItem {
  id: string;
  date: string;
  source: string;
  title: string;
  agendaId: string;
}

export function MinutesListView() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MinutesListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const filters = {
    date: searchParams.get("date") ?? "",
    source: searchParams.get("source") ?? "",
    title: searchParams.get("title") ?? "",
  };

  useEffect(() => {
    const fetchMinutes = async () => {
      try {
        const agendaResponse = await apiFetch("/api/v1/agendas?sort_order=newest");
        if (!agendaResponse.ok) {
          return;
        }

        const agendas = (await agendaResponse.json()) as AgendaListItemResponse[];
        const minuteResponses = await Promise.allSettled(
          agendas.map((agenda) => apiFetch(`/api/v1/minutes/agenda/${agenda.id}?limit=200`)),
        );

        const listItems: MinutesListItem[] = [];

        for (let index = 0; index < minuteResponses.length; index += 1) {
          const result = minuteResponses[index];
          const agenda = agendas[index];
          if (!agenda || result.status !== "fulfilled" || !result.value.ok) {
            continue;
          }

          const minutesPayload = (await result.value.json()) as MinutesListResponse;
          for (const minute of minutesPayload.items) {
            listItems.push({
              id: String(minute.id),
              date: minute.published_at ?? minute.created_at,
              source: agenda.meeting_title,
              title: minute.title,
              agendaId: String(agenda.id),
            });
          }
        }

        listItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setItems(listItems);
      } catch (error) {
        console.error("Failed to fetch minutes list:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMinutes();
  }, []);

  const filteredItems = useMemo(() => {
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

    return items.filter((item) => {
      const matchesDate = !filters.date || toDateString(item.date) === filters.date;
      const matchesSource = !normalizedSource || item.source.toLowerCase().includes(normalizedSource);
      const matchesTitle = !normalizedTitle || item.title.toLowerCase().includes(normalizedTitle);
      return matchesDate && matchesSource && matchesTitle;
    });
  }, [items, filters.date, filters.source, filters.title]);

  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const { currentPage, totalItems, totalPages, pageItems } = getContentListPage(
    filteredItems,
    requestedPage,
    CONTENT_LIST_ITEMS_PER_PAGE,
    false,
  );

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const hasFilters = Boolean(filters.date || filters.source || filters.title);

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
      homeLabel={t("minutesListView.home")}
      homeHref="/"
      currentLabel={t("minutesListView.title")}
      badge={t("minutesListView.badge")}
      title={t("minutesListView.title")}
      description={t("minutesListView.description")}
      searchTitle={t("minutesListView.searchTitle")}
      sectionTitle={hasFilters ? t("minutesListView.searchResultTitle") : t("minutesListView.listTitle")}
      totalItems={totalItems}
      countLabel={t("minutesListView.countLabel")}
      searchForm={<MinutesSearchForm initialFilters={filters} />}
      emptyState={t("minutesListView.noResults")}
      pageItems={pageItems.map((item) => ({
        id: item.id,
        rendered: (
          <Link href={`/agenda/${item.agendaId}`} className={styles.itemLink}>
            <ContentListItemCard meta={`${formatDate(item.date)} ・ ${item.source}`} title={item.title} />
          </Link>
        ),
      }))}
      currentPage={currentPage}
      pageNumbers={pageNumbers}
      paginationAriaLabel={t("minutesListView.paginationAriaLabel")}
      buildPageHref={(page) => {
        const params = new URLSearchParams();

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
        return query ? `/minutes?${query}` : "/minutes";
      }}
    />
  );
}