import { GuideDetailView } from "@/features/guide";

type OrgGuideDetailPageProps = {
  params: Promise<{
    orgId: string;
    id: string;
  }>;
};

export default async function OrgGuideDetailPage({ params }: OrgGuideDetailPageProps) {
  const { id } = await params;

  return <GuideDetailView contentId={id} />;
}
