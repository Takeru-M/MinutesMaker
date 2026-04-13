import { SmallMeetingDetailView } from "@/features/meeting-schedule";

type SmallMeetingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SmallMeetingDetailPage({ params }: SmallMeetingDetailPageProps) {
  const { id } = await params;

  return <SmallMeetingDetailView meetingId={id} />;
}
