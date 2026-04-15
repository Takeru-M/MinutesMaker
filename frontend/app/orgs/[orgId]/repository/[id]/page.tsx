import { RepositoryDetailView } from "@/features/repository";

type OrgRepositoryDetailPageProps = {
  params: Promise<{
    orgId: string;
    id: string;
  }>;
};

export default async function OrgRepositoryDetailPage({ params }: OrgRepositoryDetailPageProps) {
  const { id } = await params;

  return <RepositoryDetailView contentId={id} />;
}
