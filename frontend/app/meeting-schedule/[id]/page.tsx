import { MeetingDetailView } from "@/features/meeting-schedule";

type MeetingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const { id } = await params;

  return <MeetingDetailView meetingId={id} />;
}
