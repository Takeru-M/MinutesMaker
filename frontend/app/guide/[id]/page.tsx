import { GuideDetailView } from "@/features/guide";

type GuideDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GuideDetailPage({ params }: GuideDetailPageProps) {
  const { id } = await params;

  return <GuideDetailView contentId={id} />;
}
