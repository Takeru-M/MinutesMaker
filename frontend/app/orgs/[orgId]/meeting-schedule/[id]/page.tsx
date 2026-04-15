import { MeetingDetailView } from "@/features/meeting-schedule";

type OrgMeetingDetailPageProps = {
  params: Promise<{
    orgId: string;
    id: string;
  }>;
};

export default async function OrgMeetingDetailPage({ params }: OrgMeetingDetailPageProps) {
  const { id } = await params;

  return <MeetingDetailView meetingId={id} />;
}
