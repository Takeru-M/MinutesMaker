import { ContentListItem } from "@/features/content-list/types/content-list-item";

export const CONTENT_LIST_ITEMS_PER_PAGE = 20;

const sortByNewest = (items: ContentListItem[]) => {
  return [...items].sort((left, right) => {
    return new Date(right.date).getTime() - new Date(left.date).getTime();
  });
};

export const getContentListPage = (
  items: ContentListItem[],
  requestedPage: number,
  itemsPerPage: number = CONTENT_LIST_ITEMS_PER_PAGE,
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
