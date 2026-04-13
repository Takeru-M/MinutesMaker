import { RepositoryDetailView } from "@/features/repository";

type RepositoryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RepositoryDetailPage({ params }: RepositoryDetailPageProps) {
  const { id } = await params;

  return <RepositoryDetailView contentId={id} />;
}
