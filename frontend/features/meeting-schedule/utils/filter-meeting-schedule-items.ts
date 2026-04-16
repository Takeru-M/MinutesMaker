import { MeetingScheduleItem } from "@/features/meeting-schedule/types/meeting-schedule-item";

type MeetingScheduleFilters = {
  date: string;
  host: string;
  title: string;
  meetingType: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

const toDateString = (scheduledAt: string) => {
  const date = new Date(scheduledAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const filterMeetingScheduleItems = (items: MeetingScheduleItem[], filters: MeetingScheduleFilters) => {
  const normalizedHost = normalize(filters.host);
  const normalizedTitle = normalize(filters.title);
  const normalizedMeetingType = normalize(filters.meetingType);

  return items.filter((item) => {
    const matchesDate = !filters.date || toDateString(item.scheduledAt) === filters.date;
    const matchesHost = !normalizedHost || item.department.toLowerCase().includes(normalizedHost);
    const matchesTitle = !normalizedTitle || item.title.toLowerCase().includes(normalizedTitle);
    const matchesMeetingType = !normalizedMeetingType || normalize(item.meetingType ?? "") === normalizedMeetingType;

    return matchesDate && matchesHost && matchesTitle && matchesMeetingType;
  });
};