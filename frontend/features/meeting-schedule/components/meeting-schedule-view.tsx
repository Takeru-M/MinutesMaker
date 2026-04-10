"use client";

import { useSearchParams } from "next/navigation";

import { ContentListItemCard, ContentListView } from "@/features/content-list/components";
import { CONTENT_LIST_ITEMS_PER_PAGE, getContentListPage } from "@/features/content-list/utils/get-content-list-page";
import { useI18n } from "@/features/i18n";
import { MeetingScheduleSearchForm } from "@/features/meeting-schedule/components/meeting-schedule-search-form";
import { meetingScheduleItems } from "@/features/meeting-schedule/data/meeting-schedule-items";
import { filterMeetingScheduleItems } from "@/features/meeting-schedule/utils/filter-meeting-schedule-items";

type MeetingScheduleListItem = {
  id: string;
  date: string;
  source: string;
  title: string;
  summary: string;
  location: string;
};

export function MeetingScheduleView() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();

  const filters = {
    date: searchParams.get("date") ?? "",
    host: searchParams.get("host") ?? "",
    title: searchParams.get("title") ?? "",
  };

  const filteredItems: MeetingScheduleListItem[] = filterMeetingScheduleItems(meetingScheduleItems, filters).map(
    (item) => ({
      id: item.id,
      date: item.scheduledAt,
      source: item.department,
      title: item.title,
      summary: item.summary,
      location: item.location,
    }),
  );
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const { currentPage, totalItems, totalPages, pageItems } = getContentListPage(
    filteredItems,
    requestedPage,
    CONTENT_LIST_ITEMS_PER_PAGE,
  );

  const hasFilters = Boolean(filters.date || filters.host || filters.title);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  const dateFormatter = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <ContentListView
      homeLabel={t("agendaSubmitView.home")}
      homeHref="/"
      currentLabel={t("meetingScheduleView.title")}
      badge={t("meetingScheduleView.badge")}
      title={t("meetingScheduleView.title")}
      description={t("meetingScheduleView.description")}
      searchTitle={t("meetingScheduleView.searchTitle")}
      sectionTitle={hasFilters ? t("meetingScheduleView.searchResultTitle") : t("meetingScheduleView.listTitle")}
      totalItems={totalItems}
      countLabel={t("meetingScheduleView.countLabel")}
      searchForm={<MeetingScheduleSearchForm initialFilters={filters} />}
      emptyState={t("meetingScheduleView.noResults")}
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
      paginationAriaLabel={t("meetingScheduleView.paginationAriaLabel")}
      buildPageHref={(page) => {
        const params = new URLSearchParams();

        if (filters.date) {
          params.set("date", filters.date);
        }

        if (filters.host) {
          params.set("host", filters.host);
        }

        if (filters.title) {
          params.set("title", filters.title);
        }

        if (page > 1) {
          params.set("page", String(page));
        }

        const query = params.toString();

        return query ? `/meeting-schedule?${query}` : "/meeting-schedule";
      }}
    />
  );
}