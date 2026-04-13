"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { ContentListItemCard, ContentListView, ContentSearchForm } from "@/features/content-list/components";
import { CONTENT_LIST_ITEMS_PER_PAGE, getContentListPage } from "@/features/content-list/utils/get-content-list-page";
import { useI18n } from "@/features/i18n";
import type { ContentItemResponse } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";

export function RepositoryView() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("q") ?? "";
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const [items, setItems] = useState<ContentItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchError, setHasFetchError] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setIsLoading(true);
        setHasFetchError(false);

        const query = keyword.trim() ? `?q=${encodeURIComponent(keyword.trim())}` : "";
        const response = await apiFetch(`/api/v1/repository${query}`);
        if (!response.ok) {
          setHasFetchError(true);
          return;
        }

        const data = (await response.json()) as ContentItemResponse[];
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch repository items:", error);
        setHasFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [keyword]);

  const filteredItems = useMemo(() => items, [items]);

  const { currentPage, totalItems, totalPages, pageItems } = getContentListPage(
    filteredItems,
    requestedPage,
    CONTENT_LIST_ITEMS_PER_PAGE,
  );

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const searchForm = (
    <ContentSearchForm
      fields={[
        {
          name: "q",
          label: t("repositoryView.filters.keyword"),
          type: "text",
          placeholder: t("repositoryView.placeholders.keyword"),
        },
      ]}
      initialValues={{ q: keyword }}
      submitLabel={t("repositoryView.searchButton")}
      resetLabel={t("repositoryView.resetButton")}
      buildHref={(values) => {
        const params = new URLSearchParams();
        const trimmedKeyword = values.q.trim();

        if (trimmedKeyword) {
          params.set("q", trimmedKeyword);
        }

        const query = params.toString();
        return query ? `/repository?${query}` : "/repository";
      }}
      resetHref="/repository"
    />
  );

  return (
    <ContentListView
      homeLabel={t("repositoryView.home")}
      homeHref="/"
      currentLabel={t("repositoryView.current")}
      badge={t("repositoryView.badge")}
      title={t("repositoryView.title")}
      description={t("repositoryView.description")}
      searchTitle={t("repositoryView.searchTitle")}
      sectionTitle={keyword ? t("repositoryView.searchResultTitle") : t("repositoryView.listTitle")}
      totalItems={totalItems}
      countLabel={t("repositoryView.countLabel")}
      searchForm={searchForm}
      emptyState={isLoading ? t("repositoryView.loading") : hasFetchError ? t("repositoryView.fetchFailed") : t("repositoryView.noResults")}
      pageItems={pageItems.map((item) => ({
        id: item.id,
        rendered: (() => {
          const fallbackId = Number.parseInt((item.id ?? "").split("-").at(-1) ?? "", 10);
          const numericId = Number.isFinite(item.db_id) ? item.db_id : fallbackId;
          const detailHref = Number.isFinite(numericId) ? `/repository/${numericId}` : "/repository";

          return (
            <Link href={detailHref}>
              <ContentListItemCard meta={`${t("repositoryView.authorLabel")}：${item.author}`} title={item.title} />
            </Link>
          );
        })(),
      }))}
      currentPage={currentPage}
      pageNumbers={pageNumbers}
      paginationAriaLabel={t("repositoryView.paginationAriaLabel")}
      buildPageHref={(page) => {
        const params = new URLSearchParams();

        if (keyword.trim()) {
          params.set("q", keyword.trim());
        }

        if (page <= 1) {
          const query = params.toString();
          return query ? `/repository?${query}` : "/repository";
        }

        params.set("page", String(page));
        return `/repository?${params.toString()}`;
      }}
    />
  );
}
