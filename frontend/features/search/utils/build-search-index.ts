import { SearchItem } from "@/features/search/types/search-item";

export const buildSearchIndex = (items: SearchItem[], query: string): SearchItem[] => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    return [item.date, item.source, item.title, item.summary, item.location].some((value) =>
      value?.toLowerCase().includes(normalizedQuery),
    );
  });
};
