export type MeetingScheduleItem = {
  id: number;
  title: string;
  scheduledAt: string;
  department: string;
  location: string;
  meetingType?: string;
  meetingScale?: string;
  summary?: string;
};