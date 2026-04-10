"use client";

import { useSearchParams } from "next/navigation";

import { ContentListItemCard, ContentListView } from "@/features/content-list/components";
import { CONTENT_LIST_ITEMS_PER_PAGE, getContentListPage } from "@/features/content-list/utils/get-content-list-page";
import { useI18n } from "@/features/i18n";
import { noticeItems } from "@/features/notice/data/notice-items";
import { filterNoticeItems } from "@/features/notice/utils/filter-notice-items";

import { NoticeSearchForm } from "./notice-search-form";

export function NoticeView() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();

  const filters = {
    date: searchParams.get("date") ?? "",
    source: searchParams.get("source") ?? "",
    title: searchParams.get("title") ?? "",
  };

  const filteredItems = filterNoticeItems(noticeItems, filters);
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const { currentPage, totalItems, totalPages, pageItems } = getContentListPage(
    filteredItems,
    requestedPage,
    CONTENT_LIST_ITEMS_PER_PAGE,
  );

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const dateFormatter = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hasFilters = Boolean(filters.date || filters.source || filters.title);

  return (
    <ContentListView
      homeLabel={t("noticeView.home")}
      homeHref="/"
      currentLabel={t("noticeView.current")}
      badge={t("noticeView.badge")}
      title={t("noticeView.title")}
      description={t("noticeView.description")}
      searchTitle={t("noticeView.searchTitle")}
      sectionTitle={hasFilters ? t("noticeView.searchResultTitle") : t("noticeView.listTitle")}
      totalItems={totalItems}
      countLabel={t("noticeView.countLabel")}
      searchForm={<NoticeSearchForm initialFilters={filters} />}
      emptyState={t("noticeView.noResults")}
      pageItems={pageItems.map((item) => ({
        id: item.id,
        rendered: (
          <ContentListItemCard
            meta={`${dateFormatter.format(new Date(item.date))} ・ ${item.source}`}
            title={item.title}
            summary={item.summary}
          />
        ),
      }))}
      currentPage={currentPage}
      pageNumbers={pageNumbers}
      paginationAriaLabel={t("noticeView.paginationAriaLabel")}
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

        return query ? `/notice?${query}` : "/notice";
      }}
    />
  );
}
