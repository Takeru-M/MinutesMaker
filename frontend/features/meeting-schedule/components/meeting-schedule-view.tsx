"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ContentListItemCard, ContentListView } from "@/features/content-list/components";
import { CONTENT_LIST_ITEMS_PER_PAGE, getContentListPage } from "@/features/content-list/utils/get-content-list-page";
import { useI18n } from "@/features/i18n";
import { MeetingScheduleSearchForm } from "@/features/meeting-schedule/components/meeting-schedule-search-form";
import { meetingScheduleItems } from "@/features/meeting-schedule/data/meeting-schedule-items";
import { MeetingScheduleItem } from "@/features/meeting-schedule/types/meeting-schedule-item";
import { filterMeetingScheduleItems } from "@/features/meeting-schedule/utils/filter-meeting-schedule-items";
import type { MeetingListItemResponse } from "@/lib/api-types";
import { apiFetch } from "@/lib/api-client";
import styles from "./meeting-schedule-view.module.css";

type MeetingScheduleListItem = {
  id: number;
  date: string;
  source: string;
  title: string;
  location: string;
  meetingScale?: string;
};

export function MeetingScheduleView() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MeetingScheduleItem[]>(meetingScheduleItems);

  const getMeetingTypeLabel = (meetingType: string) => {
    if (meetingType === "large") {
      return t("agendaForm.meetingTypes.large");
    }
    if (meetingType === "block") {
      return t("agendaForm.meetingTypes.block");
    }
    if (meetingType === "annual") {
      return t("agendaForm.meetingTypes.annual");
    }
    return meetingType;
  };

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await apiFetch("/api/v1/meetings?limit=500");
        if (!response.ok) {
          return;
        }

        const meetings = (await response.json()) as MeetingListItemResponse[];
        if (meetings.length === 0) {
          return;
        }

        const toMeetingTypeLabel = (meetingType: string) => {
          if (meetingType === "large") {
            return t("agendaForm.meetingTypes.large");
          }
          if (meetingType === "block") {
            return t("agendaForm.meetingTypes.block");
          }
          if (meetingType === "annual") {
            return t("agendaForm.meetingTypes.annual");
          }
          return meetingType;
        };

        setItems(
          meetings.map((meeting) => ({
            id: meeting.id,
            title: meeting.title,
            scheduledAt: meeting.scheduled_at,
            department: toMeetingTypeLabel(meeting.meeting_type),
            location: meeting.location ?? "-",
            meetingType: meeting.meeting_type,
            meetingScale: meeting.meeting_scale,
          })),
        );
      } catch (error) {
        console.error("Failed to fetch meetings:", error);
      }
    };

    fetchMeetings();
  }, [t]);

  const filters = {
    date: searchParams.get("date") ?? "",
    host: searchParams.get("host") ?? "",
    title: searchParams.get("title") ?? "",
    meetingType: searchParams.get("meetingType") ?? "",
  };

  const defaultMeetingTypeOptions = [
    { value: "large", label: t("agendaForm.meetingTypes.large") },
    { value: "block", label: t("agendaForm.meetingTypes.block") },
    { value: "annual", label: t("agendaForm.meetingTypes.annual") },
  ];

  const knownTypeValues = new Set(defaultMeetingTypeOptions.map((option) => option.value));
  const additionalMeetingTypeOptions = Array.from(
    new Set(items.map((item) => item.meetingType).filter((meetingType): meetingType is string => Boolean(meetingType))),
  )
    .filter((meetingType) => !knownTypeValues.has(meetingType))
    .map((meetingType) => ({
      value: meetingType,
      label: getMeetingTypeLabel(meetingType),
    }));

  const meetingTypeOptions = [...defaultMeetingTypeOptions, ...additionalMeetingTypeOptions];

  const filteredItems: MeetingScheduleListItem[] = filterMeetingScheduleItems(items, filters).map(
    (item) => ({
      id: item.id,
      date: item.scheduledAt,
      source: item.department,
      title: item.title,
      location: item.location,
      meetingScale: item.meetingScale,
    }),
  );
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const { currentPage, totalItems, totalPages, pageItems } = getContentListPage(
    filteredItems,
    requestedPage,
    CONTENT_LIST_ITEMS_PER_PAGE,
  );

  const hasFilters = Boolean(filters.date || filters.host || filters.title || filters.meetingType);

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
      searchForm={<MeetingScheduleSearchForm initialFilters={filters} meetingTypeOptions={meetingTypeOptions} />}
      emptyState={t("meetingScheduleView.noResults")}
      pageItems={pageItems.map((item) => ({
        id: String(item.id),
        rendered: (
          <Link
            href={item.meetingScale === "large" ? `/meeting-schedule/${item.id}` : `/meeting-schedule/${item.id}/small`}
            className={styles.itemLink}
          >
            <ContentListItemCard
              meta={`${dateFormatter.format(new Date(item.date))} ・ ${item.source}`}
              title={item.title}
              trailing={item.location}
            />
          </Link>
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

        if (filters.meetingType) {
          params.set("meetingType", filters.meetingType);
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