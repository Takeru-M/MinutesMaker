export const CONTENT_LIST_ITEMS_PER_PAGE = 20;

const sortByNewest = <T extends { date: string }>(items: T[]) => {
  return [...items].sort((left, right) => {
    return new Date(right.date).getTime() - new Date(left.date).getTime();
  });
};

export const getContentListPage = <T extends { date: string }>(
  items: T[],
  requestedPage: number,
  itemsPerPage: number = CONTENT_LIST_ITEMS_PER_PAGE,
  shouldSort: boolean = true,
) => {
  const sortedItems = shouldSort ? sortByNewest(items) : [...items];
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
