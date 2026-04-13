import { NoticeDetailView } from "@/features/notice";

type NoticeDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { id } = await params;

  return <NoticeDetailView noticeId={id} />;
}
