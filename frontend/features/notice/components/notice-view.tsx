"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ContentListItemCard, ContentListView } from "@/features/content-list/components";
import { CONTENT_LIST_ITEMS_PER_PAGE, getContentListPage } from "@/features/content-list/utils/get-content-list-page";
import { useI18n } from "@/features/i18n";
import type { NoticeListItemResponse } from "@/lib/api-types";
import { filterNoticeItems } from "@/features/notice/utils/filter-notice-items";
import { apiFetch } from "@/lib/api-client";

import { NoticeSearchForm } from "./notice-search-form";
import styles from "./notice-view.module.css";

export function NoticeView() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<NoticeListItemResponse[]>([]);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await apiFetch("/api/v1/notices?limit=500");
        if (!response.ok) {
          return;
        }

        const notices = (await response.json()) as NoticeListItemResponse[];
        setItems(
          notices.map((notice) => {
            const source =
              notice.category === "important"
                ? t("noticeDetailView.categories.important")
                : notice.category === "warning"
                  ? t("noticeDetailView.categories.warning")
                  : t("noticeDetailView.categories.info");

            return {
              id: String(notice.id),
              publishedAt: notice.published_at ?? notice.created_at,
              source,
              title: notice.title,
              summary: notice.content,
            };
          }),
        );
      } catch (error) {
        console.error("Failed to fetch notices:", error);
      }
    };

    fetchNotices();
  }, [t]);

  const filters = {
    date: searchParams.get("date") ?? "",
    source: searchParams.get("source") ?? "",
    title: searchParams.get("title") ?? "",
  };

  const filteredItems = filterNoticeItems(items, filters);
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
          <Link href={`/notice/${item.id}`} className={styles.itemLink}>
            <ContentListItemCard
              meta={`${dateFormatter.format(new Date(item.date))} ・ ${item.source}`}
              title={item.title}
            />
          </Link>
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
