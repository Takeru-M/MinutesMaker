import { ContentListItem } from "@/features/content-list/types/content-list-item";

type ContentListFilters = {
  date: string;
  source: string;
  title: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

export const filterContentListItems = (items: ContentListItem[], filters: ContentListFilters) => {
  const normalizedSource = normalize(filters.source);
  const normalizedTitle = normalize(filters.title);

  return items.filter((item) => {
    const matchesDate = !filters.date || item.date === filters.date;
    const matchesSource = !normalizedSource || item.source.toLowerCase().includes(normalizedSource);
    const matchesTitle = !normalizedTitle || item.title.toLowerCase().includes(normalizedTitle);

    return matchesDate && matchesSource && matchesTitle;
  });
};
