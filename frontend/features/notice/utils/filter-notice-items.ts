import { ContentListItem } from "@/features/content-list/types/content-list-item";
import { NoticeItem } from "@/features/notice/types/notice-item";

const normalize = (value: string) => value.trim().toLowerCase();

export const filterNoticeItems = (items: NoticeItem[], filters: { date: string; source: string; title: string }) => {
  const normalizedSource = normalize(filters.source);
  const normalizedTitle = normalize(filters.title);

  const mappedItems: ContentListItem[] = items.map((item) => ({
    id: item.id,
    date: item.publishedAt.includes("T") ? item.publishedAt.slice(0, 10) : item.publishedAt,
    source: item.source,
    title: item.title,
  }));

  return mappedItems.filter((item) => {
    const matchesDate = !filters.date || item.date === filters.date;
    const matchesSource = !normalizedSource || item.source.toLowerCase().includes(normalizedSource);
    const matchesTitle = !normalizedTitle || item.title.toLowerCase().includes(normalizedTitle);

    return matchesDate && matchesSource && matchesTitle;
  });
};
