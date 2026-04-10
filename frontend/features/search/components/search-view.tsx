"use client";

import { useSearchParams } from "next/navigation";

import { ContentListItemCard, ContentListView } from "@/features/content-list/components";
import { CONTENT_LIST_ITEMS_PER_PAGE, getContentListPage } from "@/features/content-list/utils/get-content-list-page";
import { useI18n } from "@/features/i18n";
import { meetingScheduleItems } from "@/features/meeting-schedule/data/meeting-schedule-items";
import { noticeItems } from "@/features/notice/data/notice-items";
import { buildSearchIndex } from "@/features/search/utils/build-search-index";
import { SearchItem } from "@/features/search/types/search-item";

export function SearchView() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const searchItems: SearchItem[] = [
    ...meetingScheduleItems.map((item) => ({
      id: item.id,
      date: item.scheduledAt,
      source: item.department,
      title: item.title,
      summary: item.summary,
      location: item.location,
    })),
    ...noticeItems.map((item) => ({
      id: item.id,
      date: item.publishedAt,
      source: item.source,
      title: item.title,
      summary: item.summary,
    })),
  ];

  const results = buildSearchIndex(searchItems, query);
  const { currentPage, totalItems, totalPages, pageItems } = getContentListPage(
    results,
    requestedPage,
    CONTENT_LIST_ITEMS_PER_PAGE,
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const dateFormatter = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <ContentListView
      homeLabel={t("searchView.home")}
      homeHref="/"
      currentLabel={t("searchView.current")}
      badge={t("searchView.badge")}
      title={t("searchView.title")}
      description={query ? t("searchView.queryLabel", { query }) : t("searchView.placeholder")}
      sectionTitle={t("searchView.resultsTitle")}
      totalItems={totalItems}
      countLabel={t("searchView.resultsCount")}
      emptyState={t("searchView.noResults")}
      pageItems={pageItems.map((item) => ({
        id: item.id,
        rendered: (
          <ContentListItemCard
            meta={`${dateFormatter.format(new Date(item.date))} ・ ${item.source}`}
            title={item.title}
            summary={item.summary}
            trailing={item.location}
          />
        ),
      }))}
      currentPage={currentPage}
      pageNumbers={pageNumbers}
      paginationAriaLabel={t("searchView.paginationAriaLabel")}
      buildPageHref={(page) => {
        const params = new URLSearchParams();

        if (query) {
          params.set("q", query);
        }

        if (page > 1) {
          params.set("page", String(page));
        }

        const queryString = params.toString();

        return queryString ? `/search?${queryString}` : "/search";
      }}
    />
  );
}
