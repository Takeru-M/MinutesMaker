import { AgendaDetailView } from "@/features/agenda";

type AgendaDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AgendaDetailPage({ params }: AgendaDetailPageProps) {
  const { id } = await params;

  return <AgendaDetailView agendaId={id} />;
}
