import { MeetingScheduleItem } from "@/features/meeting-schedule/types/meeting-schedule-item";

export const MEETING_SCHEDULE_ITEMS_PER_PAGE = 20;

const sortByNewest = (items: MeetingScheduleItem[]) => {
  return [...items].sort((left, right) => {
    return new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime();
  });
};

export const getMeetingSchedulePage = (
  items: MeetingScheduleItem[],
  requestedPage: number,
  itemsPerPage: number = MEETING_SCHEDULE_ITEMS_PER_PAGE,
) => {
  const sortedItems = sortByNewest(items);
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const startIndex = (currentPage - 1) * itemsPerPage;

  return {
    sortedItems,
    currentPage,
    totalPages,
    totalItems: sortedItems.length,
    pageItems: sortedItems.slice(startIndex, startIndex + itemsPerPage),
  };
};