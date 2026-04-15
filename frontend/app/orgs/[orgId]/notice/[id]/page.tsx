import { NoticeDetailView } from "@/features/notice";

type OrgNoticeDetailPageProps = {
  params: Promise<{
    orgId: string;
    id: string;
  }>;
};

export default async function OrgNoticeDetailPage({ params }: OrgNoticeDetailPageProps) {
  const { id } = await params;

  return <NoticeDetailView noticeId={id} />;
}
